import { getRedisClient } from "../config/redis.js";

class PresenceService {

  static ONLINE_SET = "presence:online_users";

  static getLastSeenKey(userId) {
    return `presence:lastSeen:${userId}`;
  }

  /* ================= USER ONLINE ================= */

  static async setOnline(userId) {

    const redis = getRedisClient();
    if (!redis?.isOpen) return;

    await redis.sAdd(
      this.ONLINE_SET,
      userId.toString()
    );

  }

  /* ================= USER OFFLINE ================= */

  static async setOffline(userId) {

    const redis = getRedisClient();
    if (!redis?.isOpen) return;

    await redis.sRem(
      this.ONLINE_SET,
      userId.toString()
    );

    await redis.set(
      this.getLastSeenKey(userId),
      Date.now()
    );

  }

  /* ================= CHECK ONLINE ================= */

  static async isOnline(userId) {

    const redis = getRedisClient();
    if (!redis?.isOpen) return false;

    return redis.sIsMember(
      this.ONLINE_SET,
      userId.toString()
    );

  }

  /* ================= LAST SEEN ================= */

  static async getLastSeen(userId) {

    const redis = getRedisClient();
    if (!redis?.isOpen) return null;

    return redis.get(
      this.getLastSeenKey(userId)
    );

  }

}

export default PresenceService;