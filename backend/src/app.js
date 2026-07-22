import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import supportRoutes from './routes/Supportroutes.js';
import adminRoutes from './admin/adminRoutes.js';
import staffRoutes from './admin/staffRoutes.js';
import rewardsRoutes from './routes/rewardsRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Static Files (Uploads)
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/wishlist', wishlistRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/support', supportRoutes);
app.use('/api/v1', reviewRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/staff', staffRoutes);
app.use('/api/v1/rewards', rewardsRoutes);

// Basic Route
app.get('/', (req, res) => {
  res.json({ message: 'HUVVSM API SYSTEM V1.0 — ONLINE' });
});

export default app;