import { getRedisClient }
from "../config/redis.js";

class PresenceService {

  // ============================================
  // GLOBAL ONLINE USERS SET
  // ============================================

  static ONLINE_SET =
    "presence:online_users";

  // ============================================
  // LAST SEEN KEY
  // ============================================

  static getLastSeenKey(userId) {

    return `presence:lastSeen:${userId}`;
  }

  // ============================================
  // CONNECTION COUNT KEY
  // ============================================

  static getConnectionsKey(userId) {

    return `presence:connections:${userId}`;
  }

  /* =====================================================
     USER ONLINE
  ===================================================== */

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

  /* =====================================================
     USER OFFLINE
  ===================================================== */

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

  /* =====================================================
     CHECK ONLINE
  ===================================================== */

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

  /* =====================================================
     GET LAST SEEN
  ===================================================== */

  static async getLastSeen(userId) {

    const redis =
      getRedisClient();

    if (!redis?.isOpen)
      return null;

    return redis.get(
      this.getLastSeenKey(userId)
    );
  }

  /* =====================================================
     INCREMENT ACTIVE CONNECTIONS
  ===================================================== */

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

    // ============================================
    // SAFETY TTL
    // protects against crashes
    // ============================================

    await redis.expire(
      key,
      60 * 60
    );

    // ============================================
    // FIRST ACTIVE CONNECTION
    // USER BECOMES ONLINE
    // ============================================

    if (count === 1) {

      await this.setOnline(
        userId
      );
    }

    return count;
  }

  /* =====================================================
     DECREMENT ACTIVE CONNECTIONS
  ===================================================== */

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

    // ============================================
    // LAST ACTIVE CONNECTION CLOSED
    // USER BECOMES OFFLINE
    // ============================================

    if (count <= 0) {

      await redis.del(key);

      await this.setOffline(
        userId
      );

      return 0;
    }

    return count;
  }

  /* =====================================================
     GET CONNECTION COUNT
  ===================================================== */

  static async getConnectionCount(userId) {
    const redis = getRedisClient();
    if (!redis?.isOpen) return 0;

    const count = await redis.get(this.getConnectionsKey(userId));
    return count ? parseInt(count, 10) : 0;
  }

}

export default PresenceService;