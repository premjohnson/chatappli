import { Queue, Worker } from "bullmq";
import config from "./index.js";
import logger from "./logger.js";
import LiveBlock from "../models/liveblock.model.js";
import { getRedisClient } from "./redis.js";

// Connection config for BullMQ (uses ioredis internally)
const connectionOpts = {
  connection: {
    url: config.redis.url,
  },
};

// Queue instance
export const liveblockQueue = new Queue("liveblock-sync", {
  connection: {
    url: config.redis.url,
  },
});

// Worker initialization function
export const startLiveBlockWorker = () => {
  const worker = new Worker(
    "liveblock-sync",
    async (job) => {
      const { blockId } = job.data;
      logger.info(`[BullMQ Worker] Starting sync for LiveBlock: ${blockId}`);

      const redis = getRedisClient();
      const cached = await redis.get(`liveblock:${blockId}`);

      if (!cached) {
        logger.warn(`[BullMQ Worker] Redis cache miss for block ${blockId} during sync`);
        return;
      }

      const { conversationId, type, state, version, isFrozen } = JSON.parse(cached);

      // Persist to MongoDB - Version-Aware
      try {
        await LiveBlock.updateOne(
          {
            _id: blockId,
            $or: [
              { version: { $lt: version } },
              { version: { $exists: false } }
            ]
          },
          {
            $set: {
              conversationId,
              type,
              state,
              version,
              isFrozen,
            }
          },
          { upsert: true }
        );
      } catch (err) {
        if (err.code === 11000) {
          logger.info(`[BullMQ Worker] Stale write prevented for block ${blockId} (incoming version ${version})`);
        } else {
          throw err;
        }
      }

      logger.info(
        `[BullMQ Worker] Successfully synced LiveBlock ${blockId} to MongoDB. Version: ${version}, Frozen: ${isFrozen}`
      );
    },
    {
      connection: {
        url: config.redis.url,
      },
      concurrency: 5, // Process up to 5 sync tasks concurrently
    }
  );

  worker.on("failed", (job, err) => {
    logger.error(`[BullMQ Worker] Job ${job?.id} failed with error: ${err.message}`);
  });

  worker.on("error", (err) => {
    logger.error(`[BullMQ Worker] Global worker error: ${err.message}`);
  });

  logger.info("LiveBlock BullMQ Worker initialized");
  return worker;
};
