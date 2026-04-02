import os from 'os';
import config from '../config/index.js';


export const healthCheck = (req, res) => {
    res.status(200).json({
        status: 'OK-200',
        message: 'Server is healthy',
        environment: config.env,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        memoryUsage: process.memoryUsage().rss,
        cpuLoad: os.loadavg(),
    });
};
