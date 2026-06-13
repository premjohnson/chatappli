import { getRedisClient } from "../config/redis.js";
import logger from "../config/logger.js";

class PresenceService {

// Redis set key for online users

  static ONLINE_SET =
    "presence:online_users";

// Helper methods to generate Redis keys for last seen and connection count
  static getLastSeenKey(userId) {

    return `presence:lastSeen:${userId}`;
  }


// Helper method to generate Redis key for active connections count
  static getConnectionsKey(userId) {

    return `presence:connections:${userId}`;
  }

// Set user as online

  static async setOnline(userId) {
    try {
      const redis =
        getRedisClient();

      if (!redis?.isOpen)
        return;

      await redis.sAdd(
        this.ONLINE_SET,
        userId.toString()
      );
    } catch (error) {
      logger.warn(`Redis setOnline error: ${error.message}`);
    }
  }

// Set user as offline and record last seen timestamp
  static async setOffline(userId) {
    try {
      const redis =
        getRedisClient();

      if (!redis?.isOpen)
        return;

      await redis.sRem(
        this.ONLINE_SET,
        userId.toString()
      );

      await redis.set(
        this.getLastSeenKey(userId),
        Date.now()
      );
    } catch (error) {
      logger.warn(`Redis setOffline error: ${error.message}`);
    }
  }

// Check if user is online
  static async isOnline(userId) {

    const redis =
      getRedisClient();

    if (!redis?.isOpen)
      return false;

    return redis.sIsMember(
      this.ONLINE_SET,
      userId.toString()
    );
  }


// Get last seen timestamp for a user
  static async getLastSeen(userId) {

    const redis =
      getRedisClient();

    if (!redis?.isOpen)
      return null;

    return redis.get(
      this.getLastSeenKey(userId)
    );
  }


// Increment active connection count for a user and set online if first connection
  static async incrementConnections(
    userId
  ) {
    try {
      const redis =
        getRedisClient();

      if (!redis?.isOpen)
        return 0;

      const key =
        this.getConnectionsKey(
          userId
        );

      const count =
        await redis.incr(key);


      await redis.expire(
        key,
        60 * 60
      );


      if (count === 1) {

        await this.setOnline(
          userId
        );
      }

      return count;
    } catch (error) {
      logger.warn(`Redis incrementConnections error: ${error.message}`);
      return 0;
    }
  }

// Decrement active connection count for a user and set offline if no more connections
  static async decrementConnections(
    userId
  ) {
    try {
      const redis =
        getRedisClient();

      if (!redis?.isOpen)
        return 0;

      const key =
        this.getConnectionsKey(
          userId
        );

      const count =
        await redis.decr(key);


      if (count <= 0) {

        await redis.del(key);

        await this.setOffline(
          userId
        );

        return 0;
      }

      return count;
    } catch (error) {
      logger.warn(`Redis decrementConnections error: ${error.message}`);
      return 0;
    }
  }


// Get current active connection count for a user
  static async getConnectionCount(userId) {
    const redis = getRedisClient();
    if (!redis?.isOpen) return 0;

    const count = await redis.get(this.getConnectionsKey(userId));
    return count ? parseInt(count, 10) : 0;
  }

}

export default PresenceService;