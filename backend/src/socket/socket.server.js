import { Server } from "socket.io";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";

import config from "../config/index.js";
import logger from "../config/logger.js";

import { socketAuthMiddleware }
from "../middlewares/socketAuth.middleware.js";

import { registerSocketHandlers }
from "./sockets.handlers.js";

import SocketCleanupService
from "../services/socketCleanup.service.js";

let io;
let pubClient;
let subClient;

export const initSocket = async (httpServer) => {

//socket.io server initialization

  io = new Server(httpServer, {
    cors: {
      origin: config.clientUrl,
      credentials: true
    }
  });

//pub and sub clients for redis adapter

  pubClient = createClient({
    url: config.redis.url
  });

  subClient =
    pubClient.duplicate();

  await pubClient.connect();

  await subClient.connect();
//socket.io redis adapter setup

  io.adapter(
    createAdapter(
      pubClient,
      subClient
    )
  );

  logger.info(
    "Redis adapter connected for Socket.IO"
  );

  io.use(socketAuthMiddleware);

  io.on(

    "connection",

    async (socket) => {

      const userId =
        socket.userId;

      if (!userId) {

        logger.error(
          `Socket without userId:
           ${socket.id}`
        );

        socket.disconnect(true);

        return;
      }

      logger.info(
        `Socket connected:
         ${socket.id}
         | User ${userId}`
      );

      socket.on(
        "disconnect",
        async (reason) => {
          await SocketCleanupService.cleanup(
            io,
            socket,
            reason
          );
        }
      );

      await registerSocketHandlers(
        io,
        socket
      );
      socket.emit("ready");
    }
  );
};

export const getIO = () => {

  if (!io) {

    throw new Error(
      "Socket.IO not initialized"
    );
  }

  return io;
};

export const closeSocket = async () => {
  if (io) {
    logger.info("Closing Socket.IO server...");

    // Disconnect all local sockets
    io.local.disconnectSockets(true);

    await new Promise((resolve) => {
      io.close(() => {
        logger.info("Socket.IO server closed.");
        resolve();
      });
    });
  }

  if (pubClient) {
    await pubClient.quit();
    logger.info("Socket Redis pubClient disconnected.");
  }

  if (subClient) {
    await subClient.quit();
    logger.info("Socket Redis subClient disconnected.");
  }
};