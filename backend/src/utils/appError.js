import { ERROR_CODES, ERROR_MESSAGES } from './errorConstants.js';

class AppError extends Error {
  constructor(errorCode, statusCode = 400, details = null) {
    const message = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES[ERROR_CODES.INTERNAL_SERVER_ERROR];
    super(message);

    this.errorCode = errorCode;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true; // Distinguishes between known app errors and programming bugs

    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
