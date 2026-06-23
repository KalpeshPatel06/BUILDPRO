import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { pool } from '../config/database';

export const generateExcelReport = async (req: Request, res: Response) => {
  try {
    const { type = 'sales', startDate, endDate } = req.query;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'BuildPro';
    workbook.created = new Date();

    const headerStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5A623' } },
      alignment: { horizontal: 'center' },
      border: { bottom: { style: 'thin' } }
    };

    if (type === 'sales' || type === 'all') {
      const sheet = workbook.addWorksheet('Sales Report');
      sheet.columns = [
        { header: 'Order #', key: 'order_number', width: 18 },
        { header: 'Date', key: 'sale_date', width: 14 },
        { header: 'Customer', key: 'customer_name', width: 22 },
        { header: 'Product', key: 'product_name', width: 20 },
        { header: 'Quantity', key: 'quantity', width: 12 },
        { header: 'Revenue ($)', key: 'revenue', width: 14 },
      ];
      sheet.getRow(1).eachCell(cell => Object.assign(cell, headerStyle));

      const start = startDate || new Date(new Date().getFullYear(), 0, 1).toISOString();
      const end = endDate || new Date().toISOString();
      const { rows } = await pool.query(`
        SELECT o.order_number, s.sale_date, o.customer_name, p.name as product_name, s.quantity, s.revenue
        FROM sales s
        JOIN orders o ON o.id=s.order_id
        JOIN products p ON p.id=s.product_id
        WHERE s.sale_date BETWEEN $1 AND $2
        ORDER BY s.sale_date DESC
      `, [start, end]);

      rows.forEach(row => sheet.addRow(row));
      sheet.addRow({});
      sheet.addRow({ customer_name: 'TOTAL', revenue: rows.reduce((sum, r) => sum + parseFloat(r.revenue), 0) });
    }

    if (type === 'inventory' || type === 'all') {
      const sheet = workbook.addWorksheet('Inventory Report');
      sheet.columns = [
        { header: 'Product', key: 'name', width: 22 },
        { header: 'Current Stock', key: 'current_stock', width: 16 },
        { header: 'Max Capacity', key: 'max_capacity', width: 16 },
        { header: 'Low Stock Alert', key: 'low_stock_threshold', width: 18 },
        { header: 'Avg Monthly Sales', key: 'avg_monthly_sales', width: 20 },
        { header: 'Status', key: 'stock_status', width: 14 },
        { header: 'Days Until Depletion', key: 'days_until_depletion', width: 22 },
      ];
      sheet.getRow(1).eachCell(cell => Object.assign(cell, headerStyle));

      const { rows } = await pool.query(`
        SELECT p.name, i.current_stock, i.max_capacity, i.low_stock_threshold, i.avg_monthly_sales,
          CASE WHEN i.current_stock=0 THEN 'Out of Stock' WHEN i.current_stock<=i.low_stock_threshold THEN 'Low Stock' ELSE 'In Stock' END as stock_status,
          CASE WHEN i.avg_monthly_sales>0 THEN ROUND((i.current_stock::decimal/i.avg_monthly_sales)*30) ELSE NULL END as days_until_depletion
        FROM products p JOIN inventory i ON i.product_id=p.id
      `);
      rows.forEach(row => sheet.addRow(row));
    }

    if (type === 'orders' || type === 'all') {
      const sheet = workbook.addWorksheet('Orders Report');
      sheet.columns = [
        { header: 'Order #', key: 'order_number', width: 18 },
        { header: 'Date', key: 'created_at', width: 16 },
        { header: 'Customer', key: 'customer_name', width: 22 },
        { header: 'Email', key: 'customer_email', width: 26 },
        { header: 'Product', key: 'product_name', width: 20 },
        { header: 'Qty', key: 'quantity', width: 10 },
        { header: 'Total ($)', key: 'total_amount', width: 14 },
        { header: 'Status', key: 'status', width: 14 },
      ];
      sheet.getRow(1).eachCell(cell => Object.assign(cell, headerStyle));
      const { rows } = await pool.query(`
        SELECT o.order_number, o.created_at::date, o.customer_name, o.customer_email,
          p.name as product_name, o.quantity, o.total_amount, o.status
        FROM orders o JOIN products p ON p.id=o.product_id ORDER BY o.created_at DESC LIMIT 1000
      `);
      rows.forEach(row => sheet.addRow(row));
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=buildpro-${type}-report-${new Date().toISOString().split('T')[0]}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate report', message: (err as Error).message });
  }
};

export const getNotifications = async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

export const markNotificationRead = async (req: Request, res: Response) => {
  try {
    await pool.query('UPDATE notifications SET is_read=true WHERE id=$1', [req.params.id]);
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
};
