import multer from 'multer';
import logger from '../config/logger.js';
import config from '../config/index.js';

const errorHandler = (err, req, res, next) => {
  logger.error(err);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }

  if (err.message === 'Invalid file type. Only JPEG, PNG, WEBP allowed.') {
    return res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }

  res.status(500).json({
    status: 'error',
    message: config.isDevelopment ? err.message : 'Internal Server Error'
  });
};

export default errorHandler;