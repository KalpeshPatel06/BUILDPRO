import { Request, Response } from 'express';
import { pool } from '../config/database';
import { sendAppointmentConfirmationEmail } from '../utils/email';

export const createAppointment = async (req: Request, res: Response) => {
  try {
    const { customer_name, customer_email, customer_phone, appointment_date, appointment_time, purpose } = req.body;

    const { rows } = await pool.query(`
      INSERT INTO appointments (customer_name, customer_email, customer_phone, appointment_date, appointment_time, purpose)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
    `, [customer_name, customer_email, customer_phone, appointment_date, appointment_time, purpose]);

    await pool.query(`
      INSERT INTO notifications (type, title, message, related_id, related_type)
      VALUES ('new_appointment', 'New Appointment Booked', $1, $2, 'appointment')
    `, [`${customer_name} booked an appointment on ${appointment_date} at ${appointment_time} for ${purpose}`, rows[0].id]);

    sendAppointmentConfirmationEmail(rows[0]).catch(console.error);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create appointment' });
  }
};

export const getAllAppointments = async (req: Request, res: Response) => {
  try {
    const { status, month, year } = req.query;
    const conditions: string[] = [];
    const params: any[] = [];

    if (status && status !== 'all') { params.push(status); conditions.push(`status=$${params.length}`); }
    if (month) { params.push(month); conditions.push(`EXTRACT(MONTH FROM appointment_date)=$${params.length}`); }
    if (year) { params.push(year); conditions.push(`EXTRACT(YEAR FROM appointment_date)=$${params.length}`); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const { rows } = await pool.query(
      `SELECT * FROM appointments ${where} ORDER BY appointment_date, appointment_time`, params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
};

export const updateAppointment = async (req: Request, res: Response) => {
  try {
    const { status, admin_notes, appointment_date, appointment_time } = req.body;
    const { rows } = await pool.query(`
      UPDATE appointments SET status=$1, admin_notes=$2,
        appointment_date=COALESCE($3, appointment_date),
        appointment_time=COALESCE($4, appointment_time),
        updated_at=NOW()
      WHERE id=$5 RETURNING *
    `, [status, admin_notes, appointment_date, appointment_time, req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Appointment not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update appointment' });
  }
};
