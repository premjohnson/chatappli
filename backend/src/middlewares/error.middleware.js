import multer from 'multer';
import logger from '../config/logger.js';
import config from '../config/index.js';
import AppError from '../utils/appError.js';
import { ERROR_CODES } from '../utils/errorConstants.js';

const errorHandler = (err, req, res, next) => {
  // Log the error for internal tracking
  if (err.statusCode >= 500 || !err.isOperational) {
    logger.error('SYSTEM ERROR:', err);
  } else {
    logger.warn('OPERATIONAL ERROR:', {
      errorCode: err.errorCode,
      message: err.message,
      path: req.path
    });
  }

  // Handle AppError (Known operational errors)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'fail',
      errorCode: err.errorCode,
      message: err.message,
      details: err.details || undefined
    });
  }

  // Handle Multer specific errors
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      status: 'fail',
      errorCode: ERROR_CODES.VALIDATION_ERROR,
      message: err.message
    });
  }

  // Handle MongoDB CastErrors (Invalid IDs)
  if (err.name === 'CastError') {
    return res.status(400).json({
      status: 'fail',
      errorCode: ERROR_CODES.VALIDATION_ERROR,
      message: `Invalid ${err.path}: ${err.value}`
    });
  }

  // Handle MongoDB Duplicate Key Errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      status: 'fail',
      errorCode: ERROR_CODES.ALREADY_EXISTS,
      message: `${field} already exists.`
    });
  }

  // Final fallback for unknown/system errors
  const statusCode = err.statusCode || 500;
  const message = config.isDevelopment ? err.message : 'An unexpected error occurred.';
  
  res.status(statusCode).json({
    status: 'error',
    errorCode: ERROR_CODES.INTERNAL_SERVER_ERROR,
    message,
    ...(config.isDevelopment && { stack: err.stack })
  });
};

export default errorHandler;