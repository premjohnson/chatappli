import mongoose from "mongoose";
import messageHandler from "./handlers/message.handler.js";
import presenceHandler from "./handlers/presence.handler.js";
import typingHandler from "./handlers/typing.handler.js";

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
    }, { _id: 1 }).lean();

    await Promise.all(
      conversations.map(conv => socket.join(conv._id.toString()))
    );
  } catch (error) {
    logger.error(`Error joining conversation rooms for ${userId}:`, error);
  }

  socket.typingConversations = new Set();

  /* register feature handlers */

  messageHandler(io, socket);
  await presenceHandler(io, socket);
  typingHandler(io, socket);

};