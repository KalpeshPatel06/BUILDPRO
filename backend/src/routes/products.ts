import { Router } from 'express';
import { getAllProducts, getProduct, updateProduct } from '../controllers/productController';
import { authenticate, requireAdmin } from '../middleware/auth';
const router = Router();
router.get('/', getAllProducts);
router.get('/:slug', getProduct);
router.put('/:id', authenticate, requireAdmin, updateProduct);
export default router;
