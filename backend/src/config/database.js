import mongoose from 'mongoose';
import config from './index.js';
import logger from './logger.js';


const connectDB = async () => {
    try {
        mongoose.set('strictQuery', true);

        const connDB = await mongoose.connect(config.database.uri);

        logger.info(`MongoDB Connected: ${connDB.connection.host}`);

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB Disconnected');
        });

        mongoose.connection.on('reconnected', () => {
            logger.info('MongoDB Reconnected');
        });

        mongoose.connection.on('error', (err) => {
            logger.error(`MongoDB Connection Error: ${err}`);
        });

    } catch (error) {
        logger.error(`MongoDB Connection Failed: ${error}`);
        process.exit(1);
    }
};


//shutdown for database 

export const closeDB = async () => {
    try{
        await mongoose.connection.close();
        logger.info('MongoDB Connection Closed');

    } catch (error) {
        logger.error(`Error Closing MongoDB Connection: ${error.message}`);
    }
};

export default connectDB;
