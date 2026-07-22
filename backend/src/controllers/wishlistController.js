import { prisma } from '../config/db.js';

// @desc    Get user wishlist
// @route   GET /api/v1/wishlist
// @access  Private
export const getWishlist = async (req, res) => {
  try {
    const items = await prisma.wishlistItem.findMany({
      where: { userId: req.user.id },
      include: { product: true }
    });
    res.status(200).json({ success: true, data: items });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Toggle wishlist item
// @route   POST /api/v1/wishlist/:productId
// @access  Private
export const toggleWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    const existing = await prisma.wishlistItem.findUnique({
      where: {
        userId_productId: {
          userId: req.user.id,
          productId
        }
      }
    });

    if (existing) {
      await prisma.wishlistItem.delete({
        where: { id: existing.id }
      });
      return res.status(200).json({ success: true, message: 'Removed from wishlist' });
    }

    const newItem = await prisma.wishlistItem.create({
      data: {
        userId: req.user.id,
        productId
      }
    });

    res.status(201).json({ success: true, data: newItem });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
