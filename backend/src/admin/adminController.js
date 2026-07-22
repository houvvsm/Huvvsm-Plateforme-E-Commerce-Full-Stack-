import { prisma } from '../config/db.js';
import { generateAdminChat } from '../services/aiService.js';

// @desc    Get system dashboard stats
// @route   GET /api/v1/admin/stats
// @access  Private/Admin
export const getStats = async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalProducts = await prisma.product.count();
    const totalCartItems = await prisma.cartItem.count();
    const totalOrders = await prisma.order.count();
    const pendingOrders = await prisma.order.count({ where: { status: 'PENDING' } });
    const totalReviews = await prisma.review.count();

    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    });

    res.status(200).json({
      success: true,
      data: {
        counts: {
          users: totalUsers,
          products: totalProducts,
          cartActivity: totalCartItems,
          orders: totalOrders,
          pendingOrders,
          reviews: totalReviews
        },
        recentUsers
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get all users
// @route   GET /api/v1/admin/users
// @access  Private/Admin
export const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    });
    res.status(200).json({ success: true, data: users });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Update user role
// @route   PATCH /api/v1/admin/users/:id/role
// @access  Private/Admin
export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (role === 'OWNER') {
      return res.status(403).json({ success: false, error: 'Cannot assign the OWNER role' });
    }
    if (role === 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Admin accounts can only be created via Staff Management' });
    }

    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    if (target.role === 'OWNER') {
      return res.status(403).json({ success: false, error: 'The OWNER account cannot be modified' });
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, name: true, role: true }
    });
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/v1/admin/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res) => {
  try {
    if (req.user.id === req.params.id) {
      return res.status(400).json({ success: false, error: 'Self-termination not allowed' });
    }

    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    if (target.role !== 'USER') {
      return res.status(403).json({
        success: false,
        error: 'Only customer accounts can be deleted here. Staff accounts are managed via Staff Management.'
      });
    }

    await prisma.user.delete({ where: { id: req.params.id } });
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// ============================================================
// @desc    Get full business analytics for COMMAND_CENTER
// @route   GET /api/v1/admin/command-center
// @access  Private/Admin
// ============================================================
export const getCommandCenter = async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
    const endOfYear   = new Date(`${year}-12-31T23:59:59.999Z`);

    // ── Scalar counts ──────────────────────────────────────────
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      pendingOrders,
      lowStockProducts,
      outOfStockProducts
    ] = await Promise.all([
      prisma.user.count(),
      prisma.product.count(),
      prisma.order.count(),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.product.count({ where: { stock: { gt: 0, lt: 5 } } }),
      prisma.product.count({ where: { stock: 0 } })
    ]);

    // ── Total revenue (exclude CANCELLED) ─────────────────────
    const revenueAgg = await prisma.order.aggregate({
      _sum: { total: true },
      where: { status: { not: 'CANCELLED' } }
    });
    const totalRevenue = revenueAgg._sum.total || 0;

    // ── Average rating ────────────────────────────────────────
    const ratingAgg = await prisma.review.aggregate({ _avg: { rating: true } });
    const avgRating  = ratingAgg._avg.rating
      ? parseFloat(ratingAgg._avg.rating.toFixed(1))
      : 0;

    // ── Monthly breakdown (current year, JS aggregation) ──────
    // Fetching only the fields we need keeps the payload light.
    const ordersThisYear = await prisma.order.findMany({
      where: { createdAt: { gte: startOfYear, lte: endOfYear } },
      select: { total: true, status: true, createdAt: true }
    });

    const revenueByMonth = Array(12).fill(0);
    const ordersByMonth  = Array(12).fill(0);

    ordersThisYear.forEach(o => {
      const m = new Date(o.createdAt).getMonth(); // 0–11
      ordersByMonth[m]++;
      if (o.status !== 'CANCELLED') revenueByMonth[m] += Number(o.total);
    });

    // ── Orders by status ──────────────────────────────────────
    const statusGroups = await prisma.order.groupBy({
      by: ['status'],
      _count: { status: true }
    });
    const ordersByStatus = {};
    statusGroups.forEach(g => { ordersByStatus[g.status] = g._count.status; });

    // ── Best-selling products (by units sold across all orders) ─
    const topItems = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5
    });

    const bestSellers = await Promise.all(
      topItems.map(async item => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { name: true }
        });
        return {
          name: product?.name || 'UNKNOWN',
          quantity: item._sum.quantity || 0
        };
      })
    );

    // ── Latest 5 orders ───────────────────────────────────────
    const latestOrders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user:  { select: { name: true, email: true } },
        items: { select: { quantity: true } }
      }
    });

    // ── 5 most recently registered customers ──────────────────
    const recentCustomers = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      where: { role: 'USER' },
      select: { id: true, name: true, email: true, createdAt: true }
    });

    // ── Low/zero stock alerts (ordered by stock ASC, max 8) ───
    const lowStockAlerts = await prisma.product.findMany({
      where: { stock: { lt: 5 } },
      orderBy: { stock: 'asc' },
      take: 8,
      select: { id: true, name: true, stock: true, images: true }
    });

    // Fetch support stats for command center integration
    const [
      openTickets,
      resolvedTickets,
      waitingSupport,
      waitingCustomer,
      csatRatingAgg
    ] = await Promise.all([
      prisma.supportTicket.count({ where: { status: 'OPEN' } }),
      prisma.supportTicket.count({ where: { status: 'RESOLVED' } }),
      prisma.supportTicket.count({ where: { status: 'WAITING_SUPPORT' } }),
      prisma.supportTicket.count({ where: { status: 'WAITING_CUSTOMER' } }),
      prisma.supportTicket.aggregate({ _avg: { rating: true } })
    ]);
    const avgSatisfactionRating = csatRatingAgg._avg.rating ? parseFloat(csatRatingAgg._avg.rating.toFixed(1)) : 0;

    // Calculate response time
    const closedOrRepliedTickets = await prisma.supportTicket.findMany({
      where: {
        messages: {
          some: {
            senderRole: { in: ['ADMIN', 'OWNER'] }
          }
        }
      },
      include: {
        messages: { orderBy: { createdAt: 'asc' } }
      }
    });
    let totalResponseTimeMs = 0;
    let countedTickets = 0;
    closedOrRepliedTickets.forEach(t => {
      const firstCustomerMsg = t.messages.find(m => m.senderRole === 'USER');
      const firstAdminMsg = t.messages.find(m => m.senderRole === 'ADMIN' || m.senderRole === 'OWNER');
      if (firstCustomerMsg && firstAdminMsg) {
        totalResponseTimeMs += (firstAdminMsg.createdAt.getTime() - firstCustomerMsg.createdAt.getTime());
        countedTickets++;
      }
    });
    const avgResponseTimeHours = countedTickets > 0
      ? parseFloat((totalResponseTimeMs / (1000 * 60 * 60 * countedTickets)).toFixed(1))
      : 0;

    res.status(200).json({
      success: true,
      data: {
        counts: {
          totalUsers,
          totalProducts,
          totalOrders,
          pendingOrders,
          lowStockProducts,
          outOfStockProducts
        },
        revenue:          { total: totalRevenue, byMonth: revenueByMonth },
        orders:           { byMonth: ordersByMonth, byStatus: ordersByStatus },
        avgRating,
        bestSellers,
        latestOrders,
        recentCustomers,
        lowStockAlerts,
        supportStats: {
          openTickets,
          resolvedTickets,
          waitingSupport,
          waitingCustomer,
          avgSatisfactionRating,
          avgResponseTimeHours
        }
      }
    });
  } catch (err) {
    console.error('[COMMAND_CENTER_ERROR]', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get support statistics standalone
// @route   GET /api/v1/admin/support/stats
// @access  Private/Admin
export const getSupportStats = async (req, res) => {
  try {
    const [
      openTickets,
      resolvedTickets,
      waitingSupport,
      waitingCustomer,
      ratingAgg
    ] = await Promise.all([
      prisma.supportTicket.count({ where: { status: 'OPEN' } }),
      prisma.supportTicket.count({ where: { status: 'RESOLVED' } }),
      prisma.supportTicket.count({ where: { status: 'WAITING_SUPPORT' } }),
      prisma.supportTicket.count({ where: { status: 'WAITING_CUSTOMER' } }),
      prisma.supportTicket.aggregate({ _avg: { rating: true } })
    ]);
    const avgSatisfactionRating = ratingAgg._avg.rating ? parseFloat(ratingAgg._avg.rating.toFixed(1)) : 0;

    const closedOrRepliedTickets = await prisma.supportTicket.findMany({
      where: {
        messages: {
          some: {
            senderRole: { in: ['ADMIN', 'OWNER'] }
          }
        }
      },
      include: {
        messages: { orderBy: { createdAt: 'asc' } }
      }
    });
    let totalResponseTimeMs = 0;
    let countedTickets = 0;
    closedOrRepliedTickets.forEach(t => {
      const firstCustomerMsg = t.messages.find(m => m.senderRole === 'USER');
      const firstAdminMsg = t.messages.find(m => m.senderRole === 'ADMIN' || m.senderRole === 'OWNER');
      if (firstCustomerMsg && firstAdminMsg) {
        totalResponseTimeMs += (firstAdminMsg.createdAt.getTime() - firstCustomerMsg.createdAt.getTime());
        countedTickets++;
      }
    });
    const avgResponseTimeHours = countedTickets > 0
      ? parseFloat((totalResponseTimeMs / (1000 * 60 * 60 * countedTickets)).toFixed(1))
      : 0;

    res.status(200).json({
      success: true,
      data: {
        openTickets,
        resolvedTickets,
        waitingSupport,
        waitingCustomer,
        avgSatisfactionRating,
        avgResponseTimeHours
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Admin AI Chat endpoint with business and summary support
// @route   POST /api/v1/admin/ai-chat
// @access  Private/Admin
export const adminAiChat = async (req, res) => {
  const { message, history = [] } = req.body;
  try {
    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    // Gather daily business statistics
    const year = new Date().getFullYear();
    const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
    const endOfYear   = new Date(`${year}-12-31T23:59:59.999Z`);
    const today = new Date();
    today.setHours(0,0,0,0);

    const [
      totalUsers,
      totalProducts,
      totalOrders,
      pendingOrders,
      lowStockProducts,
      outOfStockProducts,
      openTickets,
      resolvedTickets,
      waitingSupport,
      waitingCustomer,
      ratingAgg,
      ordersToday,
      ticketsToday,
      newUsersToday,
      pointsToday
    ] = await Promise.all([
      prisma.user.count(),
      prisma.product.count(),
      prisma.order.count(),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.product.count({ where: { stock: { gt: 0, lt: 5 } } }),
      prisma.product.count({ where: { stock: 0 } }),
      prisma.supportTicket.count({ where: { status: 'OPEN' } }),
      prisma.supportTicket.count({ where: { status: 'RESOLVED' } }),
      prisma.supportTicket.count({ where: { status: 'WAITING_SUPPORT' } }),
      prisma.supportTicket.count({ where: { status: 'WAITING_CUSTOMER' } }),
      prisma.supportTicket.aggregate({ _avg: { rating: true } }),
      prisma.order.findMany({
        where: { createdAt: { gte: today } },
        include: { items: { include: { product: true } } }
      }),
      prisma.supportTicket.count({ where: { createdAt: { gte: today } } }),
      prisma.user.count({ where: { role: 'USER', createdAt: { gte: today } } }),
      prisma.rewardHistory.aggregate({
        _sum: { points: true },
        where: { createdAt: { gte: today }, points: { gt: 0 } }
      })
    ]);

    const revenueAgg = await prisma.order.aggregate({
      _sum: { total: true },
      where: { status: { not: 'CANCELLED' } }
    });
    const totalRevenue = revenueAgg._sum.total || 0;
    const avgSatisfactionRating = ratingAgg._avg.rating ? parseFloat(ratingAgg._avg.rating.toFixed(1)) : 0;

    const revenueToday = ordersToday
      .filter(o => o.status !== 'CANCELLED')
      .reduce((acc, o) => acc + o.total, 0);

    // Calculate today's best seller
    const productQuantities = {};
    ordersToday.forEach(o => {
      o.items.forEach(it => {
        if (it.product) {
          productQuantities[it.product.name] = (productQuantities[it.product.name] || 0) + it.quantity;
        }
      });
    });
    let bestSellerToday = 'None';
    let maxQty = 0;
    for (const [name, qty] of Object.entries(productQuantities)) {
      if (qty > maxQty) {
        maxQty = qty;
        bestSellerToday = `${name} (${qty} units)`;
      }
    }

    const lowStockAlerts = await prisma.product.findMany({
      where: { stock: { lt: 5 } },
      orderBy: { stock: 'asc' },
      take: 5,
      select: { name: true, stock: true }
    });

    const businessContext = `
Live HUVVSM Business & Support Platform State:
- Total Registered Customers: ${totalUsers} (New today: ${newUsersToday})
- Total Catalogued Products: ${totalProducts}
- Out of Stock Products: ${outOfStockProducts}
- Low Stock Alerts: ${lowStockAlerts.map(p => `${p.name} (${p.stock} remaining)`).join(', ') || 'None'}
- Total Orders: ${totalOrders} (Pending: ${pendingOrders})
- Cumulative Revenue: ${totalRevenue.toLocaleString()} DH
- Today's Orders: ${ordersToday.length}
- Today's Revenue: ${revenueToday.toLocaleString()} DH
- Today's Best Seller: ${bestSellerToday}
- Loyalty Points Distributed Today: ${pointsToday._sum.points || 0} PTS
- Support Statistics:
  * Open Tickets: ${openTickets}
  * Waiting Support (Admin attention needed): ${waitingSupport}
  * Waiting Customer: ${waitingCustomer}
  * Resolved Tickets: ${resolvedTickets}
  * Created Today: ${ticketsToday}
  * Average CSAT Rating: ${avgSatisfactionRating} / 5
`;

    const responseText = await generateAdminChat(history, message, businessContext);
    res.status(200).json({ success: true, data: { response: responseText } });
  } catch (err) {
    console.error('[ADMIN AI CHAT ERROR]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};