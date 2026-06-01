import rateLimit from 'express-rate-limit';
import AppError from '../utils/appError.js';
import { ERROR_CODES } from '../utils/errorConstants.js';


const createLimiter = (options) =>
  rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
      // Use AppError for consistent response structure
      next(new AppError(ERROR_CODES.RATE_LIMIT_EXCEEDED, 429));
    }
  });

// LOGIN
export const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many login attempts, try again after 15 minutes'
});

//REGISTER
export const registerLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many registration attempts'
});

//FORGOT PASSWORD
export const forgotPasswordLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many password reset requests'
});

//REFRESH TOKEN
export const refreshLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  max: 200,
  message: 'Too many refresh attempts'
});

//RESET PASSWORD 
export const resetPasswordLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many reset attempts'
});