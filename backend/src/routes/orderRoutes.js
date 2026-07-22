import express from 'express';
import { getMyOrders, createOrder, getAllOrders, updateOrderStatus } from '../controllers/orderController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect); // All order routes protected

router.get('/', getMyOrders);
router.post('/', createOrder);
router.get('/admin', authorize('ADMIN'), getAllOrders);
router.put('/:id/status', authorize('ADMIN'), updateOrderStatus);

export default router;
