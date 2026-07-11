import MessageService from "../../services/message.service.js";
import { MESSAGE_EVENTS } from "../events/message.events.js";

export default function messageHandler(io, socket) {

  /* ================= SEND MESSAGE ================= */

  socket.on(MESSAGE_EVENTS.SEND_MESSAGE, async (payload) => {
    try {

      const senderId = socket.userId;

      const {
        message,
        conversationType,
        receiverId,
        recipientIds = []
      } = await MessageService.sendMessage(senderId, payload);

      /* ================= PRIVATE CHAT ================= */

      if (conversationType === "private") {

        // Deliver to receiver's devices
        io.to(`user:${receiverId}`).emit(
          MESSAGE_EVENTS.NEW_MESSAGE,
          message
        );

        // Sync sender's other devices (current socket included is OK)
        io.to(`user:${senderId}`).emit(
          MESSAGE_EVENTS.NEW_MESSAGE,
          message
        );

        const receiverSockets =
          await io.in(`user:${receiverId}`).allSockets();

        if (receiverSockets.size > 0) {
          const deliveredMessage =
            await MessageService.markAsDelivered(
              message._id,
              receiverId
            );

          io.to(message.conversation.toString()).emit(
            MESSAGE_EVENTS.MESSAGE_DELIVERED,
            {
              message: deliveredMessage
            }
          );
        }

      }

      /* ================= GROUP CHAT ================= */

      else {

        // Deliver to every participant currently in the room
        io.to(message.conversation.toString()).emit(
          MESSAGE_EVENTS.NEW_MESSAGE,
          message
        );

        recipientIds.forEach(pid => {
          io.to(`user:${pid}`).emit(
            MESSAGE_EVENTS.NEW_MESSAGE,
            message
          );
        });

        io.to(`user:${senderId}`).emit(
          MESSAGE_EVENTS.NEW_MESSAGE,
          message
        );

        const onlineRecipientIds = [];

        await Promise.all(
          recipientIds.map(async (recipientId) => {
            const sockets =
              await io.in(`user:${recipientId}`).allSockets();

            if (sockets.size > 0) {
              onlineRecipientIds.push(recipientId);
            }
          })
        );

        const deliveredMessages =
          await Promise.all(
            onlineRecipientIds.map(recipientId =>
              MessageService.markAsDelivered(
                message._id,
                recipientId
              )
            )
          );

        deliveredMessages.forEach((deliveredMessage) => {
          io.to(message.conversation.toString()).emit(
            MESSAGE_EVENTS.MESSAGE_DELIVERED,
            {
              message: deliveredMessage
            }
          );
        });

      }

      } catch (error) {

        socket.emit("error", {
          message:
            error instanceof Error
              ? error.message
              : "Internal server error"
        });

      }
  });

  /* ================= MESSAGE READ ================= */

  socket.on(
    MESSAGE_EVENTS.MESSAGE_READ,
    async ({ conversationId }) => {

      try {

        const readerId = socket.userId;

        const { updatedMessages, participantIds } =
          await MessageService.markAsRead(
            conversationId,
            readerId
          );

        updatedMessages.forEach((message) => {

          io.to(conversationId).emit(
            MESSAGE_EVENTS.MESSAGE_READ,
            {
              message
            }
          );

          participantIds.forEach((pid) => {
            io.to(`user:${pid}`).emit(
              MESSAGE_EVENTS.MESSAGE_READ,
              {
                message
              }
            );
          });

        });

        } catch (error) {

          socket.emit("error", {
            message:
              error instanceof Error
                ? error.message
                : "Internal server error"
          });

        }

    }
  );

}
