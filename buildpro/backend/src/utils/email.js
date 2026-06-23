const nodemailer = require('nodemailer');

const createTransporter = () => nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

const sendOrderEmail = async ({ email, name, order_number, product, quantity, total_amount }) => {
  if (!process.env.EMAIL_USER) return;
  const transporter = createTransporter();
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: `BuildPro — Order Confirmation #${order_number}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#1A1A1A;padding:24px;text-align:center;">
          <h1 style="color:#F5A623;margin:0;">BuildPro</h1>
          <p style="color:#999;margin:4px 0;">Construction Materials</p>
        </div>
        <div style="padding:32px;background:#F9F9F9;">
          <h2 style="color:#1A1A1A;">Order Received! 🏗️</h2>
          <p>Hi ${name}, your bulk order request has been received and is under review.</p>
          <div style="background:#fff;border:1px solid #eee;border-radius:8px;padding:20px;margin:20px 0;">
            <p><strong>Order Number:</strong> ${order_number}</p>
            <p><strong>Product:</strong> ${product}</p>
            <p><strong>Quantity:</strong> ${quantity}</p>
            <p><strong>Total Amount:</strong> $${parseFloat(total_amount).toFixed(2)}</p>
            <p><strong>Status:</strong> <span style="color:#F5A623;">Pending Review</span></p>
          </div>
          <p>We will confirm your order within 24 hours. For urgent enquiries, WhatsApp us at +1-555-BUILDPRO.</p>
        </div>
        <div style="background:#1A1A1A;padding:16px;text-align:center;">
          <p style="color:#666;font-size:12px;margin:0;">BuildPro Construction Supplies · All rights reserved</p>
        </div>
      </div>
    `
  });
};

const sendAppointmentEmail = async ({ email, name, date, time, purpose }) => {
  if (!process.env.EMAIL_USER) return;
  const transporter = createTransporter();
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: `BuildPro — Appointment Request Received`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#1A1A1A;padding:24px;text-align:center;">
          <h1 style="color:#F5A623;margin:0;">BuildPro</h1>
        </div>
        <div style="padding:32px;background:#F9F9F9;">
          <h2>Appointment Request Received 📅</h2>
          <p>Hi ${name}, we've received your appointment request.</p>
          <div style="background:#fff;border:1px solid #eee;border-radius:8px;padding:20px;margin:20px 0;">
            <p><strong>Date:</strong> ${date}</p>
            <p><strong>Time:</strong> ${time}</p>
            <p><strong>Purpose:</strong> ${purpose}</p>
            <p><strong>Status:</strong> <span style="color:#F5A623;">Awaiting Confirmation</span></p>
          </div>
          <p>Our team will confirm your appointment within 2 hours during business hours.</p>
        </div>
        <div style="background:#1A1A1A;padding:16px;text-align:center;">
          <p style="color:#666;font-size:12px;margin:0;">BuildPro Construction Supplies</p>
        </div>
      </div>
    `
  });
};

module.exports = { sendOrderEmail, sendAppointmentEmail };
