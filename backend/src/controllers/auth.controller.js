import asyncHandler from '../utils/asyncHandler.js';
import AuthService from '../services/auth.service.js';
import config from '../config/index.js';

/* ================= REGISTER ================= */
export const register = asyncHandler(async (req, res) => {

  const user = await AuthService.register(req.body, req.file);

  res.status(201).json({
    status: 'success',
    message: 'User registered successfully',
    data: {
      id: user._id,
      email: user.email,
      username: user.username,
      avatar: user.avatar?.url || null
    }
  });
});


/* ================= LOGIN ================= */
export const login = asyncHandler(async (req, res) => {

  const { email, password } = req.body;

  const { user, accessToken, refreshToken } =
    await AuthService.login(email, password);

  res.cookie(config.session.name, refreshToken, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'strict',
    maxAge: config.session.maxAge
  });

  res.status(200).json({
  status: 'success',
  data: {
    user: {
      id: user._id,
      email: user.email,
      username: user.username,
      avatar: user.avatar?.url || null
    },
    accessToken
  }
});
});


/* ================= REFRESH ================= */
export const refresh = asyncHandler(async (req, res) => {

  const refreshToken = req.cookies[config.session.name];

  if (!refreshToken)
    return res.status(401).json({
      status: 'fail',
      message: 'No refresh token provided'
    });

  const { accessToken, refreshToken: newRefreshToken } =
    await AuthService.refresh(refreshToken);

  res.cookie(config.session.name, newRefreshToken, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'strict',
    maxAge: config.session.maxAge
  });

  res.status(200).json({
    status: 'success',
    accessToken
  });
});


/* ================= LOGOUT ================= */
export const logout = asyncHandler(async (req, res) => {

  const refreshToken = req.cookies[config.session.name];

  if (refreshToken) {
    await AuthService.logout(refreshToken);
  }

  res.clearCookie(config.session.name);

  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully'
  });
});


/* ================= LOGOUT ALL ================= */
export const logoutAll = asyncHandler(async (req, res) => {

  await AuthService.logoutAll(req.user._id);

  res.clearCookie(config.session.name);

  res.status(200).json({
    status: 'success',
    message: 'Logged out from all devices'
  });
});


/* ================= FORGOT PASSWORD ================= */
export const forgotPassword = asyncHandler(async (req, res) => {

  const { email } = req.body;

  await AuthService.requestPasswordReset(email);

  res.status(200).json({
    status: 'success',
    message: 'If the email exists, OTP has been sent'
  });
});


/* ================= RESET PASSWORD ================= */
export const resetPassword = asyncHandler(async (req, res) => {

  const { email, otp, newPassword } = req.body;

  await AuthService.resetPassword(email, otp, newPassword);

  res.status(200).json({
    status: 'success',
    message: 'Password reset successful'
  });
});