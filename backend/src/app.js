import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';


import config from './config/index.js';
import logger from './config/logger.js';
import errorHandler from './middlewares/error.middleware.js';
import healthRoutes from './routes/health.routes.js';
import notFound from './middlewares/notFound.middleware.js';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import conversationRoutes from "./routes/conversation.routes.js";
import messageRoutes from "./routes/message.routes.js";
import deviceRoutes from "./routes/device.routes.js";
import users from "./routes/users.routes.js";

const app = express();

//sec
app.use(helmet());
app.use(compression());
app.use(cookieParser());

//body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

//cors
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  })
);

//logging
if(config.isDevelopment) {  
    app.use(morgan('dev'));
}

//routes
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users',userRoutes );
app.use("/api/v1/conversations", conversationRoutes);
app.use("/api/v1/messages", messageRoutes);
app.use("/api/v1/devices", deviceRoutes);
app.use("/api/v1/search", users);

//404

app.use(notFound);

//global error handler
app.use(errorHandler);  


export default app;

