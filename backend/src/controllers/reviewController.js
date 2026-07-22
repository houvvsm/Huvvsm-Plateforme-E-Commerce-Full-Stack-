import { prisma } from '../config/db.js';

// @desc    Get latest reviews (site-wide, for homepage feed)
// @route   GET /api/v1/reviews
// @access  Public
export const getAllReviews = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { name: true } },
        product: { select: { name: true, images: true } }
      }
    });
    res.status(200).json({ success: true, data: reviews });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get reviews for a single product
// @route   GET /api/v1/products/:productId/reviews
// @access  Public
export const getProductReviews = async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { productId: req.params.productId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true } } }
    });
    res.status(200).json({ success: true, data: reviews });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Create a review (verified purchase only)
// @route   POST /api/v1/products/:productId/reviews
// @access  Private
export const createReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5' });
    }

    // Verified purchase check — user must have a DELIVERED (or any) order containing this product
    const hasPurchased = await prisma.orderItem.findFirst({
      where: {
        productId,
        order: { userId }
      }
    });

    if (!hasPurchased) {
      return res.status(403).json({ success: false, error: 'You can only review products you have purchased' });
    }

    // One review per user per product
    const existing = await prisma.review.findUnique({
      where: { userId_productId: { userId, productId } }
    });
    if (existing) {
      return res.status(400).json({ success: false, error: 'You have already reviewed this product' });
    }

    const review = await prisma.review.create({
      data: {
        userId,
        productId,
        rating: parseInt(rating),
        comment
      },
      include: {
        user: { select: { name: true } },
        product: { select: { name: true, images: true } }
      }
    });

    res.status(201).json({ success: true, data: review });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
/* ============================================================ */
/* ADD THESE TO YOUR EXISTING reviewController.js               */
/* ============================================================ */

// @desc    Get ALL reviews (admin moderation)
// @route   GET /api/v1/admin/reviews
// @access  Private/Admin
export const getAllReviewsAdmin = async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        product: { select: { id: true, name: true, images: true } }
      }
    });
    res.status(200).json({ success: true, data: reviews });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Delete a review (admin moderation)
// @route   DELETE /api/v1/admin/reviews/:id
// @access  Private/Admin
export const deleteReviewAdmin = async (req, res) => {
  try {
    await prisma.review.delete({
      where: { id: req.params.id }
    });
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};