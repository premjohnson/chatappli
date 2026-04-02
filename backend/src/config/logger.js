import winston from 'winston';
import config from './index.js';

const { combine, timestamp, printf, errors, json, colorize } = winston.format;

const devFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`;
});

const logger = winston.createLogger({
  level: config.isProduction ? 'info' : 'debug',
  format: combine(
    errors({ stack: true }),
    timestamp(),
    config.isProduction ? json() : combine(colorize(), devFormat)
  ),
  transports: [
    new winston.transports.Console()
  ],
  exitOnError: false
});

// Handle uncaught exceptions
logger.exceptions.handle(
  new winston.transports.Console()
);

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled Rejection: ${reason}`);
  process.exit(1);
});

export default logger;