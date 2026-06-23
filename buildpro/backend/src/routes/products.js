const express = require('express');
const { query } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/products - public
router.get('/', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT p.*, i.current_stock, i.max_capacity, i.low_stock_threshold,
        CASE
          WHEN i.current_stock = 0 THEN 'out_of_stock'
          WHEN i.current_stock <= i.low_stock_threshold THEN 'low_stock'
          ELSE 'in_stock'
        END as stock_status
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      WHERE p.is_active = true
      ORDER BY p.name
    `);
    res.json({ products: result.rows });
  } catch (err) { next(err); }
});

// GET /api/products/:slug - public
router.get('/:slug', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT p.*, i.current_stock, i.max_capacity, i.low_stock_threshold, i.reorder_quantity
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      WHERE p.slug = $1 AND p.is_active = true
    `, [req.params.slug]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Product not found' });
    res.json({ product: result.rows[0] });
  } catch (err) { next(err); }
});

// PUT /api/products/:id - admin
router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, description, price_per_unit, min_order_qty } = req.body;
    const result = await query(`
      UPDATE products SET name=$1, description=$2, price_per_unit=$3, min_order_qty=$4
      WHERE id=$5 RETURNING *
    `, [name, description, price_per_unit, min_order_qty, req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Product not found' });
    res.json({ product: result.rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
