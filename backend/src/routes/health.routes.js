import express from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { healthCheck } from '../controllers/health.controller.js';

const router = express.Router();


//health check route
router.get('/', asyncHandler(healthCheck));

export default router;