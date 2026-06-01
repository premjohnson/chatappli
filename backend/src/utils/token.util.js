import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/index.js';


export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      tokenVersion: user.tokenVersion
    },
    config.jwt.accessSecret,
    {
      expiresIn: config.jwt.accessExpires || '15m'
    }
  );
};

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
    config.jwt.refreshSecret,
    {
      expiresIn: config.jwt.refreshExpires || '7d'
    }
  );

  return {
    token,
    tokenId,
    tokenFamily
  };
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, config.jwt.accessSecret);
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, config.jwt.refreshSecret);
};