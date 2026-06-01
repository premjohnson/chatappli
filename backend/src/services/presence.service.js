import { getRedisClient }
from "../config/redis.js";

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

    const redis =
      getRedisClient();

    if (!redis?.isOpen)
      return;

    await redis.sAdd(
      this.ONLINE_SET,
      userId.toString()
    );
  }

// Set user as offline and record last seen timestamp
  static async setOffline(userId) {

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
  }

// Decrement active connection count for a user and set offline if no more connections
  static async decrementConnections(
    userId
  ) {

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