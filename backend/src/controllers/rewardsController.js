import { prisma } from '../config/db.js';

// Helper to generate a unique high-aesthetic coupon code: e.g. HUV-REV-XXXXXX
function generateCouponCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'HUV-REV-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// @desc    Process points additions and auto-generate coupons recursively when thresholds are met
// @access  Internal Helper
export const processRewards = async (tx, userId, pointsEarned) => {
  // 1. Fetch user to get current points
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { points: true }
  });

  const currentPoints = user.points;
  
  // 2. Fetch all reward thresholds, ordered by pointsNeeded desc
  const thresholds = await tx.rewardThreshold.findMany({
    orderBy: { pointsNeeded: 'desc' }
  });

  if (thresholds.length === 0) return;

  let tempPoints = currentPoints;
  const couponsToCreate = [];
  const historyToCreate = [];

  // Check thresholds recursively/repetitively if user points exceed the needed points
  let thresholdMet = true;
  while (thresholdMet) {
    // Find the highest threshold that user points can currently afford
    const eligibleThreshold = thresholds.find(t => tempPoints >= t.pointsNeeded);
    
    if (eligibleThreshold) {
      // Deduct points
      tempPoints -= eligibleThreshold.pointsNeeded;
      
      const couponCode = generateCouponCode();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30-day coupon validity

      couponsToCreate.push({
        code: couponCode,
        discountPercent: eligibleThreshold.discountPercent,
        userId,
        expiresAt
      });

      historyToCreate.push({
        userId,
        points: -eligibleThreshold.pointsNeeded,
        description: `Automated conversion of ${eligibleThreshold.pointsNeeded} points for ${eligibleThreshold.discountPercent}% Reward Coupon: ${couponCode}`
      });
    } else {
      thresholdMet = false;
    }
  }

  // 3. If any coupons were generated, apply modifications
  const createdCoupons = [];
  if (couponsToCreate.length > 0) {
    // Update user points balance
    await tx.user.update({
      where: { id: userId },
      data: { points: tempPoints }
    });

    // Create coupons and collect the returned records (they have the generated id)
    for (const c of couponsToCreate) {
      const created = await tx.coupon.create({ data: c });
      createdCoupons.push(created);
    }

    // Create history records
    for (const h of historyToCreate) {
      await tx.rewardHistory.create({ data: h });
    }
  }

  return { couponsCreated: createdCoupons };
};

// @desc    Get current user's rewards state
// @route   GET /api/v1/rewards/my
// @access  Private
export const getMyRewards = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch user points
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { points: true }
    });

    // Fetch available/active coupons
    const coupons = await prisma.coupon.findMany({
      where: {
        userId,
        isRedeemed: false,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Fetch reward transaction history
    const history = await prisma.rewardHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    // Fetch configured thresholds to compute progress to next reward
    const thresholds = await prisma.rewardThreshold.findMany({
      orderBy: { pointsNeeded: 'asc' }
    });

    // Find next closest threshold
    let nextThreshold = null;
    let progressPercent = 0;
    if (thresholds.length > 0) {
      const next = thresholds.find(t => user.points < t.pointsNeeded);
      if (next) {
        nextThreshold = next;
        progressPercent = Math.min(Math.floor((user.points / next.pointsNeeded) * 100), 100);
      } else {
        // Passed all thresholds, default progress to 100% using highest threshold
        const highest = thresholds[thresholds.length - 1];
        nextThreshold = highest;
        progressPercent = 100;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        points: user.points,
        nextThreshold,
        progressPercent,
        coupons,
        history
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get admin rewards configuration & analytics dashboard data
// @route   GET /api/v1/admin/rewards
// @access  Private/Admin
export const getAdminRewardsDashboard = async (req, res) => {
  try {
    // 1. Scalar Statistics
    const totalPointsDistributedAgg = await prisma.rewardHistory.aggregate({
      _sum: { points: true },
      where: { points: { gt: 0 } } // only earned points
    });
    const totalPointsDistributed = totalPointsDistributedAgg._sum.points || 0;

    const [activeCouponsCount, redeemedCouponsCount] = await Promise.all([
      prisma.coupon.count({ where: { isRedeemed: false, expiresAt: { gt: new Date() } } }),
      prisma.coupon.count({ where: { isRedeemed: true } })
    ]);

    // 2. Fetch Rules Config & Thresholds
    let config = await prisma.rewardsConfig.findFirst();
    if (!config) {
      config = await prisma.rewardsConfig.create({
        data: { id: 'default', dhPerPoint: 10 }
      });
    }

    const thresholds = await prisma.rewardThreshold.findMany({
      orderBy: { pointsNeeded: 'asc' }
    });

    // 3. View Generated/Redeemed Coupons Logs
    const coupons = await prisma.coupon.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        order: { select: { id: true, total: true } }
      }
    });

    // 4. Top Loyal Customers (by points earned or current points)
    // We'll fetch top 10 users by points desc
    const topCustomers = await prisma.user.findMany({
      where: { role: 'USER' },
      take: 10,
      orderBy: { points: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        points: true,
        createdAt: true
      }
    });

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalPointsDistributed,
          activeCouponsCount,
          redeemedCouponsCount
        },
        config,
        thresholds,
        coupons,
        topCustomers
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Update reward configuration rules
// @route   POST /api/v1/admin/rewards/config
// @access  Private/Admin
export const updateRewardsConfig = async (req, res) => {
  try {
    const { dhPerPoint } = req.body;
    if (!dhPerPoint || dhPerPoint <= 0) {
      return res.status(400).json({ success: false, error: 'Conversion rate must be greater than 0' });
    }

    const config = await prisma.rewardsConfig.upsert({
      where: { id: 'default' },
      update: { dhPerPoint: parseInt(dhPerPoint) },
      create: { id: 'default', dhPerPoint: parseInt(dhPerPoint) }
    });

    res.status(200).json({ success: true, data: config });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Upsert a reward threshold rule
// @route   POST /api/v1/admin/rewards/thresholds
// @access  Private/Admin
export const upsertRewardThreshold = async (req, res) => {
  try {
    const { pointsNeeded, discountPercent } = req.body;

    if (!pointsNeeded || pointsNeeded <= 0) {
      return res.status(400).json({ success: false, error: 'Points needed must be greater than 0' });
    }
    if (!discountPercent || discountPercent <= 0 || discountPercent > 100) {
      return res.status(400).json({ success: false, error: 'Discount percent must be between 1 and 100' });
    }

    const threshold = await prisma.rewardThreshold.upsert({
      where: { pointsNeeded: parseInt(pointsNeeded) },
      update: { discountPercent: parseFloat(discountPercent) },
      create: {
        pointsNeeded: parseInt(pointsNeeded),
        discountPercent: parseFloat(discountPercent)
      }
    });

    res.status(200).json({ success: true, data: threshold });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Delete a reward threshold rule
// @route   DELETE /api/v1/admin/rewards/thresholds/:id
// @access  Private/Admin
export const deleteRewardThreshold = async (req, res) => {
  try {
    await prisma.rewardThreshold.delete({
      where: { id: req.params.id }
    });
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
