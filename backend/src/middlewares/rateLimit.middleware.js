import rateLimit from 'express-rate-limit';

/**
 * Generic limiter factory
 */
const createLimiter = (options) =>
  rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: 'fail',
      message: options.message || 'Too many requests, please try again later'
    }
  });

/* ================= LOGIN ================= */
export const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many login attempts, try again after 15 minutes'
});

/* ================= REGISTER ================= */
export const registerLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many registration attempts'
});

/* ================= FORGOT PASSWORD ================= */
export const forgotPasswordLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many password reset requests'
});

/* ================= REFRESH ================= */
export const refreshLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  max: 200,
  message: 'Too many refresh attempts'
});

/* ================= RESET PASSWORD ================= */
export const resetPasswordLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many reset attempts'
});