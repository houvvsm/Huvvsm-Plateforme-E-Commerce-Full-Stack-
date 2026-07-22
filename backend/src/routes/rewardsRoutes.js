import express from 'express';
import { getMyRewards } from '../controllers/rewardsController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Fetch customer-facing loyalty dashboard details
router.get('/my', protect, getMyRewards);

export default router;
