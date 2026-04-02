import messageHandler from "./handlers/message.handler.js";
import presenceHandler from "./handlers/presence.handler.js";
import typingHandler from "./handlers/typing.handler.js";

import logger from "../config/logger.js";

export const registerSocketHandlers = (io, socket) => {

  const userId = socket.userId;

  if (!userId) {
    logger.error(`Socket ${socket.id} missing userId`);
    socket.disconnect(true);
    return;
  }

  logger.info(`Registering handlers for user ${userId}`);

  /* join personal room for multi-device sync */

  socket.join(`user:${userId}`);

  /* register feature handlers */

  messageHandler(io, socket);
  presenceHandler(io, socket);
  typingHandler(io, socket);

  socket.on("disconnect", (reason) => {

    logger.warn(
      `Socket disconnected: ${socket.id} | User: ${userId} | Reason: ${reason}`
    );

  });
};