import {
  TYPING_EVENTS
} from "../events/typing.events.js";

import {
  typingSchema
} from "../validators/typing.validator.js";

import logger
from "../../config/logger.js";

export default function typingHandler(
  io,
  socket
) {

  // ============================================
  // TYPING START
  // ============================================

  socket.on(

    TYPING_EVENTS.TYPING_START,

    (payload, ack) => {

      const safeAck =

        typeof ack === "function"
          ? ack
          : () => {};

      try {

        // ============================================
        // VALIDATE PAYLOAD
        // ============================================

        const parsed =

          typingSchema.safeParse(
            payload
          );

        if (!parsed.success) {

          safeAck({

            success: false,

            error: "Invalid payload"
          });

          return;
        }

        const {
          conversationId
        } = parsed.data;

        // ============================================
        // VALIDATE ROOM MEMBERSHIP (PREVENT SPOOFING)
        // ============================================

        const rooms = socket.rooms;
        if (!rooms.has(conversationId)) {
          safeAck({
            success: false,
            error: "Unauthorized: Not a participant of this conversation"
          });
          return;
        }

        // ============================================
        // TRACK TYPING STATE
        // ============================================

        socket.typingConversations.add(
          conversationId
        );

        // ============================================
        // BROADCAST EVENT
        // ============================================

        socket.to(conversationId).emit(

          TYPING_EVENTS.TYPING_START,

          {
            userId: socket.userId
          }
        );

        // ============================================
        // ACK SUCCESS
        // ============================================

        safeAck({
          success: true
        });

      } catch (error) {

        logger.error(
          `Typing start failed:
           ${error.message}`
        );

        safeAck({

          success: false,

          error: "Internal server error"
        });
      }
    }
  );

  // ============================================
  // TYPING STOP
  // ============================================

  socket.on(

    TYPING_EVENTS.TYPING_STOP,

    (payload, ack) => {

      const safeAck =

        typeof ack === "function"
          ? ack
          : () => {};

      try {

        const parsed =

          typingSchema.safeParse(
            payload
          );

        if (!parsed.success) {

          safeAck({

            success: false,

            error: "Invalid payload"
          });

          return;
        }

        const {
          conversationId
        } = parsed.data;

        // ============================================
        // VALIDATE ROOM MEMBERSHIP
        // ============================================

        const rooms = socket.rooms;
        if (!rooms.has(conversationId)) {
          safeAck({
            success: false,
            error: "Unauthorized"
          });
          return;
        }

        // ============================================
        // REMOVE TYPING TRACKING
        // ============================================

        socket.typingConversations.delete(
          conversationId
        );

        // ============================================
        // BROADCAST EVENT
        // ============================================

        socket.to(conversationId).emit(

          TYPING_EVENTS.TYPING_STOP,

          {
            userId: socket.userId
          }
        );

        // ============================================
        // ACK SUCCESS
        // ============================================

        safeAck({
          success: true
        });

      } catch (error) {

        logger.error(
          `Typing stop failed:
           ${error.message}`
        );

        safeAck({

          success: false,

          error: "Internal server error"
        });
      }
    }
  );
}