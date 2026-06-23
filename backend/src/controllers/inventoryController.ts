import { Request, Response } from 'express';
import { pool } from '../config/database';

export const getInventory = async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.id, p.name, p.slug, p.price_per_unit, p.unit,
        i.current_stock, i.max_capacity, i.low_stock_threshold, i.avg_monthly_sales,
        i.last_restocked_at,
        CASE
          WHEN i.current_stock = 0 THEN 'out_of_stock'
          WHEN i.current_stock <= i.low_stock_threshold THEN 'low_stock'
          ELSE 'in_stock'
        END as stock_status,
        CASE
          WHEN i.avg_monthly_sales > 0 THEN
            ROUND((i.current_stock::decimal / i.avg_monthly_sales) * 30)
          ELSE NULL
        END as days_until_depletion,
        GREATEST(i.avg_monthly_sales - i.current_stock, 0) as recommended_reorder
      FROM products p
      LEFT JOIN inventory i ON i.product_id = p.id
      WHERE p.is_active = true
      ORDER BY p.id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
};

export const updateStock = async (req: Request, res: Response) => {
  try {
    const { quantity, type } = req.body; // type: 'add' | 'set'
    const updateQuery = type === 'add'
      ? 'UPDATE inventory SET current_stock = current_stock + $1, last_restocked_at = NOW(), updated_at = NOW() WHERE product_id = $2 RETURNING *'
      : 'UPDATE inventory SET current_stock = $1, last_restocked_at = NOW(), updated_at = NOW() WHERE product_id = $2 RETURNING *';

    const { rows } = await pool.query(updateQuery, [quantity, req.params.productId]);
    if (!rows.length) return res.status(404).json({ error: 'Inventory record not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update stock' });
  }
};

export const getStockAlerts = async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.name, p.slug, i.current_stock, i.low_stock_threshold, i.avg_monthly_sales,
        CASE
          WHEN i.current_stock = 0 THEN 'out_of_stock'
          WHEN i.current_stock <= i.low_stock_threshold THEN 'low_stock'
        END as alert_type
      FROM products p
      JOIN inventory i ON i.product_id = p.id
      WHERE i.current_stock <= i.low_stock_threshold
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
};

export const getForecast = async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        p.name, p.slug, i.current_stock, i.avg_monthly_sales,
        ROUND(i.avg_monthly_sales * 1.1) as next_month_demand,
        GREATEST(ROUND(i.avg_monthly_sales * 1.1) - i.current_stock, 0) as reorder_quantity,
        CASE
          WHEN i.avg_monthly_sales > 0
          THEN (NOW() + ((i.current_stock::decimal / i.avg_monthly_sales * 30) || ' days')::interval)::date
          ELSE NULL
        END as estimated_depletion_date,
        (SELECT SUM(quantity) FROM sales WHERE product_id = p.id AND sale_date >= NOW() - INTERVAL '90 days') as sales_last_90_days
      FROM products p
      JOIN inventory i ON i.product_id = p.id
      WHERE p.is_active = true
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate forecast' });
  }
};
