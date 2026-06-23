const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// POST /api/appointments - public
router.post('/', [
  body('name').trim().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('phone').notEmpty(),
  body('appointment_date').isDate(),
  body('appointment_time').notEmpty(),
  body('purpose').notEmpty()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, phone, appointment_date, appointment_time, purpose } = req.body;

    // Check if slot already taken
    const conflict = await query(
      'SELECT id FROM appointments WHERE appointment_date=$1 AND appointment_time=$2 AND status IN ($3,$4)',
      [appointment_date, appointment_time, 'pending', 'confirmed']
    );
    if (conflict.rows.length > 0) {
      return res.status(409).json({ error: 'This time slot is already booked. Please choose another time.' });
    }

    // Upsert customer
    let customer = await query('SELECT id FROM customers WHERE email=$1', [email]);
    if (customer.rows.length === 0) {
      customer = await query('INSERT INTO customers (name,email,phone) VALUES ($1,$2,$3) RETURNING id', [name, email, phone]);
    }

    const result = await query(`
      INSERT INTO appointments (customer_id, name, email, phone, appointment_date, appointment_time, purpose)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
    `, [customer.rows[0].id, name, email, phone, appointment_date, appointment_time, purpose]);

    // Notify admin
    const admin = await query("SELECT id FROM users WHERE role='admin' LIMIT 1");
    if (admin.rows[0]) {
      await query(`
        INSERT INTO notifications (type, title, message, recipient_id, metadata)
        VALUES ('new_appointment','New Appointment Booked',$1,$2,$3)
      `, [
        `${name} booked an appointment for ${appointment_date} at ${appointment_time} — ${purpose}`,
        admin.rows[0].id,
        JSON.stringify({ appointment_id: result.rows[0].id })
      ]);
    }

    res.status(201).json({ appointment: result.rows[0], message: 'Appointment booked successfully' });
  } catch (err) { next(err); }
});

// GET /api/appointments - admin
router.get('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { month, year, status } = req.query;
    const conditions = ['1=1'];
    const params = [];
    if (status) { conditions.push(`status = $${params.length+1}`); params.push(status); }
    if (month) { conditions.push(`EXTRACT(MONTH FROM appointment_date) = $${params.length+1}`); params.push(month); }
    if (year) { conditions.push(`EXTRACT(YEAR FROM appointment_date) = $${params.length+1}`); params.push(year); }

    const result = await query(`
      SELECT * FROM appointments WHERE ${conditions.join(' AND ')} ORDER BY appointment_date, appointment_time
    `, params);
    res.json({ appointments: result.rows });
  } catch (err) { next(err); }
});

// PATCH /api/appointments/:id/status - admin
router.patch('/:id/status', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { status, admin_notes, rescheduled_date, rescheduled_time } = req.body;
    const validStatuses = ['confirmed','rejected','rescheduled','completed'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const result = await query(`
      UPDATE appointments SET status=$1, admin_notes=$2, rescheduled_date=$3, rescheduled_time=$4
      WHERE id=$5 RETURNING *
    `, [status, admin_notes, rescheduled_date, rescheduled_time, req.params.id]);

    if (!result.rows[0]) return res.status(404).json({ error: 'Appointment not found' });
    res.json({ appointment: result.rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
