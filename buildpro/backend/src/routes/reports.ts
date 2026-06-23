import { Router } from 'express';
import { generateExcelReport } from '../controllers/reportController';
import { authenticate, requireAdmin } from '../middleware/auth';
const router = Router();
router.get('/excel', authenticate, requireAdmin, generateExcelReport);
export default router;
