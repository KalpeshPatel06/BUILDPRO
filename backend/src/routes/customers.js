const express = require('express');
const { query } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [limit, offset];
    let where = '1=1';
    if (search) { where += ` AND (name ILIKE $3 OR email ILIKE $3 OR phone ILIKE $3)`; params.push(`%${search}%`); }
    const result = await query(`SELECT * FROM customers WHERE ${where} ORDER BY total_spent DESC LIMIT $1 OFFSET $2`, params);
    const total = await query(`SELECT COUNT(*) FROM customers WHERE ${where}`, search ? [`%${search}%`] : []);
    res.json({ customers: result.rows, total: parseInt(total.rows[0].count) });
  } catch (err) { next(err); }
});

router.get('/:id/orders', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT o.*, p.name as product_name FROM orders o
      LEFT JOIN products p ON o.product_id = p.id
      WHERE o.customer_id = $1 ORDER BY o.created_at DESC
    `, [req.params.id]);
    res.json({ orders: result.rows });
  } catch (err) { next(err); }
});

module.exports = router;
