import { prisma } from '../config/db.js';
import { sendOrderConfirmation, sendOrderDelivered, sendRewardCouponEarned } from '../config/email.js';
import { processRewards } from './rewardsController.js';

// @desc    Get logged-in user's orders
// @route   GET /api/v1/orders
// @access  Private
export const getMyOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { product: true } }
      }
    });
    res.status(200).json({ success: true, data: orders });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

export const createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { couponId } = req.body;

    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: { product: true }
    });

    if (cartItems.length === 0) {
      return res.status(400).json({ success: false, error: 'Cart is empty' });
    }

    const total = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
    let discount = 0;

    // ── ATOMIC TRANSACTION: re-validate stock + decrement + create order ──
    const order = await prisma.$transaction(async (tx) => {
      // Validate coupon if provided
      if (couponId) {
        const coupon = await tx.coupon.findUnique({
          where: { id: couponId }
        });
        if (!coupon || coupon.userId !== userId || coupon.isRedeemed || coupon.expiresAt < new Date()) {
          throw new Error('Invalid, expired, or already redeemed coupon.');
        }
        discount = total * (coupon.discountPercent / 100);
      }

      for (const item of cartItems) {
        const result = await tx.product.updateMany({
          where: {
            id: item.productId,
            stock: { gte: item.quantity }   // only decrement if enough stock remains
          },
          data: {
            stock: { decrement: item.quantity }
          }
        });

        if (result.count === 0) {
          const current = await tx.product.findUnique({ where: { id: item.productId } });
          const available = current ? current.stock : 0;
          throw new Error(
            available > 0
              ? `Only ${available} unit(s) of "${item.product.name}" left — please update your cart`
              : `"${item.product.name}" just went out of stock — please remove it from your cart`
          );
        }
      }

      const finalTotal = Math.max(0, total - discount);

      const newOrder = await tx.order.create({
        data: {
          userId,
          total: finalTotal,
          discount,
          couponId: couponId || undefined,
          items: {
            create: cartItems.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              size: item.size,
              price: item.product.price
            }))
          }
        },
        include: {
          items: { include: { product: true } }
        }
      });

      // Mark coupon as redeemed
      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: {
            isRedeemed: true,
            redeemedAt: new Date()
          }
        });
      }

      await tx.cartItem.deleteMany({ where: { userId } });

      return newOrder;
    });


    // Send confirmation email (non-blocking)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true }
    });

    if (user?.email) {
      sendOrderConfirmation(order, user).catch(err => {
        console.error('[EMAIL ERROR] Failed to send order confirmation:', err.message);
      });
    }

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    console.error('[ORDER_ERROR]', err.message);
    // Stock conflicts are user-facing 409s, everything else is a generic 400
    const isStockConflict = err.message.includes('left') || err.message.includes('out of stock');
    res.status(isStockConflict ? 409 : 400).json({ success: false, error: err.message });
  }
};

// @desc    Get all orders (admin)
// @route   GET /api/v1/orders/admin
// @access  Private/Admin
export const getAllOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: { include: { product: true } }
      }
    });
    res.status(200).json({ success: true, data: orders });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Update order status (admin)
// @route   PATCH /api/v1/orders/:id/status
// @access  Private/Admin
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;

    let rewardsResult = null; // will capture returned coupons when DELIVERED

    const order = await prisma.$transaction(async (tx) => {
      // 1. Fetch current order state
      const currentOrder = await tx.order.findUnique({
        where: { id: orderId }
      });

      if (!currentOrder) {
        throw new Error('Order not found');
      }

      // If status is unchanged, just return
      if (currentOrder.status === status) {
        return currentOrder;
      }

      // 2. Determine points adjustments
      let pointsAwarded = currentOrder.pointsAwarded;
      
      // Load config for points rate
      let config = await tx.rewardsConfig.findFirst();
      const dhPerPoint = config ? config.dhPerPoint : 10;
      
      // Calculate points
      const pointsToAward = Math.floor(currentOrder.total / dhPerPoint);

      if (status === 'DELIVERED' && !pointsAwarded && pointsToAward > 0) {
        // Award points
        await tx.user.update({
          where: { id: currentOrder.userId },
          data: { points: { increment: pointsToAward } }
        });

        // Add history log
        const shortId = currentOrder.id.slice(0, 8).toUpperCase();
        await tx.rewardHistory.create({
          data: {
            userId: currentOrder.userId,
            points: pointsToAward,
            description: `Points earned from delivered Order #${shortId}`
          }
        });

        pointsAwarded = true;

        // Process reward loops and coupons auto-gen
        // Returns the list of newly generated coupons (empty array if none)
        rewardsResult = await processRewards(tx, currentOrder.userId, pointsToAward);
      } 
      else if (status === 'CANCELLED' && pointsAwarded && pointsToAward > 0) {
        // Reverse points
        const user = await tx.user.findUnique({
          where: { id: currentOrder.userId },
          select: { points: true }
        });
        
        // Deduct points, clamping at 0 minimum
        const newPoints = Math.max(0, user.points - pointsToAward);
        await tx.user.update({
          where: { id: currentOrder.userId },
          data: { points: newPoints }
        });

        // Add history log
        const shortId = currentOrder.id.slice(0, 8).toUpperCase();
        await tx.rewardHistory.create({
          data: {
            userId: currentOrder.userId,
            points: -pointsToAward,
            description: `Points reversed for cancelled/refunded Order #${shortId}`
          }
        });

        pointsAwarded = false;
      }

      // 3. Perform main order update
      return await tx.order.update({
        where: { id: orderId },
        data: {
          status,
          pointsAwarded
        },
        include: { items: { include: { product: true } } }
      });
    });

    // ── AFTER transaction: send delivery emails (non-blocking) ──
    if (status === 'DELIVERED') {
      const customer = await prisma.user.findUnique({
        where: { id: order.userId },
        select: { name: true, email: true }
      });

      if (customer?.email) {
        const pointsEarned = Math.floor(order.total / 10); // approximate for email
        const newCoupons = rewardsResult?.couponsCreated || [];

        // Delivery + points notification
        sendOrderDelivered(order, customer, pointsEarned, newCoupons).catch(err =>
          console.error('[EMAIL ERROR] Delivery email failed:', err.message)
        );

        // If new coupons were generated, also send a dedicated coupon email
        if (newCoupons.length > 0) {
          sendRewardCouponEarned(customer, newCoupons).catch(err =>
            console.error('[EMAIL ERROR] Coupon email failed:', err.message)
          );
        }
      }
    }

    res.status(200).json({ success: true, data: order });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};