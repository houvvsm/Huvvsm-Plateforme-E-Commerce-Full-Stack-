import express from 'express';
import { 
  getProducts, 
  getProduct, 
  createProduct, 
  updateProduct, 
  deleteProduct,
  updateStock
} from '../controllers/productController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.get('/', getProducts);
router.get('/:id', getProduct);

// Admin/Owner Routes
router.post('/', protect, authorize('ADMIN', 'OWNER'), upload.fields([
  { name: 'image1', maxCount: 1 }, 
  { name: 'image2', maxCount: 1 },
  { name: 'image3', maxCount: 1 },
  { name: 'image4', maxCount: 1 }
]), createProduct);
router.put('/:id', protect, authorize('ADMIN', 'OWNER'), upload.fields([
  { name: 'image1', maxCount: 1 }, 
  { name: 'image2', maxCount: 1 },
  { name: 'image3', maxCount: 1 },
  { name: 'image4', maxCount: 1 }
]), updateProduct);
router.patch('/:id', protect, authorize('ADMIN', 'OWNER'), upload.fields([
  { name: 'image1', maxCount: 1 }, 
  { name: 'image2', maxCount: 1 },
  { name: 'image3', maxCount: 1 },
  { name: 'image4', maxCount: 1 }
]), updateProduct);
router.delete('/:id', protect, authorize('ADMIN', 'OWNER'), deleteProduct);
router.patch('/:id/stock', protect, authorize('ADMIN', 'OWNER'), updateStock);

export default router;
