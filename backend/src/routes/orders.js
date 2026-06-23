const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, getClient } = require('../config/database');
const { authenticate, requireAdmin, optionalAuth } = require('../middleware/auth');
const { sendOrderEmail } = require('../utils/email');

const router = express.Router();

const generateOrderNumber = () => `BP-${Date.now()}-${Math.floor(Math.random()*1000)}`;

// POST /api/orders - create order (public)
router.post('/', optionalAuth, [
  body('full_name').trim().notEmpty(),
  body('phone').notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('delivery_address').notEmpty(),
  body('product_id').isUUID(),
  body('quantity').isInt({ min: 1 })
], async (req, res, next) => {
  const client = await getClient();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    await client.query('BEGIN');
    const { full_name, phone, email, delivery_address, product_id, quantity, notes, delivery_date } = req.body;

    // Upsert customer
    let customer = await client.query(
      'SELECT id FROM customers WHERE email = $1', [email]
    );
    if (customer.rows.length === 0) {
      customer = await client.query(
        'INSERT INTO customers (name, email, phone, address) VALUES ($1,$2,$3,$4) RETURNING id',
        [full_name, email, phone, delivery_address]
      );
    }
    const customer_id = customer.rows[0].id;

    // Get product price
    const product = await client.query('SELECT price_per_unit, name FROM products WHERE id = $1 AND is_active = true', [product_id]);
    if (!product.rows[0]) return res.status(404).json({ error: 'Product not found' });

    const unit_price = parseFloat(product.rows[0].price_per_unit);
    const total_amount = unit_price * quantity;
    const order_number = generateOrderNumber();

    const order = await client.query(`
      INSERT INTO orders (order_number, customer_id, product_id, quantity, unit_price, total_amount, delivery_address, notes, delivery_date, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending') RETURNING *
    `, [order_number, customer_id, product_id, quantity, unit_price, total_amount, delivery_address, notes, delivery_date]);

    // Create notification for admin
    const adminResult = await client.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    if (adminResult.rows[0]) {
      await client.query(`
        INSERT INTO notifications (type, title, message, recipient_id, metadata)
        VALUES ('new_order', 'New Order Received', $1, $2, $3)
      `, [
        `New bulk order #${order_number} from ${full_name} for ${quantity} ${product.rows[0].name}`,
        adminResult.rows[0].id,
        JSON.stringify({ order_id: order.rows[0].id, order_number })
      ]);
    }

    await client.query('COMMIT');

    // Send confirmation email (non-blocking)
    sendOrderEmail({ email, name: full_name, order_number, product: product.rows[0].name, quantity, total_amount }).catch(console.error);

    res.status(201).json({ order: order.rows[0], message: 'Order submitted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// GET /api/orders - admin: all orders, customer: their orders
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;
    let whereClause = req.user.role === 'admin' ? '' : 'AND c.email = $3';
    let params = [limit, offset];
    if (req.user.role !== 'admin') params.push(req.user.email);

    const conditions = ['1=1'];
    if (status) { conditions.push(`o.status = $${params.length + 1}`); params.push(status); }
    if (search && req.user.role === 'admin') {
      conditions.push(`(c.name ILIKE $${params.length + 1} OR o.order_number ILIKE $${params.length + 1})`);
      params.push(`%${search}%`);
    }

    const result = await query(`
      SELECT o.*, p.name as product_name, p.slug as product_slug, p.unit,
             c.name as customer_name, c.email as customer_email, c.phone as customer_phone
      FROM orders o
      LEFT JOIN products p ON o.product_id = p.id
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE ${conditions.join(' AND ')} ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT $1 OFFSET $2
    `, params);

    const total = await query(`SELECT COUNT(*) FROM orders o LEFT JOIN customers c ON o.customer_id = c.id WHERE ${conditions.join(' AND ')} ${whereClause}`, params.slice(2));
    res.json({ orders: result.rows, total: parseInt(total.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
});

// GET /api/orders/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT o.*, p.name as product_name, p.unit, c.name as customer_name, c.email, c.phone
      FROM orders o
      LEFT JOIN products p ON o.product_id = p.id
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.id = $1
    `, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Order not found' });
    res.json({ order: result.rows[0] });
  } catch (err) { next(err); }
});

// PATCH /api/orders/:id/status - admin
router.patch('/:id/status', authenticate, requireAdmin, async (req, res, next) => {
  const client = await getClient();
  try {
    const { status, rejection_reason } = req.body;
    const validStatuses = ['pending','approved','processing','delivered','rejected','cancelled'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    await client.query('BEGIN');

    const extra = {};
    if (status === 'approved') extra.approved_at = 'NOW()';
    if (status === 'delivered') extra.delivered_at = 'NOW()';

    const result = await client.query(`
      UPDATE orders SET status=$1, rejection_reason=$2,
        approved_at = CASE WHEN $1 = 'approved' THEN NOW() ELSE approved_at END,
        delivered_at = CASE WHEN $1 = 'delivered' THEN NOW() ELSE delivered_at END
      WHERE id=$3 RETURNING *, (SELECT name FROM products WHERE id=product_id) as product_name,
        (SELECT quantity FROM orders WHERE id=$3) as qty
    `, [status, rejection_reason, req.params.id]);

    if (!result.rows[0]) return res.status(404).json({ error: 'Order not found' });
    const order = result.rows[0];

    // Deduct inventory when delivered
    if (status === 'delivered') {
      await client.query(`
        UPDATE inventory SET current_stock = current_stock - $1
        WHERE product_id = $2 AND current_stock >= $1
      `, [order.quantity, order.product_id]);

      await client.query(`
        INSERT INTO sales (order_id, product_id, quantity, unit_price, total_amount)
        VALUES ($1,$2,$3,$4,$5)
      `, [order.id, order.product_id, order.quantity, order.unit_price, order.total_amount]);

      await client.query(`
        UPDATE customers SET total_orders = total_orders + 1, total_spent = total_spent + $1
        WHERE id = $2
      `, [order.total_amount, order.customer_id]);
    }

    await client.query('COMMIT');
    res.json({ order: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
