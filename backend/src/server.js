import http from "http";

import app from "./app.js";
import config from "./config/index.js";

import connectDB, { closeDB } from "./config/database.js";
import { connectRedis, disconnectRedis } from "./config/redis.js";
import logger from "./config/logger.js";

import { initSocket } from "./socket/socket.server.js";

const startServer = async () => {
  try {
    await connectDB();
    await connectRedis();

    const server = http.createServer(app);

    // ✅ Initialize socket properly
    await initSocket(server);

    server.listen(config.port, () => {
      logger.info(`🚀 Server running on port ${config.port}`);
    });

  } catch (error) {
    logger.error(`❌ Server failed to start: ${error.message}`);
    process.exit(1);
  }
};

startServer();