import { Router } from 'express';
import { createAppointment, getAllAppointments, updateAppointment } from '../controllers/appointmentController';
import { authenticate, requireAdmin } from '../middleware/auth';
const router = Router();
router.post('/', createAppointment);
router.get('/', authenticate, requireAdmin, getAllAppointments);
router.patch('/:id', authenticate, requireAdmin, updateAppointment);
export default router;
