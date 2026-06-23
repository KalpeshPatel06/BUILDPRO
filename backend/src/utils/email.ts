import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const emailWrapper = (content: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; background:#f4f2ee; margin:0; padding:20px; }
  .container { max-width:600px; margin:0 auto; background:#fff; border-radius:12px; overflow:hidden; }
  .header { background:#1a1a1a; padding:24px; text-align:center; }
  .header h1 { color:#f5a623; margin:0; font-size:24px; }
  .header p { color:rgba(255,255,255,0.6); margin:4px 0 0; font-size:13px; }
  .body { padding:28px; }
  .detail-row { display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #f0ede8; font-size:14px; }
  .label { color:#6b6b6b; }
  .value { font-weight:600; color:#1a1a1a; }
  .highlight { background:#fef3dc; border-radius:8px; padding:16px; margin:16px 0; }
  .footer { background:#f4f2ee; padding:16px 28px; text-align:center; font-size:12px; color:#6b6b6b; }
  .btn { display:inline-block; background:#f5a623; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600; margin-top:16px; }
</style></head>
<body><div class="container">${content}</div></body>
</html>`;

export const sendOrderConfirmationEmail = async (order: any) => {
  if (!process.env.EMAIL_USER) return;
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: order.customer_email,
      subject: `Order Confirmed — ${order.order_number} | BuildPro`,
      html: emailWrapper(`
        <div class="header">
          <h1>🏗️ BuildPro</h1>
          <p>Premium Construction Materials</p>
        </div>
        <div class="body">
          <h2 style="color:#1a1a1a; margin-top:0;">Order Request Received!</h2>
          <p style="color:#6b6b6b;">Dear ${order.customer_name}, your bulk order has been received and is under review. We will confirm within 24 hours.</p>
          <div class="highlight">
            <div class="detail-row"><span class="label">Order Number</span><span class="value">${order.order_number}</span></div>
            <div class="detail-row"><span class="label">Product</span><span class="value">${order.product_name || 'See order details'}</span></div>
            <div class="detail-row"><span class="label">Quantity</span><span class="value">${order.quantity} units</span></div>
            <div class="detail-row"><span class="label">Total Amount</span><span class="value">$${parseFloat(order.total_amount).toFixed(2)}</span></div>
            <div class="detail-row" style="border:none"><span class="label">Status</span><span class="value" style="color:#f5a623;">Pending Review</span></div>
          </div>
          <p style="color:#6b6b6b; font-size:14px;">We'll contact you at ${order.customer_phone} to confirm delivery details.</p>
        </div>
        <div class="footer">BuildPro Construction Materials · info@buildpro.com</div>
      `)
    });
  } catch (err) {
    console.error('Email send failed:', err);
  }
};

export const sendAppointmentConfirmationEmail = async (apt: any) => {
  if (!process.env.EMAIL_USER) return;
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: apt.customer_email,
      subject: `Appointment Booked — ${apt.appointment_date} | BuildPro`,
      html: emailWrapper(`
        <div class="header">
          <h1>🏗️ BuildPro</h1>
          <p>Premium Construction Materials</p>
        </div>
        <div class="body">
          <h2 style="color:#1a1a1a; margin-top:0;">Appointment Booked!</h2>
          <p style="color:#6b6b6b;">Dear ${apt.customer_name}, your appointment request has been received.</p>
          <div class="highlight">
            <div class="detail-row"><span class="label">Date</span><span class="value">${apt.appointment_date}</span></div>
            <div class="detail-row"><span class="label">Time</span><span class="value">${apt.appointment_time}</span></div>
            <div class="detail-row" style="border:none"><span class="label">Purpose</span><span class="value">${apt.purpose}</span></div>
          </div>
          <p style="color:#6b6b6b; font-size:14px;">We'll confirm your appointment shortly. If you need to reschedule, please contact us.</p>
        </div>
        <div class="footer">BuildPro Construction Materials · info@buildpro.com</div>
      `)
    });
  } catch (err) {
    console.error('Email send failed:', err);
  }
};
