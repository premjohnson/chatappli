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

  /* =====================================================
     HANDLE SOCKET DISCONNECT CLEANUP
  ===================================================== */

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

    // ============================================
    // CLEANUP GHOST TYPING STATES
    // ============================================

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

    // ============================================
    // DECREMENT ACTIVE CONNECTIONS
    // ============================================

    const count =

      await PresenceService
        .decrementConnections(
          userId
        );

    // ============================================
    // DEBOUNCE OFFLINE EVENT
    // ============================================

    if (count === 0) {

      setTimeout(async () => {

        try {

          const latestCount =

            await PresenceService
              .getConnectionCount(
                userId
              );

          // ============================================
          // USER STILL OFFLINE
          // ============================================

          if (latestCount === 0) {
            
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
              `User offline emitted to ${conversations.length} rooms:
               ${userId}`
            );
          }

        } catch (error) {

          logger.error(
            `Offline debounce failed:
             ${error.message}`
          );
        }

      }, 2000);
    }
  }
}

export default SocketCleanupService;