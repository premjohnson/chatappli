import { v4 as uuidv4 } from "uuid";
import { getRedisClient } from "../config/redis.js";
import LiveBlockRepository from "../repositories/liveblock.repository.js";
import { liveblockQueue } from "../config/queue.js";
import AppError from "../utils/appError.js";
import { ERROR_CODES } from "../utils/errorConstants.js";
import logger from "../config/logger.js";

class LiveBlockService {
  /**
   * Fetch LiveBlock state (Cache-Aside / Recovery Strategy)
   */
  static async getLiveBlock(blockId) {
    const redis = getRedisClient();
    const redisKey = `liveblock:${blockId}`;

    // Try cache first
    try {
      const cached = await redis.get(redisKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      logger.warn(`Redis get failed for ${redisKey}: ${err.message}`);
    }

    // Cache miss: recovery from MongoDB
    const block = await LiveBlockRepository.findById(blockId);
    if (!block) return null;

    const blockData = {
      id: block._id.toString(),
      conversationId: block.conversationId.toString(),
      type: block.type,
      state: block.state,
      version: block.version,
      isFrozen: block.isFrozen,
    };

    // Save back to Redis cache
    try {
      await redis.set(redisKey, JSON.stringify(blockData));
    } catch (err) {
      logger.warn(`Redis set failed for ${redisKey}: ${err.message}`);
    }

    return blockData;
  }

  /**
   * Create a new LiveBlock
   */
  static async createLiveBlock(conversationId, type, initialState = {}) {
    // Determine default state structure based on type
    let state = initialState;
    if (Object.keys(initialState).length === 0) {
      if (type === "checklist") {
        state = { items: [] };
      } else if (type === "poll") {
        state = { options: [] };
      }
    }

    const block = await LiveBlockRepository.create({
      conversationId,
      type,
      state,
      version: 0,
      isFrozen: false,
    });

    const blockData = {
      id: block._id.toString(),
      conversationId: block.conversationId.toString(),
      type: block.type,
      state: block.state,
      version: block.version,
      isFrozen: block.isFrozen,
    };

    // Cache in Redis
    const redis = getRedisClient();
    try {
      await redis.set(`liveblock:${blockData.id}`, JSON.stringify(blockData));
    } catch (err) {
      logger.warn(`Redis set failed on creation for ${blockData.id}: ${err.message}`);
    }

    logger.info({
      message: `Created LiveBlock ${blockData.id}`,
      blockId: blockData.id,
      conversationId,
      type,
    });

    return blockData;
  }

  /**
   * Apply mutation action with Redis WATCH/MULTI (Optimistic Concurrency Control)
   */
  static async applyAction(blockId, action, clientVersion, userId) {
    const redis = getRedisClient();
    const redisKey = `liveblock:${blockId}`;
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        // 1. WATCH the key to check for concurrent edits
        await redis.watch(redisKey);

        // 2. Fetch the current block state (cache-aside)
        const block = await this.getLiveBlock(blockId);
        if (!block) {
          await redis.unwatch();
          throw new AppError(ERROR_CODES.LIVEBLOCK_NOT_FOUND, 404);
        }

        // 3. Freeze Verification
        if (block.isFrozen) {
          await redis.unwatch();
          throw new AppError(ERROR_CODES.LIVEBLOCK_FROZEN, 400);
        }

        // 4. Version Check
        if (clientVersion < block.version) {
          await redis.unwatch();
          throw new AppError(ERROR_CODES.CONCURRENCY_CONFLICT, 409);
        }

        // 5. Reducer logic to compute newState
        const { state: currentState, type } = block;
        let newState = { ...currentState };

        if (action.type === "FREEZE") {
          block.isFrozen = true;
        } else if (type === "checklist") {
          newState.items = newState.items || [];
          if (action.type === "ADD_ITEM") {
            newState.items.push({
              id: uuidv4(),
              text: action.payload.text,
              completed: false,
              completedBy: null,
            });
          } else if (action.type === "TOGGLE_ITEM") {
            const { itemId } = action.payload;
            const item = newState.items.find((i) => i.id === itemId);
            if (item) {
              item.completed = !item.completed;
              item.completedBy = item.completed ? userId.toString() : null;
            }
          } else if (action.type === "REMOVE_ITEM") {
            const { itemId } = action.payload;
            newState.items = newState.items.filter((i) => i.id !== itemId);
          }
        } else if (type === "poll") {
          newState.options = newState.options || [];
          if (action.type === "ADD_OPTION") {
            newState.options.push({
              id: uuidv4(),
              text: action.payload.text,
              votes: [],
            });
          } else if (action.type === "VOTE") {
            const { optionId } = action.payload;
            const option = newState.options.find((o) => o.id === optionId);
            if (option) {
              const voterStr = userId.toString();
              const voteIndex = option.votes.indexOf(voterStr);
              if (voteIndex > -1) {
                option.votes.splice(voteIndex, 1); // remove vote
              } else {
                option.votes.push(voterStr); // add vote
              }
            }
          }
        }

        block.state = newState;
        const preVersion = block.version;
        block.version += 1;

        // 6. Execute MULTI transaction
        const results = await redis
          .multi()
          .set(redisKey, JSON.stringify(block))
          .exec();

        // Transaction failed due to concurrent modification
        if (results === null) {
          retryCount++;
          logger.warn(`Concurrency conflict applying action on LiveBlock ${blockId}. Retry ${retryCount}/${maxRetries}`);
          continue;
        }

        // 7. Winston Audit Logging
        logger.info({
          message: `LiveBlock mutated`,
          audit: true,
          blockId,
          userId,
          actionType: action.type,
          preVersion,
          postVersion: block.version,
          isFrozen: block.isFrozen,
        });

        // 8. Queue write-behind sync via BullMQ (Job ID handles debouncing)
        await liveblockQueue.add(
          "sync-mongodb",
          { blockId },
          {
            jobId: blockId, // Dedupes multiple modifications to the same block
            delay: 2000,   // Delay write to MongoDB by 2 seconds
            removeOnComplete: true,
            removeOnFail: true,
          }
        );

        return block;
      } catch (error) {
        // Ensure WATCH is cleared if any error occurs
        try {
          await redis.unwatch();
        } catch (_) {}
        throw error;
      }
    }

    throw new AppError(ERROR_CODES.CONCURRENCY_CONFLICT, 409);
  }
}

export default LiveBlockService;
