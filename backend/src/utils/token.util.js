import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/index.js';

/**
 * Generate Access Token
 */
export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      tokenVersion: user.tokenVersion
    },
    process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m'
    }
  );
};

/**
 * Generate Refresh Token
 * Supports token family + multi-device login
 */
export const generateRefreshToken = (user, existingFamily = null) => {
  const tokenId = uuidv4();
  const tokenFamily = existingFamily || uuidv4();

  const token = jwt.sign(
    {
      userId: user._id.toString(),
      tokenId,
      tokenFamily,
      tokenVersion: user.tokenVersion
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d'
    }
  );

  return {
    token,
    tokenId,
    tokenFamily
  };
};

/**
 * Verify Access Token
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
};

/**
 * Verify Refresh Token
 */
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};