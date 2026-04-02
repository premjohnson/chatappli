import express from 'express';
import protect from '../middlewares/protect.middleware.js';

const router = express.Router();

router.get('/profile', protect, async (req, res) => {
  res.status(200).json({
    status: 'success',
    data: req.user
  });
});

export default router;