import dotenv from 'dotenv';

dotenv.config();


const requiredEnvVars = [
  'PORT',
  'NODE_ENV',
  'MONGODB_URI',
  'REDIS_URL',
  'CLIENT_URL',
  'SESSION_SECRET',

  // JWT
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_ACCESS_EXPIRES',
  'JWT_REFRESH_EXPIRES',
  'COOKIE_NAME',

  // Cloudinary
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',

  // Email
  'EMAIL_USER',
  'EMAIL_PASS'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

const config = {
  env: process.env.NODE_ENV,
  port: Number(process.env.PORT),

  clientUrl: process.env.CLIENT_URL,

  database: {
    uri: process.env.MONGODB_URI
  },

  redis: {
    url: process.env.REDIS_URL
  },

  session: {
    secret: process.env.SESSION_SECRET,
    name: process.env.COOKIE_NAME,
    maxAge: 1000 * 60 * 60 * 24
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpires: process.env.JWT_ACCESS_EXPIRES,
    refreshExpires: process.env.JWT_REFRESH_EXPIRES
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  },

  email: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },

  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development'
};

export default config;