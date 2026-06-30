import mongoose from "mongoose";
import messageHandler from "./handlers/message.handler.js";
import presenceHandler from "./handlers/presence.handler.js";
import typingHandler from "./handlers/typing.handler.js";
import liveblockHandler from "./handlers/liveblock.handler.js";

import logger from "../config/logger.js";

export const  registerSocketHandlers = async  (io, socket) => {

  const userId = socket.userId;

  if (!userId) {
    logger.error(`Socket ${socket.id} missing userId`);
    socket.disconnect(true);
    return;
  }

  logger.info(`Registering handlers for user ${userId}`);

  socket.join(`user:${userId}`);

  try {
    const conversations = await mongoose.model("Conversation").find({
      "participants.user": userId
    }, { _id: 1, "participants.user": 1 }).lean();

    await Promise.all(
      conversations.map(conv => socket.join(conv._id.toString()))
    );

    // Get all unique participant IDs
    const participantIds = new Set();
    conversations.forEach(conv => {
      conv.participants.forEach(p => {
        if (p.user && p.user.toString() !== userId.toString()) {
          participantIds.add(p.user.toString());
        }
      });
    });

    // Check online status for each participant
    const presenceMap = {};
    const { default: PresenceService } = await import("../services/presence.service.js");
    await Promise.all(
      Array.from(participantIds).map(async (pid) => {
        const isOnline = await PresenceService.isOnline(pid);
        presenceMap[pid] = isOnline;
      })
    );

    // Emit presence sync map to the connected client
    socket.emit("presence:sync", presenceMap);
  } catch (error) {
    logger.error(`Error joining rooms / syncing presence for ${userId}:`, error);
  }

  socket.typingConversations = new Set();

  /* register feature handlers */

  messageHandler(io, socket);
  await presenceHandler(io, socket);
  typingHandler(io, socket);
  liveblockHandler(io, socket);

  /* dynamic room management */

  socket.on("join:room", async ({ conversationId }) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        return;
      }
      const conversation = await mongoose.model("Conversation").findOne({
        _id: conversationId,
        "participants.user": userId
      }, { _id: 1 }).lean();

      if (conversation) {
        socket.join(conversationId);
        logger.info(`Socket ${socket.id} dynamically joined conversation room: ${conversationId}`);
      }
    } catch (err) {
      logger.error(`Error joining room ${conversationId}:`, err);
    }
  });

  socket.on("leave:room", async ({ conversationId }) => {
    try {
      socket.leave(conversationId);
      logger.info(`Socket ${socket.id} dynamically left conversation room: ${conversationId}`);
    } catch (err) {
      logger.error(`Error leaving room ${conversationId}:`, err);
    }
  });

};