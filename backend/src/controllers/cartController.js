import { prisma } from '../config/db.js';

// @desc    Get user cart
// @route   GET /api/v1/cart
// @access  Private
export const getCart = async (req, res) => {
  try {
    const cartItems = await prisma.cartItem.findMany({
      where: { userId: req.user.id },
      include: { product: true }
    });
    res.status(200).json({ success: true, data: cartItems });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Add item to cart or update quantity
// @route   POST /api/v1/cart
// @access  Private
export const addToCart = async (req, res) => {
  try {
    const { productId, quantity, size } = req.body;
    const userId = req.user.id;
    const requestedQty = quantity || 1;

    // ── STOCK VALIDATION ──
    const product = await prisma.product.findUnique({ where: { id: productId } });

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    if (product.stock <= 0) {
      return res.status(400).json({ success: false, error: `${product.name} is out of stock` });
    }

    const existingItem = await prisma.cartItem.findUnique({
      where: {
        userId_productId_size: { userId, productId, size }
      }
    });

    const currentQtyInCart = existingItem ? existingItem.quantity : 0;
    const totalRequestedQty = currentQtyInCart + requestedQty;

    if (totalRequestedQty > product.stock) {
      const available = product.stock - currentQtyInCart;
      return res.status(400).json({
        success: false,
        error: available > 0
          ? `Only ${available} more unit(s) of ${product.name} available`
          : `You already have the maximum available stock of ${product.name} in your cart`
      });
    }

    let cartItem;
    if (existingItem) {
      cartItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: { increment: requestedQty } },
        include: { product: true }
      });
    } else {
      cartItem = await prisma.cartItem.create({
        data: { userId, productId, quantity: requestedQty, size },
        include: { product: true }
      });
    }

    res.status(200).json({ success: true, data: cartItem });
  } catch (err) {
    console.error('[CART_ERROR]', err);
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/v1/cart/:id
// @access  Private
export const removeFromCart = async (req, res) => {
  try {
    await prisma.cartItem.delete({
      where: { id: req.params.id }
    });
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Clear cart
// @route   DELETE /api/v1/cart
// @access  Private
export const clearCart = async (req, res) => {
  try {
    await prisma.cartItem.deleteMany({
      where: { userId: req.user.id }
    });
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};