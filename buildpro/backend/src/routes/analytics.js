const express = require('express');
const { query } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/analytics/dashboard
router.get('/dashboard', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const [revenue, orders, products, monthlyRev, productPerf, orderStatus] = await Promise.all([
      query(`SELECT COALESCE(SUM(total_amount),0) as total, COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN total_amount END),0) as this_month FROM orders WHERE status='delivered'`),
      query(`SELECT COUNT(*) as total, COUNT(CASE WHEN status='pending' THEN 1 END) as pending, COUNT(CASE WHEN status='delivered' THEN 1 END) as delivered, COUNT(CASE WHEN status='rejected' THEN 1 END) as rejected FROM orders`),
      query(`SELECT COUNT(*) as total FROM products WHERE is_active=true`),
      query(`
        SELECT TO_CHAR(sale_date, 'Mon') as month, EXTRACT(MONTH FROM sale_date) as month_num, SUM(total_amount) as revenue
        FROM sales WHERE sale_date >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY TO_CHAR(sale_date,'Mon'), EXTRACT(MONTH FROM sale_date)
        ORDER BY month_num
      `),
      query(`
        SELECT p.name, p.slug, SUM(s.quantity) as units_sold, SUM(s.total_amount) as revenue
        FROM sales s JOIN products p ON s.product_id = p.id
        WHERE s.sale_date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY p.id, p.name, p.slug ORDER BY units_sold DESC
      `),
      query(`
        SELECT status, COUNT(*) as count FROM orders GROUP BY status
      `)
    ]);

    const prevMonthRev = await query(`SELECT COALESCE(SUM(total_amount),0) as total FROM orders WHERE status='delivered' AND created_at BETWEEN NOW()-INTERVAL '60 days' AND NOW()-INTERVAL '30 days'`);
    const thisMonthRev = parseFloat(revenue.rows[0].this_month);
    const prevRev = parseFloat(prevMonthRev.rows[0].total);
    const growth = prevRev > 0 ? ((thisMonthRev - prevRev) / prevRev * 100).toFixed(1) : 0;

    res.json({
      kpis: {
        total_revenue: parseFloat(revenue.rows[0].total),
        monthly_revenue: thisMonthRev,
        revenue_growth: parseFloat(growth),
        total_orders: parseInt(orders.rows[0].total),
        pending_orders: parseInt(orders.rows[0].pending),
        delivered_orders: parseInt(orders.rows[0].delivered),
        total_products: parseInt(products.rows[0].total)
      },
      monthly_revenue: monthlyRev.rows,
      product_performance: productPerf.rows,
      order_status_breakdown: orderStatus.rows
    });
  } catch (err) { next(err); }
});

// GET /api/analytics/sales?period=monthly|weekly|yearly
router.get('/sales', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { period = 'monthly' } = req.query;
    let groupBy, dateFormat, interval;
    if (period === 'weekly') { groupBy = 'week'; dateFormat = 'IYYY-IW'; interval = '8 weeks'; }
    else if (period === 'yearly') { groupBy = 'year'; dateFormat = 'YYYY'; interval = '5 years'; }
    else { groupBy = 'month'; dateFormat = 'YYYY-MM'; interval = '12 months'; }

    const result = await query(`
      SELECT TO_CHAR(s.sale_date, '${dateFormat}') as period,
             p.name as product, SUM(s.quantity) as units, SUM(s.total_amount) as revenue
      FROM sales s JOIN products p ON s.product_id = p.id
      WHERE s.sale_date >= CURRENT_DATE - INTERVAL '${interval}'
      GROUP BY TO_CHAR(s.sale_date,'${dateFormat}'), p.name
      ORDER BY period, p.name
    `);
    res.json({ sales: result.rows, period });
  } catch (err) { next(err); }
});

// GET /api/analytics/forecast
router.get('/forecast', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT p.id, p.name, p.slug,
             COALESCE(AVG(monthly.monthly_qty), 0) as avg_monthly_demand,
             i.current_stock, i.reorder_quantity,
             CASE WHEN COALESCE(AVG(monthly.monthly_qty), 0) > 0
               THEN ROUND(i.current_stock / AVG(monthly.monthly_qty) * 30)
               ELSE NULL
             END as days_of_stock_remaining,
             GREATEST(0, ROUND(COALESCE(AVG(monthly.monthly_qty),0) * 1.1) - i.current_stock) as recommended_reorder
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      LEFT JOIN (
        SELECT product_id, DATE_TRUNC('month', sale_date) as month, SUM(quantity) as monthly_qty
        FROM sales WHERE sale_date >= CURRENT_DATE - INTERVAL '3 months'
        GROUP BY product_id, DATE_TRUNC('month', sale_date)
      ) monthly ON p.id = monthly.product_id
      WHERE p.is_active = true
      GROUP BY p.id, p.name, p.slug, i.current_stock, i.reorder_quantity
      ORDER BY days_of_stock_remaining ASC NULLS LAST
    `);
    res.json({ forecast: result.rows });
  } catch (err) { next(err); }
});

module.exports = router;
