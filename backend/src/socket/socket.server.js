import { Server } from "socket.io";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";

import config from "../config/index.js";
import logger from "../config/logger.js";

import { socketAuthMiddleware } from "../middlewares/socketAuth.middleware.js";
import { registerSocketHandlers } from "./sockets.handlers.js";

let io;

export const initSocket = async (httpServer) => {

  io = new Server(httpServer, {
    cors: {
      origin: config.clientUrl,
      credentials: true
    }
  });

  const pubClient = createClient({ url: config.redis.url });
  const subClient = pubClient.duplicate();

  await pubClient.connect();
  await subClient.connect();

  io.adapter(createAdapter(pubClient, subClient));

  logger.info("Redis adapter connected for Socket.IO");

  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {

    const userId = socket.userId;

    if (!userId) {
      logger.error(`Socket without userId: ${socket.id}`);
      socket.disconnect(true);
      return;
    }

    logger.info(`Socket connected: ${socket.id} | User ${userId}`);

    registerSocketHandlers(io, socket);
  });

};

export const getIO = () => {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
};