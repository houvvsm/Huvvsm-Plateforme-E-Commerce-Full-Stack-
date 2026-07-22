import express from 'express';
import { getAllReviews, getProductReviews, createReview } from '../controllers/reviewController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Site-wide feed (homepage)
router.get('/reviews', getAllReviews);

// Per-product
router.get('/products/:productId/reviews', getProductReviews);
router.post('/products/:productId/reviews', protect, createReview);

export default router;