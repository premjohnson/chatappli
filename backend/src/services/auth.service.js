import User from '../models/user.model.js';
import RefreshToken from '../models/refreshToken.model.js';

import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} from '../utils/token.util.js';

import { uploadImageBuffer } from '../utils/cloudinary.util.js';
import { getRedisClient } from '../config/redis.js';
import { sendOtpEmail } from '../utils/email.util.js';

import sanitizeUser from '../helper/user.help.js';

import crypto from 'crypto';

class AuthService {

  /* =====================================================
     INTERNAL TOKEN ISSUER
  ===================================================== */

  static async issueAuthTokens(user) {

    const redis = getRedisClient();

    const accessToken = generateAccessToken(user);

    const { token, tokenId, tokenFamily } =
      generateRefreshToken(user);

    await redis.set(
      `refresh:${user._id}:${tokenId}`,
      tokenFamily,
      { EX: 7 * 24 * 60 * 60 }
    );

    await RefreshToken.create({
      user: user._id,
      tokenId,
      tokenFamily,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
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

    const redisValue = await redis.get(redisKey);

    if (!redisValue) {

      await RefreshToken.updateMany(
        { tokenFamily: payload.tokenFamily },
        { isRevoked: true }
      );

      throw new Error('Refresh token reuse detected');
    }

    const tokenRecord = await RefreshToken.findOne({
      tokenId: payload.tokenId,
      isRevoked: false
    });

    if (!tokenRecord)
      throw new Error('Token revoked');

    const user = await User.findById(payload.userId);

    if (!user || user.tokenVersion !== payload.tokenVersion)
      throw new Error('Token version mismatch');

    await redis.del(redisKey);

    tokenRecord.isRevoked = true;
    await tokenRecord.save();

    const accessToken = generateAccessToken(user);

    const { token, tokenId, tokenFamily } =
      generateRefreshToken(user, payload.tokenFamily);

    await redis.set(
      `refresh:${user._id}:${tokenId}`,
      tokenFamily,
      { EX: 7 * 24 * 60 * 60 }
    );

    await RefreshToken.create({
      user: user._id,
      tokenId,
      tokenFamily,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    return {
      accessToken,
      refreshToken: token
    };
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

    const user = await User.findOne({ email });

    if (!user) return;

    const otp = user.generatePasswordResetOtp();

    await user.save();

    await sendOtpEmail(user.email, otp);

  }


  /* =====================================================
     RESET PASSWORD
  ===================================================== */

  static async resetPassword(email, otp, newPassword) {

    const user = await User
      .findOne({ email })
      .select('+password');

    if (
      !user ||
      !user.resetPasswordOtpHash ||
      user.resetPasswordOtpExpires < Date.now()
    )
      throw new Error('OTP expired');

    const hashedOtp = crypto
      .createHash('sha256')
      .update(otp)
      .digest('hex');

    if (hashedOtp !== user.resetPasswordOtpHash)
      throw new Error('Invalid OTP');

    user.password = newPassword;

    user.resetPasswordOtpHash = undefined;
    user.resetPasswordOtpExpires = undefined;

    user.tokenVersion += 1;

    await user.save();
  }

}

export default AuthService;