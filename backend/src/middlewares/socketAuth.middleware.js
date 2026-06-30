import config from "../config/index.js";
import logger from "../config/logger.js";
import User from "../models/user.model.js";
import { verifyAccessToken } from "../utils/token.util.js";

export const socketAuthMiddleware = async (socket, next) => {
  try {
    // Extract token from socket auth object
    let token = socket.handshake.auth?.token;

    // Fallback to query parameter
    if (!token && socket.handshake.query?.token) {
      token = socket.handshake.query.token;
    }

    // Fallback to Authorization header
    if (!token && socket.handshake.headers?.authorization) {
      const authHeader = socket.handshake.headers.authorization;

      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    // No token provided
    if (!token) {
      logger.warn(`Socket ${socket.id} rejected: no token provided`);
      return next(
        new Error("Socket authentication failed: token missing")
      );
    }

    // Verify access token
    const decoded = verifyAccessToken(token);

    if (!decoded?.userId) {
      logger.warn(
        `Socket ${socket.id} rejected: invalid token payload`
      );

      return next(
        new Error("Socket authentication failed: invalid token")
      );
    }

    // Load only required fields
    const user = await User.findById(decoded.userId)
      .select("_id isActive tokenVersion");

    if (!user) {
      return next(
        new Error("Socket authentication failed: user not found")
      );
    }

    if (!user.isActive) {
      return next(
        new Error("Socket authentication failed: account disabled")
      );
    }

    if (user.tokenVersion !== decoded.tokenVersion) {
      return next(
        new Error("Socket authentication failed: token revoked")
      );
    }

    // Attach authenticated user to socket
    socket.user = user;
    socket.userId = user._id.toString();
    socket.tokenVersion = user.tokenVersion;

    logger.debug(
      `Socket ${socket.id} authenticated with userId: ${socket.userId}`
    );

    return next();

  } catch (error) {

    if (error.name === "TokenExpiredError") {
      logger.warn(
        `Socket ${socket.id} rejected: token expired at ${new Date(
          error.expiredAt
        ).toISOString()}`
      );

      return next(
        new Error(`Socket JWT expired: ${error.expiredAt}`)
      );
    }

    if (error.name === "JsonWebTokenError") {
      logger.warn(
        `Socket ${socket.id} rejected: invalid JWT - ${error.message}`
      );

      return next(
        new Error("Socket authentication failed: invalid JWT signature")
      );
    }

    logger.error(
      `Socket ${socket.id} auth error: ${error.message}`
    );

    return next(
      new Error("Socket authentication failed")
    );
  }
};