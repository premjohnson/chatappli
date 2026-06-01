import jwt from "jsonwebtoken";
import config from "../config/index.js";
import logger from "../config/logger.js";

/**
 * Socket.IO Authentication Middleware
 *
 * Validates JWT tokens from socket.handshake.auth.token, socket.handshake.headers.authorization, or socket.handshake.query.token
 * Attaches userId to socket for subsequent operations
 *
 * Socket.IO flow:
 * 1. Client: new Socket(url, { auth: { token } }) or new Socket(url, { query: { token } })
 * 2. Server: middleware validates token
 * 3. Server: socket.userId set if valid
 * 4. Server: io.on('connection') called if middleware passes
 *
 * @param {Socket} socket - Socket.IO socket instance
 * @param {Function} next - Middleware callback (pass error or call with no args)
 */
export const socketAuthMiddleware = (socket, next) => {
  try {
    // Extract token from socket auth object
    let token = socket.handshake.auth?.token;

    // Fallback to query parameter if auth.token not provided
    if (!token && socket.handshake.query?.token) {
      token = socket.handshake.query.token;
    }

    // Fallback to Authorization header if auth.token and query.token not provided
    if (!token && socket.handshake.headers?.authorization) {
      const authHeader = socket.handshake.headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    // No token provided
    if (!token) {
      logger.warn(`Socket ${socket.id} rejected: no token provided`);
      return next(new Error("Socket authentication failed: token missing"));
    }

    // Verify JWT signature and expiration
    const decoded = jwt.verify(token, config.jwt.accessSecret);

    if (!decoded || !decoded.userId) {
      logger.warn(`Socket ${socket.id} rejected: invalid token payload`);
      return next(new Error("Socket authentication failed: invalid token"));
    }

    // Attach decoded user info to socket for later use
    socket.userId = decoded.userId;
    socket.tokenVersion = decoded.tokenVersion;

    logger.debug(`Socket ${socket.id} authenticated with userId: ${decoded.userId}`);

    return next();

  } catch (error) {
    // Log error with socket information
    if (error.name === "TokenExpiredError") {
      logger.warn(
        `Socket ${socket.id} rejected: token expired at ${new Date(error.expiredAt).toISOString()}`
      );
      return next(new Error(`Socket JWT expired: ${error.expiredAt}`));
    }

    if (error.name === "JsonWebTokenError") {
      logger.warn(`Socket ${socket.id} rejected: invalid JWT - ${error.message}`);
      return next(new Error("Socket authentication failed: invalid JWT signature"));
    }

    logger.error(`Socket ${socket.id} auth error:`, error.message);
    return next(new Error("Socket authentication failed"));
  }
};