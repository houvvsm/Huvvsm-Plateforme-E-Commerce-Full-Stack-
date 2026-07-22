import express from 'express';
import { getCart, addToCart, removeFromCart, clearCart } from '../controllers/cartController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect); // All cart routes protected

router.get('/', getCart);
router.post('/', addToCart);
router.delete('/:id', removeFromCart);
router.delete('/', clearCart);

export default router;
