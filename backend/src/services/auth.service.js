import User from '../models/user.model.js';
import RefreshToken from '../models/refreshToken.model.js';
import config from '../config/index.js';

import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} from '../utils/token.util.js';

import { uploadImageBuffer } from '../utils/cloudinary.util.js';
import { getRedisClient } from '../config/redis.js';
import { sendOtpEmail } from '../utils/email.util.js';

import sanitizeUser from '../helper/user.help.js';
import maskEmail from '../helper/mask.helper.js';
import logger from '../config/logger.js';
import crypto from 'crypto';

class AuthService {

  /* =====================================================
     INTERNAL TOKEN ISSUER
  ===================================================== */

  static _getExpirySeconds(duration) {
    if (!duration) return 7 * 24 * 60 * 60;
    if (typeof duration === 'number') return duration;
    
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60;
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return value;
    }
  }

  static async issueAuthTokens(user) {

    const redis = getRedisClient();

    const accessToken = generateAccessToken(user);

    const { token, tokenId, tokenFamily } =
      generateRefreshToken(user);

    const expirySeconds = this._getExpirySeconds(config.jwt.refreshExpires);

    await redis.set(
      `refresh:${user._id}:${tokenId}`,
      tokenFamily,
      { EX: expirySeconds }
    );

    await RefreshToken.create({
      user: user._id,
      tokenId,
      tokenFamily,
      expiresAt: new Date(Date.now() + expirySeconds * 1000)
    });

    return {
      user: sanitizeUser(user),
      accessToken,
      refreshToken: token
    };
  }


  /* =====================================================
     REGISTER
  ===================================================== */

  static async register(data, file) {

    const existing = await User.findOne({ email: data.email });

    if (existing)
      throw new Error('Email already registered');

    let avatarData;

    if (file) {

      const result = await uploadImageBuffer(file.buffer);

      avatarData = {
        publicId: result.public_id,
        url: result.secure_url
      };

    }

    const user = await User.create({
      ...data,
      avatar: avatarData
    });

    return this.issueAuthTokens(user);
  }


  /* =====================================================
     LOGIN
  ===================================================== */

  static async login(email, password) {

    const user = await User
      .findOne({ email })
      .select('+password');

    if (!user)
      throw new Error('Invalid credentials');

    const isValid = await user.comparePassword(password);

    if (!isValid)
      throw new Error('Invalid credentials');

    if (!user.isActive)
      throw new Error('Account disabled');

    return this.issueAuthTokens(user);
  }


  /* =====================================================
     REFRESH TOKEN
  ===================================================== */

static async refresh(oldToken) {

  const redis = getRedisClient();

  const payload = verifyRefreshToken(oldToken);

  const redisKey =
    `refresh:${payload.userId}:${payload.tokenId}`;

  const lockKey =
    `lock:refresh:${payload.tokenId}`;

  // =====================================================
  // ACQUIRE DISTRIBUTED LOCK
  // Prevent double refresh race conditions
  // =====================================================

  const lock = await redis.set(
    lockKey,
    'locked',
    {
      NX: true,
      PX: 5000 // auto-expire lock after 5 sec
    }
  );

  if (!lock)
    throw new Error('Refresh already in progress');

  try {

    // =====================================================
    // VERIFY REDIS SESSION
    // =====================================================

    const redisValue = await redis.get(redisKey);

    if (!redisValue) {

      await RefreshToken.updateMany(
        { tokenFamily: payload.tokenFamily },
        { isRevoked: true }
      );

      throw new Error('Refresh token reuse detected');
    }

    // =====================================================
    // VERIFY TOKEN RECORD
    // =====================================================

    const tokenRecord = await RefreshToken.findOne({
      tokenId: payload.tokenId,
      isRevoked: false
    });

    if (!tokenRecord)
      throw new Error('Token revoked');

    // =====================================================
    // VERIFY USER
    // =====================================================

    const user = await User.findById(payload.userId);

    if (
      !user ||
      user.tokenVersion !== payload.tokenVersion
    ) {
      throw new Error('Token version mismatch');
    }

    if (!user.isActive) {
      throw new Error('Account disabled');
    }

    // =====================================================
    // GENERATE NEW TOKENS FIRST
    // SAFER THAN DELETING OLD FIRST
    // =====================================================

    const accessToken =
      generateAccessToken(user);

    const {
      token,
      tokenId,
      tokenFamily
    } = generateRefreshToken(
      user,
      payload.tokenFamily
    );

    const newRedisKey =
      `refresh:${user._id}:${tokenId}`;

    const expirySeconds = this._getExpirySeconds(config.jwt.refreshExpires);

    // =====================================================
    // STORE NEW TOKEN FIRST
    // =====================================================

    await redis.set(
      newRedisKey,
      tokenFamily,
      {
        EX: expirySeconds
      }
    );

    // =====================================================
    // SAVE NEW TOKEN RECORD
    // =====================================================

    await RefreshToken.create({
      user: user._id,
      tokenId,
      tokenFamily,
      expiresAt: new Date(
        Date.now() + expirySeconds * 1000
      )
    });

    // =====================================================
    // REVOKE OLD TOKEN
    // =====================================================

    tokenRecord.isRevoked = true;

    await tokenRecord.save();

    // =====================================================
    // DELETE OLD REDIS KEY LAST
    // =====================================================

    await redis.del(redisKey);

    // =====================================================
    // RETURN NEW TOKENS + UPDATED USER DATA
    // =====================================================

    return {
      user: sanitizeUser(user),
      accessToken,
      refreshToken: token
    };

  } finally {

    // =====================================================
    // ALWAYS RELEASE LOCK
    // =====================================================

    await redis.del(lockKey);
  }
}


  /* =====================================================
     LOGOUT
  ===================================================== */

  static async logout(refreshToken) {

    const redis = getRedisClient();

    const payload = verifyRefreshToken(refreshToken);

    await redis.del(
      `refresh:${payload.userId}:${payload.tokenId}`
    );

    await RefreshToken.updateOne(
      { tokenId: payload.tokenId },
      { isRevoked: true }
    );

  }


  /* =====================================================
     LOGOUT ALL DEVICES
  ===================================================== */

  static async logoutAll(userId) {

    const redis = getRedisClient();

    await User.findByIdAndUpdate(userId, {
      $inc: { tokenVersion: 1 }
    });

    await RefreshToken.updateMany(
      { user: userId, isRevoked: false },
      { isRevoked: true }
    );

    const pattern = `refresh:${userId}:*`;

    const keys = await redis.keys(pattern);

    if (keys.length > 0)
      await redis.del(keys);

    return true;
  }


/* =====================================================
   PASSWORD RESET REQUEST
===================================================== */

  static async requestPasswordReset(email) {

    const normalizedEmail =
      email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail
    });

    // Prevent user enumeration + timing attacks
    if (!user) {

      // Simulate cryptographic workload
      crypto.pbkdf2Sync(
        normalizedEmail,
        'dummy-salt',
        100000,
        64,
        'sha512'
      );

      logger.warn(
        `Password reset requested for unknown email: ${maskEmail(normalizedEmail)}`
      );

      return {
        success: true
      };
    }

    const otp = user.generatePasswordResetOtp();

    await user.save();

    // TODO:
    // Move email sending to background queue later
    await sendOtpEmail(user.email, otp);

    logger.info(
      `Password reset OTP sent to ${maskEmail(user.email)}`
    );

    return {
      success: true
    };
  }

  /* =====================================================
     RESET PASSWORD
  ===================================================== */

  static async resetPassword(email, otp, newPassword) {

    const user = await User.findOne({
      email: email.trim().toLowerCase()
    });

    if (!user)
      throw new Error('User not found');

    const hash = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    if (user.resetPasswordOtpHash !== hash)
      throw new Error('Invalid OTP');

    if (user.resetPasswordOtpExpires < new Date())
      throw new Error('OTP expired');

    user.password = newPassword;
    user.resetPasswordOtpHash = undefined;
    user.resetPasswordOtpExpires = undefined;

    // Increment token version to logout from all devices on password change
    user.tokenVersion += 1;

    await user.save();

    return true;
  }

}

export default AuthService;