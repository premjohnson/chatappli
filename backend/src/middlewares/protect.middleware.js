import { verifyAccessToken } from '../utils/token.util.js';
import User from '../models/user.model.js';
import asyncHandler from '../utils/asyncHandler.js';

const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'fail',
      message: 'Authorization token missing'
    });
  }

  const token = authHeader.split(' ')[1];

  let decoded;

  try {
    decoded = verifyAccessToken(token);
  } catch (error) {
    return res.status(401).json({
      status: 'fail',
      message: 'Invalid or expired access token'
    });
  }

  const user = await User.findById(decoded.userId);

  if (!user) {
    return res.status(401).json({
      status: 'fail',
      message: 'User no longer exists'
    });
  }

  if (!user.isActive) {
    return res.status(403).json({
      status: 'fail',
      message: 'Account disabled'
    });
  }

  if (user.tokenVersion !== decoded.tokenVersion) {
    return res.status(401).json({
      status: 'fail',
      message: 'Token version invalidated'
    });
  }

  req.user = user;
  next();
});

export default protect;