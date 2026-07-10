import { getRedisClient } from "../config/redis.js";
import logger from "../config/logger.js";

class PresenceService {

// Redis set key for online users

  static ONLINE_SET =
    "presence:online_users";

// Helper methods to generate Redis keys for last seen
  static getLastSeenKey(userId) {

    return `presence:lastSeen:${userId}`;
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


}

export default PresenceService;