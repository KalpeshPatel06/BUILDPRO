import { Request, Response } from 'express';
import { pool } from '../config/database';
import { sendOrderConfirmationEmail } from '../utils/email';

const generateOrderNumber = () => {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 90000) + 10000;
  return `ORD-${year}-${rand}`;
};

export const createOrder = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { customer_name, customer_email, customer_phone, delivery_address, product_id, quantity, notes, delivery_date } = req.body;

    // Check stock
    const stockResult = await client.query(
      'SELECT current_stock FROM inventory WHERE product_id=$1', [product_id]
    );
    const stock = stockResult.rows[0]?.current_stock ?? 0;
    if (stock < quantity) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Insufficient stock. Available: ${stock}` });
    }

    const priceResult = await client.query('SELECT price_per_unit FROM products WHERE id=$1', [product_id]);
    const unitPrice = priceResult.rows[0].price_per_unit;
    const totalAmount = unitPrice * quantity;
    const orderNumber = generateOrderNumber();

    const { rows } = await client.query(`
      INSERT INTO orders (order_number, customer_name, customer_email, customer_phone, delivery_address,
        product_id, quantity, unit_price, total_amount, notes, delivery_date)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *
    `, [orderNumber, customer_name, customer_email, customer_phone, delivery_address,
        product_id, quantity, unitPrice, totalAmount, notes, delivery_date]);

    // Create notification
    await client.query(`
      INSERT INTO notifications (type, title, message, related_id, related_type)
      VALUES ('new_order', 'New Order Received', $1, $2, 'order')
    `, [`${customer_name} placed a bulk order for ${quantity} units. Total: $${totalAmount}`, rows[0].id]);

    await client.query('COMMIT');

    // Send confirmation email (non-blocking)
    sendOrderConfirmationEmail(rows[0]).catch(console.error);

    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to create order', message: (err as Error).message });
  } finally {
    client.release();
  }
};

export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const conditions: string[] = [];
    const params: any[] = [];

    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`o.status = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(o.customer_name ILIKE $${params.length} OR o.order_number ILIKE $${params.length} OR o.customer_email ILIKE $${params.length})`);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    params.push(limit, offset);

    const { rows } = await pool.query(`
      SELECT o.*, p.name as product_name, p.slug as product_slug
      FROM orders o
      JOIN products p ON p.id = o.product_id
      ${where}
      ORDER BY o.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    const countResult = await pool.query(`SELECT COUNT(*) FROM orders o ${where}`, params.slice(0, -2));
    res.json({ orders: rows, total: parseInt(countResult.rows[0].count), page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { status, admin_notes } = req.body;
    const { id } = req.params;
    const validStatuses = ['pending', 'approved', 'processing', 'delivered', 'rejected'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const { rows } = await client.query(`
      UPDATE orders SET status=$1, admin_notes=$2, updated_at=NOW()
      WHERE id=$3 RETURNING *
    `, [status, admin_notes, id]);

    if (!rows.length) return res.status(404).json({ error: 'Order not found' });

    // If delivered — deduct inventory and record sale
    if (status === 'delivered') {
      await client.query(
        'UPDATE inventory SET current_stock = current_stock - $1 WHERE product_id = $2',
        [rows[0].quantity, rows[0].product_id]
      );
      await client.query(
        'INSERT INTO sales (order_id, product_id, quantity, revenue, sale_date) VALUES ($1,$2,$3,$4,CURRENT_DATE)',
        [id, rows[0].product_id, rows[0].quantity, rows[0].total_amount]
      );
    }

    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to update order' });
  } finally {
    client.release();
  }
};

export const getOrderById = async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT o.*, p.name as product_name FROM orders o
      JOIN products p ON p.id = o.product_id WHERE o.id=$1
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Order not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};
