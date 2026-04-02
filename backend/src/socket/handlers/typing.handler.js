import { TYPING_EVENTS } from "../events/typing.events.js";

export default function typingHandler(io, socket) {

  socket.on(TYPING_EVENTS.TYPING_START, ({ conversationId }) => {

    socket.to(conversationId).emit(
      TYPING_EVENTS.TYPING_START,
      {
        userId: socket.userId
      }
    );

  });

  socket.on(TYPING_EVENTS.TYPING_STOP, ({ conversationId }) => {

    socket.to(conversationId).emit(
      TYPING_EVENTS.TYPING_STOP,
      {
        userId: socket.userId
      }
    );

  });

}