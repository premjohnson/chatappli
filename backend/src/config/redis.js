import { createClient } from 'redis';
import logger from './logger.js';
import config from './index.js';

let redisClient = null;

export const connectRedis = async () => {
  try {
    redisClient = createClient({
      url: config.redis.url,
    });

    redisClient.on('error', (err) => {
      logger.error({ message: 'Redis Client Error', error: err.message });
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    await redisClient.connect();
  } catch (error) {
    logger.error({ message: 'Redis connection failed', error: error.message });
    process.exit(1);
  }
};

export const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis not initialized. Call connectRedis() first.');
  }
  return redisClient;
};

export const disconnectRedis = async () => {
  if (redisClient?.isOpen) {
    await redisClient.quit();
    logger.info('Redis client disconnected');
  }
};
