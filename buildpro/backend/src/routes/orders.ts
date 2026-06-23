import { Router } from 'express';
import { createOrder, getAllOrders, updateOrderStatus, getOrderById } from '../controllers/orderController';
import { authenticate, requireAdmin } from '../middleware/auth';
const router = Router();
router.post('/', createOrder);
router.get('/', authenticate, requireAdmin, getAllOrders);
router.get('/:id', authenticate, requireAdmin, getOrderById);
router.patch('/:id/status', authenticate, requireAdmin, updateOrderStatus);
export default router;
