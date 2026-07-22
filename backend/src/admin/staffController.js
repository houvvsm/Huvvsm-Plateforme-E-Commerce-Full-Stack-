import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';

const STAFF_SELECT = {
  id: true, name: true, email: true, role: true,
  isActive: true, lastLogin: true, createdAt: true
};

/* ── Audit log helper ────────────────────────────────────────────────────── */
async function logStaffAction(action, owner, target) {
  try {
    await prisma.staffAuditLog.create({
      data: {
        action,
        ownerId:     owner.id,
        ownerName:   owner.name,
        targetId:    target.id,
        targetName:  target.name,
        targetEmail: target.email
      }
    });
  } catch (err) {
    // Logging must never crash the main response
    console.error('[STAFF_AUDIT_LOG_ERROR]', err.message);
  }
}

// @desc    Get staff statistics (total / active / suspended)
// @route   GET /api/v1/staff/stats
// @access  Private/Owner
export const getStaffStats = async (req, res) => {
  try {
    const [total, active] = await Promise.all([
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({ where: { role: 'ADMIN', isActive: true } })
    ]);
    res.status(200).json({
      success: true,
      data: { total, active, suspended: total - active }
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get all staff (ADMIN) accounts
// @route   GET /api/v1/staff
// @access  Private/Owner
export const getAllStaff = async (req, res) => {
  try {
    const staff = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      orderBy: { createdAt: 'desc' },
      select: STAFF_SELECT
    });
    res.status(200).json({ success: true, data: staff });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Create a new Admin (staff) account
// @route   POST /api/v1/staff
// @access  Private/Owner
export const createStaff = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email and password are required' });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return res.status(400).json({ success: false, error: 'A user with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // role is always hardcoded to ADMIN — this is the ONLY path that
    // creates staff accounts, and it can never produce an OWNER.
    const staff = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: 'ADMIN', isActive: true },
      select: STAFF_SELECT
    });

    await logStaffAction('ADMIN_CREATED', req.user, staff);

    res.status(201).json({ success: true, data: staff });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Edit an Admin's name/email
// @route   PATCH /api/v1/staff/:id
// @access  Private/Owner
export const updateStaff = async (req, res) => {
  try {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target || target.role !== 'ADMIN') {
      return res.status(404).json({ success: false, error: 'Staff account not found' });
    }

    const { name, email } = req.body;
    const data = {};
    if (name !== undefined)  data.name = name;
    if (email !== undefined) data.email = email;

    if (data.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email: data.email } });
      if (emailTaken && emailTaken.id !== target.id) {
        return res.status(400).json({ success: false, error: 'Email already in use' });
      }
    }

    const staff = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: STAFF_SELECT
    });

    await logStaffAction('ADMIN_UPDATED', req.user, staff);

    res.status(200).json({ success: true, data: staff });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Activate / deactivate an Admin account
// @route   PATCH /api/v1/staff/:id/status
// @access  Private/Owner
export const setStaffStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ success: false, error: 'isActive must be true or false' });
    }

    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target || target.role !== 'ADMIN') {
      return res.status(404).json({ success: false, error: 'Staff account not found' });
    }

    const staff = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive },
      select: STAFF_SELECT
    });

    const action = isActive ? 'ADMIN_REACTIVATED' : 'ADMIN_SUSPENDED';
    await logStaffAction(action, req.user, staff);

    res.status(200).json({ success: true, data: staff });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get staff audit log (last 50 entries)
// @route   GET /api/v1/staff/audit
// @access  Private/Owner
export const getStaffAuditLog = async (req, res) => {
  try {
    const logs = await prisma.staffAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.status(200).json({ success: true, data: logs });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
