import express from 'express';
import {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  refreshLimiter,
  resetPasswordLimiter
} from '../middlewares/rateLimit.middleware.js';

import {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  forgotPassword,
  resetPassword
} from '../controllers/auth.controller.js';

import protect from '../middlewares/protect.middleware.js';
import { uploadAvatar } from '../middlewares/upload.middleware.js';

const router = express.Router();

router.post('/register', registerLimiter, uploadAvatar, register);
router.post('/login', loginLimiter, login);
router.post('/refresh', refreshLimiter, refresh);
router.post('/logout', logout);
router.post('/logout-all', protect, logoutAll);

router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/reset-password', resetPasswordLimiter, resetPassword);


export default router;