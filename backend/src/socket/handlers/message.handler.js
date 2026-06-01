import MessageService from "../../services/message.service.js";
import { MESSAGE_EVENTS } from "../events/message.events.js";

export default function messageHandler(io, socket) {
// Handle sending messages

  socket.on(MESSAGE_EVENTS.SEND_MESSAGE, async (payload) => {

    try {

      const senderId = socket.userId;

      const message =
        await MessageService.sendMessage(senderId, payload);

      const receiverId = message.receiver;

      /* deliver message to receiver devices */

      io.to(`user:${receiverId}`).emit(
        MESSAGE_EVENTS.NEW_MESSAGE,
        message
      );

      /* sync sender devices */

      io.to(`user:${senderId}`).emit(
        MESSAGE_EVENTS.NEW_MESSAGE,
        message
      );

      /* mark delivered immediately */

      io.to(`user:${senderId}`).emit(
        MESSAGE_EVENTS.MESSAGE_DELIVERED,
        {
          messageId: message._id,
          conversationId: message.conversation
        }
      );

    } catch (error) {

      socket.emit("error", {
        message: error.message
      });

    }

  });


// Handle marking messages as read

  socket.on(MESSAGE_EVENTS.MESSAGE_READ, async ({ conversationId }) => {

    try {

      const readerId = socket.userId;

      const updatedMessages =
        await MessageService.markAsRead(
          conversationId,
          readerId
        );

      updatedMessages.forEach(msg => {

        io.to(`user:${msg.sender}`).emit(
          MESSAGE_EVENTS.MESSAGE_READ,
          {
            messageId: msg._id,
            conversationId,
            readerId
          }
        );

      });

    } catch (error) {

      socket.emit("error", {
        message: error.message
      });

    }

  });

}