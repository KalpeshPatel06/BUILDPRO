import { Router } from 'express';
import { getNotifications, markNotificationRead } from '../controllers/reportController';
import { authenticate, requireAdmin } from '../middleware/auth';
const router = Router();
router.get('/', authenticate, requireAdmin, getNotifications);
router.patch('/:id/read', authenticate, requireAdmin, markNotificationRead);
export default router;
