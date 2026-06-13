import mongoose from "mongoose";
import LiveBlockService from "../../services/liveblock.service.js";
import ConversationRepository from "../../repositories/conversation.repository.js";
import { liveblockActionSchema } from "../validators/liveblock.validator.js";
import { getRedisClient } from "../../config/redis.js";
import AppError from "../../utils/appError.js";
import { ERROR_CODES } from "../../utils/errorConstants.js";
import logger from "../../config/logger.js";

export default function liveblockHandler(io, socket) {
  socket.on("liveblock:action", async (payload) => {
    try {
      const userId = socket.userId;
      if (!userId) {
        throw new AppError(ERROR_CODES.UNAUTHORIZED, 401);
      }

      const redis = getRedisClient();

      // 1. Socket Rate Limiting (Redis-backed, max 5 actions/sec per user) - Atomic Lua Script
      const rateKey = `socket:rate:${userId}`;
      const script = `
        local current = redis.call('INCR', KEYS[1])
        if current == 1 then
            redis.call('EXPIRE', KEYS[1], ARGV[1])
        end
        return current
      `;
      const currentVal = await redis.eval(script, {
        keys: [rateKey],
        arguments: ["1"]
      });
      if (currentVal > 5) {
        logger.warn({
          message: `Socket rate limit exceeded for user ${userId}`,
          userId,
        });
        socket.emit("error", {
          errorCode: ERROR_CODES.RATE_LIMIT_EXCEEDED,
          message: "Rate limit exceeded. Please slow down.",
        });
        return;
      }

      // 2. Validate action payload with Zod
      const validated = liveblockActionSchema.parse(payload);
      const { blockId, action, clientVersion } = validated;

      // 3. Retrieve LiveBlock to identify its conversation
      const block = await LiveBlockService.getLiveBlock(blockId);
      if (!block) {
        throw new AppError(ERROR_CODES.LIVEBLOCK_NOT_FOUND, 404);
      }

      // 4. Authoritative Verification of Participant status (Database-backed)
      const conversationIdStr = block.conversationId;
      const conversation = await ConversationRepository.findById(conversationIdStr);
      if (!conversation) {
        throw new AppError(ERROR_CODES.CONVERSATION_NOT_FOUND, 404);
      }

      const isParticipant = conversation.participants.some((p) =>
        p.user._id ? p.user._id.equals(userId) : p.user.equals(userId)
      );
      if (!isParticipant) {
        throw new AppError(ERROR_CODES.NOT_PARTICIPANT, 403);
      }

      // 5. Apply state mutation
      const updatedBlock = await LiveBlockService.applyAction(
        blockId,
        action,
        clientVersion,
        userId
      );

      // 6. Broadcast the update to the conversation room
      io.to(conversationIdStr).emit("liveblock:update", {
        blockId,
        state: updatedBlock.state,
        version: updatedBlock.version,
        isFrozen: updatedBlock.isFrozen,
      });

    } catch (error) {
      logger.error(`Error processing liveblock action: ${error.message}`);
      
      let errorCode = error.errorCode || ERROR_CODES.INTERNAL_SERVER_ERROR;
      let message = error.message;

      // Handle Zod validation errors nicely
      if (error.name === "ZodError" && error.issues) {
        errorCode = ERROR_CODES.VALIDATION_ERROR;
        message = error.issues.map((e) => e.message).join(", ");
      }

      socket.emit("error", {
        errorCode,
        message,
      });
    }
  });
}
