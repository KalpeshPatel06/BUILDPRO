import { Request, Response } from 'express';
import { pool } from '../config/database';

export const getDashboardStats = async (_req: Request, res: Response) => {
  try {
    const [orders, revenue, pendingOrders, lowStock, monthlyGrowth] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM orders'),
      pool.query("SELECT COALESCE(SUM(revenue),0) as total FROM sales WHERE sale_date >= DATE_TRUNC('month', NOW())"),
      pool.query("SELECT COUNT(*) FROM orders WHERE status='pending'"),
      pool.query('SELECT COUNT(*) FROM inventory WHERE current_stock <= low_stock_threshold'),
      pool.query(`
        SELECT
          ROUND(((curr.revenue - prev.revenue) / NULLIF(prev.revenue,0)) * 100, 1) as growth
        FROM
          (SELECT COALESCE(SUM(revenue),0) as revenue FROM sales WHERE sale_date >= DATE_TRUNC('month', NOW())) curr,
          (SELECT COALESCE(SUM(revenue),0) as revenue FROM sales WHERE sale_date >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month' AND sale_date < DATE_TRUNC('month', NOW())) prev
      `)
    ]);

    res.json({
      totalOrders: parseInt(orders.rows[0].count),
      monthlyRevenue: parseFloat(revenue.rows[0].total),
      pendingOrders: parseInt(pendingOrders.rows[0].count),
      lowStockCount: parseInt(lowStock.rows[0].count),
      monthlyGrowth: monthlyGrowth.rows[0].growth || 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

export const getRevenueChart = async (req: Request, res: Response) => {
  try {
    const { period = 'monthly', year = new Date().getFullYear() } = req.query;

    let query = '';
    if (period === 'monthly') {
      query = `
        SELECT
          TO_CHAR(sale_date, 'Mon') as label,
          EXTRACT(MONTH FROM sale_date) as month_num,
          COALESCE(SUM(revenue),0) as revenue,
          COALESCE(SUM(quantity),0) as units
        FROM sales
        WHERE EXTRACT(YEAR FROM sale_date) = $1
        GROUP BY label, month_num
        ORDER BY month_num
      `;
    } else if (period === 'weekly') {
      query = `
        SELECT
          'Week ' || EXTRACT(WEEK FROM sale_date) as label,
          EXTRACT(WEEK FROM sale_date) as week_num,
          COALESCE(SUM(revenue),0) as revenue,
          COALESCE(SUM(quantity),0) as units
        FROM sales
        WHERE sale_date >= NOW() - INTERVAL '12 weeks'
        GROUP BY label, week_num
        ORDER BY week_num
      `;
    }

    const { rows } = await pool.query(query, period === 'monthly' ? [year] : []);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch revenue chart' });
  }
};

export const getProductPerformance = async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        p.name, p.slug,
        COALESCE(SUM(s.quantity),0) as total_units,
        COALESCE(SUM(s.revenue),0) as total_revenue,
        COALESCE(SUM(s.quantity) FILTER (WHERE s.sale_date >= DATE_TRUNC('month', NOW())),0) as this_month_units,
        COUNT(DISTINCT o.id) as total_orders
      FROM products p
      LEFT JOIN sales s ON s.product_id = p.id
      LEFT JOIN orders o ON o.product_id = p.id AND o.status = 'delivered'
      GROUP BY p.id, p.name, p.slug
      ORDER BY total_revenue DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product performance' });
  }
};

export const getOrderStatusBreakdown = async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT status, COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as percentage
      FROM orders
      GROUP BY status
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order breakdown' });
  }
};

export const getSalesByProduct = async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.name, p.slug,
        COALESCE(SUM(s.revenue),0) as revenue,
        ROUND(SUM(s.revenue) * 100.0 / NULLIF(SUM(SUM(s.revenue)) OVER (), 0), 1) as percentage
      FROM products p
      LEFT JOIN sales s ON s.product_id = p.id
      WHERE s.sale_date >= DATE_TRUNC('month', NOW())
      GROUP BY p.id, p.name, p.slug
      ORDER BY revenue DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sales by product' });
  }
};
