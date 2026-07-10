import mongoose from "mongoose";
import logger
from "../config/logger.js";

import PresenceService
from "../services/presence.service.js";

import {
  TYPING_EVENTS
} from "../socket/events/typing.events.js";

import {
  PRESENCE_EVENTS
} from "../socket/events/presence.events.js";

class SocketCleanupService {

// Cleanup method to handle socket disconnections and related state cleanup
  static async cleanup(
    io,
    socket,
    reason
  ) {

    const userId =
      socket.userId;

    logger.info(
      `Socket disconnected:
       ${socket.id}
       | User ${userId}
       | Reason: ${reason}`
    );

    if (
      socket.typingConversations
    ) {

      for (
        const conversationId
        of socket.typingConversations
      ) {

        socket.to(conversationId).emit(

          TYPING_EVENTS.TYPING_STOP,

          {
            userId
          }
        );
      }

      socket.typingConversations.clear();
    }

    // Fetch remaining active connections in the cluster
    try {
      const activeSockets = await io.in(`user:${userId}`).fetchSockets();

      if (activeSockets.length === 0) {
        setTimeout(async () => {
          try {
            const latestSockets = await io.in(`user:${userId}`).fetchSockets();

            if (latestSockets.length === 0) {
              await PresenceService.setOffline(userId);

              /* Scoped offline broadcast */
              const conversations = await mongoose.model("Conversation").find({
                "participants.user": userId
              }, { _id: 1 }).lean();

              conversations.forEach(conv => {
                io.to(conv._id.toString()).emit(
                  PRESENCE_EVENTS.USER_OFFLINE,
                  { userId }
                );
              });

              logger.info(
                `User offline emitted to ${conversations.length} rooms: ${userId}`
              );
            }
          } catch (error) {
            logger.error(`Offline debounce failed: ${error.message}`);
          }
        }, 2000);
      }
    } catch (error) {
      logger.error(`Socket cleanup presence check failed: ${error.message}`);
    }
  }
}

export default SocketCleanupService;