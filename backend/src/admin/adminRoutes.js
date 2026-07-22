import express from 'express';
import {
  getStats,
  getAllUsers,
  updateUserRole,
  deleteUser,
  getCommandCenter,
  getSupportStats,
  adminAiChat
} from './adminController.js';
import { getAllOrders, updateOrderStatus } from '../controllers/Ordercontroller.js';
import { getAllReviewsAdmin, deleteReviewAdmin } from '../controllers/reviewController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  getAdminRewardsDashboard,
  updateRewardsConfig,
  upsertRewardThreshold,
  deleteRewardThreshold
} from '../controllers/rewardsController.js';
import {
  getAllTickets,
  getAdminTicketById,
  adminReply,
  updateTicketStatus,
  addInternalNote,
  getSuggestedReplies
} from '../controllers/supportController.js';

const router = express.Router();

// Apply protection and admin authorization to all routes in this file
router.use(protect);
router.use(authorize('ADMIN', 'OWNER'));

// ── Command Center (business analytics) ──────────────────────
router.get('/command-center', getCommandCenter);

// ── Stats HUD ────────────────────────────────────────────────
router.get('/stats', getStats);

// ── Users ─────────────────────────────────────────────────────
router.get('/users', getAllUsers);
router.patch('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

// ── Orders ────────────────────────────────────────────────────
router.get('/orders', getAllOrders);
router.patch('/orders/:id/status', updateOrderStatus);

// ── Reviews moderation ────────────────────────────────────────
router.get('/reviews', getAllReviewsAdmin);
router.delete('/reviews/:id', deleteReviewAdmin);

// ── Rewards Management ────────────────────────────────────────
router.get('/rewards', getAdminRewardsDashboard);
router.post('/rewards/config', updateRewardsConfig);
router.post('/rewards/thresholds', upsertRewardThreshold);
router.delete('/rewards/thresholds/:id', deleteRewardThreshold);

// ── Admin Support Center & Notes ──
router.get('/support/tickets', getAllTickets);
router.get('/support/tickets/:id', getAdminTicketById);
router.post('/support/tickets/:id/reply', adminReply);
router.patch('/support/tickets/:id/status', updateTicketStatus);
router.post('/support/tickets/:id/notes', addInternalNote);
router.post('/support/tickets/:id/suggest-replies', getSuggestedReplies);
router.get('/support/stats', getSupportStats);

// ── Admin AI Management Assistant ──
router.post('/ai-chat', adminAiChat);

export default router;