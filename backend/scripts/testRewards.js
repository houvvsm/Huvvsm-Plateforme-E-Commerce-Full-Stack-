import { prisma } from '../src/config/db.js';
import bcrypt from 'bcryptjs';
import { processRewards } from '../src/controllers/rewardsController.js';

async function run() {
  console.log('--- STARTING REWARDS ECOSYSTEM VERIFICATION ---');

  const email = 'test-rewards@huvvsm.com';

  // 1. Cleanup old test data
  console.log('Cleaning up existing test data...');
  await prisma.user.deleteMany({ where: { email } });
  await prisma.rewardThreshold.deleteMany();
  await prisma.rewardsConfig.deleteMany();

  // 2. Setup user
  console.log('Creating test customer...');
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('password123', salt);
  const user = await prisma.user.create({
    data: {
      name: 'Test Customer Rewards',
      email,
      password: hashedPassword,
      role: 'USER'
    }
  });

  // 3. Create active rewards configuration & thresholds
  console.log('Configuring conversion rule (10 DH = 1 point)...');
  await prisma.rewardsConfig.create({
    data: { id: 'default', dhPerPoint: 10 }
  });

  console.log('Configuring thresholds: 100pts = 5% off, 250pts = 10% off...');
  await prisma.rewardThreshold.create({ data: { pointsNeeded: 100, discountPercent: 5 } });
  await prisma.rewardThreshold.create({ data: { pointsNeeded: 250, discountPercent: 10 } });

  // 4. Create product & order
  console.log('Creating sample product for order...');
  let product = await prisma.product.findFirst({ where: { name: 'Test Hoodie' } });
  if (!product) {
    product = await prisma.product.create({
      data: {
        name: 'Test Hoodie',
        description: 'Cinematic Void Signal Specimen',
        price: 1200,
        category: 'huvvsm',
        stock: 50
      }
    });
  }

  console.log('Creating order with total 1200 DH...');
  const order = await prisma.order.create({
    data: {
      userId: user.id,
      total: 1200,
      items: {
        create: {
          productId: product.id,
          quantity: 1,
          size: 'M',
          price: 1200
        }
      }
    }
  });

  // 5. Simulate status change to DELIVERED
  console.log('Transitioning order status to DELIVERED...');
  // Using updateOrderStatus logic manually
  const updatedOrder = await prisma.$transaction(async (tx) => {
    // Check config
    const config = await tx.rewardsConfig.findFirst();
    const pointsToAward = Math.floor(order.total / config.dhPerPoint); // 1200 / 10 = 120 pts

    // Award points to user
    await tx.user.update({
      where: { id: user.id },
      data: { points: { increment: pointsToAward } }
    });

    await tx.rewardHistory.create({
      data: {
        userId: user.id,
        points: pointsToAward,
        description: `Points earned from delivered Order #${order.id.slice(0, 8).toUpperCase()}`
      }
    });

    // Run reward loop & auto coupon generator
    await processRewards(tx, user.id, pointsToAward);

    return await tx.order.update({
      where: { id: order.id },
      data: { status: 'DELIVERED', pointsAwarded: true }
    });
  });

  console.log('Order status updated. Checking user points & auto-coupons...');
  const checkUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { points: true }
  });
  console.log(`Current Points Balance (expected 20): ${checkUser.points} PTS`);

  const userCoupons = await prisma.coupon.findMany({
    where: { userId: user.id }
  });
  console.log(`Generated Coupons Count (expected 1): ${userCoupons.length}`);
  if (userCoupons.length > 0) {
    console.log(`Coupon Code: ${userCoupons[0].code}, Discount: ${userCoupons[0].discountPercent}%`);
  }

  const userHistory = await prisma.rewardHistory.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'asc' }
  });
  console.log('Transaction logs:');
  userHistory.forEach((h, index) => {
    console.log(`  [${index + 1}] Points: ${h.points} | Desc: ${h.description}`);
  });

  // 6. Test Checkout Coupon Application
  console.log('\nTesting checkout coupon usage...');
  const coupon = userCoupons[0];
  const orderSubtotal = 1000;
  const discountPercent = coupon.discountPercent;
  const couponDiscount = orderSubtotal * (discountPercent / 100);
  const finalTotal = Math.max(0, orderSubtotal - couponDiscount);

  console.log(`Applying coupon ${coupon.code} at checkout. Subtotal: ${orderSubtotal} DH. Discount: ${couponDiscount} DH. Expected final total: ${finalTotal} DH`);

  const checkoutOrder = await prisma.order.create({
    data: {
      userId: user.id,
      total: finalTotal,
      discount: couponDiscount,
      couponId: coupon.id,
      items: {
        create: {
          productId: product.id,
          quantity: 1,
          size: 'M',
          price: 1000
        }
      }
    }
  });

  await prisma.coupon.update({
    where: { id: coupon.id },
    data: { isRedeemed: true, redeemedAt: new Date() }
  });

  console.log(`Checkout order completed. Discount of ${checkoutOrder.discount} DH registered successfully.`);

  const checkedCoupon = await prisma.coupon.findUnique({ where: { id: coupon.id } });
  console.log(`Coupon isRedeemed status (expected true): ${checkedCoupon.isRedeemed}`);

  // 7. Test points cancellation/reversal logic
  console.log('\nTesting order cancellation points reversal...');
  await prisma.$transaction(async (tx) => {
    const currentOrder = await tx.order.findUnique({ where: { id: order.id } });
    const pointsToAward = Math.floor(currentOrder.total / 10); // 120 points
    
    // Deduct points from user
    const checkPointsUser = await tx.user.findUnique({ where: { id: user.id } });
    const newPoints = Math.max(0, checkPointsUser.points - pointsToAward); // 20 - 120 = 0 PTS
    await tx.user.update({
      where: { id: user.id },
      data: { points: newPoints }
    });

    await tx.rewardHistory.create({
      data: {
        userId: user.id,
        points: -pointsToAward,
        description: `Points reversed for cancelled/refunded Order #${order.id.slice(0, 8).toUpperCase()}`
      }
    });

    await tx.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED', pointsAwarded: false }
    });
  });

  const finalCheckUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { points: true }
  });
  console.log(`Final user points balance (expected 0): ${finalCheckUser.points} PTS`);

  const finalHistory = await prisma.rewardHistory.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'asc' }
  });
  console.log('Final Transaction logs:');
  finalHistory.forEach((h, index) => {
    console.log(`  [${index + 1}] Points: ${h.points} | Desc: ${h.description}`);
  });

  console.log('--- REWARDS ECOSYSTEM VERIFICATION COMPLETE ---');
}

run()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Test script failed:', err);
    process.exit(1);
  });
