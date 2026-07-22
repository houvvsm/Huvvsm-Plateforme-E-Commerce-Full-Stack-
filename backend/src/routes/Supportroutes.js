import express from 'express';
import { sendSupportEmail, sendEscalatedSupportEmail } from '../config/email.js';
import { protect } from '../middleware/authMiddleware.js';
import { prisma } from '../config/db.js';
import { generateCustomerChat } from '../services/aiService.js';
import {
  createTicket,
  getMyTickets,
  getTicketById,
  addCustomerMessage,
  submitRating
} from '../controllers/supportController.js';

const router = express.Router();

// ── LEGACY EMAIL FORM ────────────────────────────────────────
// @route   POST /api/v1/support
router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, error: 'Name, email and message are required' });
    }
    await sendSupportEmail({ name, email, subject: subject || 'General Inquiry', message });
    res.status(200).json({ success: true, message: 'Signal transmitted successfully' });
  } catch (err) {
    console.error('[SUPPORT EMAIL ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

// ── PUBLIC AI CHAT (GUEST) ───────────────────────────────────
// @desc    AI support assistant — guest (no user context)
// @route   POST /api/v1/support/chat
// @access  Public
router.post('/chat', async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message) {
    return res.status(400).json({ success: false, error: 'Message is required' });
  }
  try {
    const data = await generateCustomerChat(history, message);
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[AI CHAT ERROR]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── AUTHENTICATED CUSTOMER AI CHAT ─────────────────────────
// @desc    Personalized AI chat with live user context (orders, points, coupons, wishlist)
// @route   POST /api/v1/support/customer-chat
// @access  Private
router.post('/customer-chat', protect, async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message) {
    return res.status(400).json({ success: false, error: 'Message is required' });
  }
  try {
    // Fetch live user data from DB
    const [userCoupons, userWishlist, userOrders] = await Promise.all([
      prisma.coupon.findMany({ where: { userId: req.user.id, isRedeemed: false } }),
      prisma.wishlistItem.findMany({ where: { userId: req.user.id }, include: { product: true } }),
      prisma.order.findMany({
        where: { userId: req.user.id },
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    const userContext = `Customer Profile (Live Data):
- Name: ${req.user.name}
- Email: ${req.user.email}
- Loyalty Points: ${req.user.points ?? 0} PTS
- Unredeemed Coupons: ${userCoupons.length ? userCoupons.map(c => `${c.code} (${c.discountPercent}% off)`).join(', ') : 'None'}
- Wishlist: ${userWishlist.length ? userWishlist.map(w => w.product?.name).filter(Boolean).join(', ') : 'Empty'}
- Recent Orders:
${userOrders.length
  ? userOrders.map(o =>
      `  • Order #${o.id.slice(0, 8).toUpperCase()} — Status: ${o.status}, Total: ${o.total} DH, Date: ${new Date(o.createdAt).toLocaleDateString('en-GB')}, Items: ${o.items.map(it => `${it.product?.name || 'Unknown'} ×${it.quantity}`).join(', ')}`
    ).join('\n')
  : '  No orders yet.'}`;

    const data = await generateCustomerChat(history, message, userContext);
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[AI CUSTOMER CHAT ERROR]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── ESCALATION EMAIL ─────────────────────────────────────────
// @route   POST /api/v1/support/escalate
router.post('/escalate', async (req, res) => {
  try {
    const { name, email, username, orderNumber, subject, message } = req.body;
    if (!name || !email || !username || !subject || !message) {
      return res.status(400).json({ success: false, error: 'All fields (except order number) are required' });
    }

    const text = `${subject} ${message}`.toLowerCase();
    const highPriorityKeywords = ['double', 'twice', 'charge', 'payment', 'damage', 'broken', 'wrong', 'never arrived', 'missing', 'urgent', 'stolen', 'hack', 'fraud'];
    const priority = highPriorityKeywords.some(kw => text.includes(kw)) ? 'High' : 'Normal';

    const dateStr = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

    await sendEscalatedSupportEmail({ name, email, username, orderNumber: orderNumber || '', subject, message, date: dateStr, priority });
    res.status(200).json({ success: true, message: 'Escalation ticket generated and transmitted.' });
  } catch (err) {
    console.error('[ESCALATION ROUTE ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to process escalation request' });
  }
});

// ── CUSTOMER SUPPORT TICKETS ────────────────────────────────
router.post('/tickets', protect, createTicket);
router.get('/tickets', protect, getMyTickets);
router.get('/tickets/:id', protect, getTicketById);
router.post('/tickets/:id/messages', protect, addCustomerMessage);
router.post('/tickets/:id/rating', protect, submitRating);

export default router;