const express = require('express');
const { query } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/inventory
router.get('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT p.id, p.name, p.slug, p.unit, p.price_per_unit,
             i.current_stock, i.max_capacity, i.low_stock_threshold, i.reorder_quantity,
             i.last_restocked_at, i.updated_at,
             ROUND((i.current_stock::decimal / NULLIF(i.max_capacity,0)) * 100, 1) as stock_percentage,
             CASE
               WHEN i.current_stock = 0 THEN 'out_of_stock'
               WHEN i.current_stock <= i.low_stock_threshold THEN 'low_stock'
               ELSE 'in_stock'
             END as status,
             COALESCE((
               SELECT SUM(s.quantity)
               FROM sales s
               WHERE s.product_id = p.id AND s.sale_date >= CURRENT_DATE - INTERVAL '30 days'
             ), 0) as monthly_sales,
             CASE
               WHEN COALESCE((SELECT SUM(s.quantity)/30.0 FROM sales s WHERE s.product_id = p.id AND s.sale_date >= CURRENT_DATE - INTERVAL '90 days'), 0) > 0
               THEN ROUND(i.current_stock / (SELECT SUM(s.quantity)/30.0 FROM sales s WHERE s.product_id = p.id AND s.sale_date >= CURRENT_DATE - INTERVAL '90 days'))
               ELSE NULL
             END as days_until_stockout
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      WHERE p.is_active = true
      ORDER BY p.name
    `);
    res.json({ inventory: result.rows });
  } catch (err) { next(err); }
});

// PATCH /api/inventory/:product_id/restock
router.patch('/:product_id/restock', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { quantity, notes } = req.body;
    if (!quantity || quantity <= 0) return res.status(400).json({ error: 'Valid quantity required' });

    const before = await query('SELECT current_stock FROM inventory WHERE product_id = $1', [req.params.product_id]);
    if (!before.rows[0]) return res.status(404).json({ error: 'Inventory record not found' });

    const stock_before = before.rows[0].current_stock;
    const result = await query(`
      UPDATE inventory SET current_stock = current_stock + $1, last_restocked_at = NOW()
      WHERE product_id = $2 RETURNING *
    `, [quantity, req.params.product_id]);

    await query(`
      INSERT INTO inventory_logs (product_id, action, quantity_change, stock_before, stock_after, notes, performed_by)
      VALUES ($1,'restock',$2,$3,$4,$5,$6)
    `, [req.params.product_id, quantity, stock_before, stock_before + quantity, notes, req.user.id]);

    res.json({ inventory: result.rows[0] });
  } catch (err) { next(err); }
});

// PATCH /api/inventory/:product_id/adjust
router.patch('/:product_id/adjust', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { new_stock, notes } = req.body;
    if (new_stock === undefined || new_stock < 0) return res.status(400).json({ error: 'Valid stock level required' });

    const before = await query('SELECT current_stock FROM inventory WHERE product_id = $1', [req.params.product_id]);
    if (!before.rows[0]) return res.status(404).json({ error: 'Inventory record not found' });

    const stock_before = before.rows[0].current_stock;
    const result = await query(
      'UPDATE inventory SET current_stock = $1 WHERE product_id = $2 RETURNING *',
      [new_stock, req.params.product_id]
    );

    await query(`
      INSERT INTO inventory_logs (product_id, action, quantity_change, stock_before, stock_after, notes, performed_by)
      VALUES ($1,'adjustment',$2,$3,$4,$5,$6)
    `, [req.params.product_id, new_stock - stock_before, stock_before, new_stock, notes, req.user.id]);

    res.json({ inventory: result.rows[0] });
  } catch (err) { next(err); }
});

// GET /api/inventory/alerts
router.get('/alerts', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT p.name, p.slug, i.current_stock, i.low_stock_threshold, i.reorder_quantity,
        CASE WHEN i.current_stock = 0 THEN 'out_of_stock' ELSE 'low_stock' END as alert_type
      FROM products p
      JOIN inventory i ON p.id = i.product_id
      WHERE i.current_stock <= i.low_stock_threshold AND p.is_active = true
      ORDER BY i.current_stock ASC
    `);
    res.json({ alerts: result.rows });
  } catch (err) { next(err); }
});

module.exports = router;
