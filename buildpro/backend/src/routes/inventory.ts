import { Router } from 'express';
import { getInventory, updateStock, getStockAlerts, getForecast } from '../controllers/inventoryController';
import { authenticate, requireAdmin } from '../middleware/auth';
const router = Router();
router.get('/', authenticate, requireAdmin, getInventory);
router.get('/alerts', authenticate, requireAdmin, getStockAlerts);
router.get('/forecast', authenticate, requireAdmin, getForecast);
router.patch('/:productId/stock', authenticate, requireAdmin, updateStock);
export default router;
