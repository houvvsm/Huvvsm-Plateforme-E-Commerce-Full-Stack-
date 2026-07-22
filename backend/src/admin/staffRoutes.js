import express from 'express';
import {
  getStaffStats,
  getAllStaff,
  createStaff,
  updateStaff,
  setStaffStatus,
  getStaffAuditLog
} from './staffController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Every route below is OWNER-only. ADMIN never passes this gate,
// so ADMIN users cannot create, edit, or deactivate staff — and the
// Staff Management page is unreachable at the API level even if a
// determined Admin bypasses the frontend nav hiding.
router.use(protect);
router.use(authorize('OWNER'));

router.get('/stats',       getStaffStats);     // ← Staff statistics
router.get('/audit',       getStaffAuditLog);  // ← Audit log
router.get('/',            getAllStaff);
router.post('/',           createStaff);
router.patch('/:id',       updateStaff);
router.patch('/:id/status', setStaffStatus);

export default router;
