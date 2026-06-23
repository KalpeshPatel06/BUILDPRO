import { Request, Response } from 'express';
import { pool } from '../config/database';

export const getAllProducts = async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.*, i.current_stock, i.max_capacity, i.low_stock_threshold, i.avg_monthly_sales
      FROM products p
      LEFT JOIN inventory i ON i.product_id = p.id
      WHERE p.is_active = true
      ORDER BY p.id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

export const getProduct = async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.*, i.current_stock, i.max_capacity, i.low_stock_threshold
      FROM products p
      LEFT JOIN inventory i ON i.product_id = p.id
      WHERE p.slug = $1 AND p.is_active = true
    `, [req.params.slug]);
    if (!rows.length) return res.status(404).json({ error: 'Product not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { name, description, price_per_unit, specifications } = req.body;
    const { rows } = await pool.query(`
      UPDATE products SET name=$1, description=$2, price_per_unit=$3, specifications=$4, updated_at=NOW()
      WHERE id=$5 RETURNING *
    `, [name, description, price_per_unit, JSON.stringify(specifications), req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update product' });
  }
};
