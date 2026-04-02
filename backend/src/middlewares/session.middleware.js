import session from 'express-session';
import RedisStore from 'connect-redis';

import { getRedisClient } from '../config/redis.js';
import config from '../config/index.js';

const redisStore = new RedisStore({
    client: getRedisClient(),
    prefix: 'mychatapp:'
});

const sessionMiddleware = session({
    store: redisStore,
    name: config.session.name,
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: config.isProduction ? 'strict' : 'lax',
        maxAge: config.session.maxAge
    }
});

export default sessionMiddleware;