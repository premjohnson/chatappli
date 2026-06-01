import http from "http";

import app from "./app.js";
import config from "./config/index.js";

import connectDB, { closeDB } from "./config/database.js";
import { connectRedis, disconnectRedis } from "./config/redis.js";
import logger from "./config/logger.js";

import { initSocket, closeSocket } from "./socket/socket.server.js";

let server;

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  // 1. Close HTTP server (stops accepting new requests)
  if (server) {
    await new Promise((resolve) => {
      server.close(() => {
        logger.info("HTTP server closed.");
        resolve();
      });
    });
  }

  // 2. Close Socket.IO connections and its Redis clients
  await closeSocket();

  // 3. Disconnect Redis
  await disconnectRedis();

  // 4. Close DB connection
  await closeDB();

  logger.info("Graceful shutdown completed.");
  process.exit(0);
};

const startServer = async () => {
  try {
    await connectDB();
    await connectRedis();

    server = http.createServer(app);

    // ✅ Initialize socket properly
    await initSocket(server);

    server.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
    });

    // Listen for shutdown signals
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  } catch (error) {
    logger.error(`Server failed to start: ${error.message}`);
    process.exit(1);
  }
};

startServer();