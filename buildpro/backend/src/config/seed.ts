import { pool, migrate } from './database';
import bcrypt from 'bcryptjs';

async function seed() {
  await migrate();
  const client = await pool.connect();
  try {
    // Admin user
    const hashedPassword = await bcrypt.hash('Admin@123', 12);
    await client.query(`
      INSERT INTO users (name, email, password, role, phone)
      VALUES ('Admin User', 'admin@buildpro.com', $1, 'admin', '+1-555-0100')
      ON CONFLICT (email) DO NOTHING
    `, [hashedPassword]);

    // Products
    await client.query(`
      INSERT INTO products (name, slug, description, price_per_unit, unit, specifications) VALUES
      ('Cement', 'cement', 'OPC 53 Grade Portland Cement. Ideal for all structural works, RCC, plastering, and masonry. Consistent quality, high early strength.', 8.50, 'bag', '{"grade":"OPC 53","weight":"50kg","standard":"IS:12269","uses":["RCC","Plastering","Masonry","Foundation"]}'),
      ('Iron Rods', 'iron-rods', 'Fe500 TMT Steel Bars for construction. High tensile strength, earthquake resistant, superior weldability. Available in 8mm to 32mm diameters.', 1.20, 'kg', '{"grade":"Fe500","sizes":["8mm","10mm","12mm","16mm","20mm","25mm","32mm"],"standard":"IS:1786","features":["Earthquake resistant","High tensile strength","Superior weldability"]}'),
      ('Concrete Blocks', 'concrete-blocks', 'Solid Concrete Blocks for walls and partitions. Uniform dimensions, high compressive strength, excellent thermal insulation.', 2.10, 'unit', '{"dimensions":"400x200x200mm","compressiveStrength":"7.5 N/mm²","type":"Solid","uses":["Load bearing walls","Partition walls","Boundary walls"]}'),
      ('Cement Pipes', 'cement-pipes', 'NP2/NP3 Class Reinforced Cement Concrete Pipes. Ideal for drainage, irrigation, and sewerage systems. Available in 150mm to 600mm diameter.', 18.00, 'pipe', '{"class":"NP2/NP3","diameters":["150mm","200mm","300mm","450mm","600mm"],"standard":"IS:458","uses":["Drainage","Irrigation","Sewerage","Culverts"]}')
      ON CONFLICT (slug) DO NOTHING
    `);

    // Inventory
    await client.query(`
      INSERT INTO inventory (product_id, current_stock, max_capacity, low_stock_threshold, avg_monthly_sales)
      SELECT p.id,
        CASE p.slug
          WHEN 'cement' THEN 1240
          WHEN 'iron-rods' THEN 340
          WHEN 'concrete-blocks' THEN 8900
          WHEN 'cement-pipes' THEN 0
        END,
        CASE p.slug
          WHEN 'cement' THEN 2000
          WHEN 'iron-rods' THEN 1500
          WHEN 'concrete-blocks' THEN 10000
          WHEN 'cement-pipes' THEN 500
        END,
        CASE p.slug
          WHEN 'cement' THEN 200
          WHEN 'iron-rods' THEN 300
          WHEN 'concrete-blocks' THEN 1000
          WHEN 'cement-pipes' THEN 50
        END,
        CASE p.slug
          WHEN 'cement' THEN 300
          WHEN 'iron-rods' THEN 420
          WHEN 'concrete-blocks' THEN 1800
          WHEN 'cement-pipes' THEN 80
        END
      FROM products p
      ON CONFLICT (product_id) DO NOTHING
    `);

    // Sample orders
    await client.query(`
      INSERT INTO orders (order_number, customer_name, customer_email, customer_phone, delivery_address, product_id, quantity, unit_price, total_amount, status, created_at)
      SELECT
        'ORD-2026-' || LPAD(gs::text, 4, '0'),
        names.name,
        emails.email,
        phones.phone,
        '123 Construction Site, Industrial Zone, City',
        products.id,
        qtys.qty,
        products.price_per_unit,
        products.price_per_unit * qtys.qty,
        statuses.status,
        NOW() - (gs || ' days')::interval
      FROM generate_series(1,20) gs
      CROSS JOIN LATERAL (VALUES
        ('Marcus Webb'), ('Priya Sharma'), ('Carlos Rivera'), ('Aisha Okonkwo'), ('Lena Hoffmann')
      ) AS names(name)
      CROSS JOIN LATERAL (VALUES
        ('marcus@example.com'), ('priya@example.com'), ('carlos@example.com'), ('aisha@example.com'), ('lena@example.com')
      ) AS emails(email)
      CROSS JOIN LATERAL (VALUES ('+1-555-0101'), ('+1-555-0102'), ('+1-555-0103'), ('+1-555-0104'), ('+1-555-0105')) AS phones(phone)
      CROSS JOIN LATERAL (VALUES (100), (250), (500), (1000), (50)) AS qtys(qty)
      CROSS JOIN LATERAL (VALUES ('pending'), ('approved'), ('delivered'), ('rejected'), ('delivered')) AS statuses(status)
      JOIN products ON products.id = (gs % 4) + 1
      LIMIT 20
      ON CONFLICT (order_number) DO NOTHING
    `);

    // Sample sales
    await client.query(`
      INSERT INTO sales (order_id, product_id, quantity, revenue, sale_date)
      SELECT o.id, o.product_id, o.quantity, o.total_amount,
             (NOW() - (random() * 180 || ' days')::interval)::date
      FROM orders o WHERE o.status = 'delivered'
      ON CONFLICT DO NOTHING
    `);

    // Sample appointments
    await client.query(`
      INSERT INTO appointments (customer_name, customer_email, customer_phone, appointment_date, appointment_time, purpose, status) VALUES
      ('Lena Hoffmann', 'lena@example.com', '+1-555-0104', CURRENT_DATE + 3, '10:00', 'Bulk order discussion', 'approved'),
      ('Raj Patel', 'raj@example.com', '+1-555-0110', CURRENT_DATE + 6, '14:00', 'Site consultation', 'pending'),
      ('Sofia Chen', 'sofia@example.com', '+1-555-0111', CURRENT_DATE + 11, '11:00', 'Product enquiry', 'approved'),
      ('Omar Farooq', 'omar@example.com', '+1-555-0112', CURRENT_DATE + 16, '09:00', 'Delivery planning', 'pending')
      ON CONFLICT DO NOTHING
    `);

    // Chatbot knowledge base
    await client.query(`
      INSERT INTO chatbot_knowledge (category, question, answer) VALUES
      ('product', 'What products do you sell?', 'We sell 4 core construction materials in bulk: Cement (OPC 53 grade, $8.50/bag), Iron Rods (Fe500 TMT, $1.20/kg), Concrete Blocks ($2.10/unit), and Cement Pipes ($18.00/pipe).'),
      ('product', 'What is the price of cement?', 'Cement is priced at $8.50 per 50kg bag. We offer bulk discounts for orders over 500 bags. Minimum order is 50 bags.'),
      ('product', 'What sizes of iron rods do you have?', 'Iron Rods (Fe500 TMT) are available in 8mm, 10mm, 12mm, 16mm, 20mm, 25mm, and 32mm diameters.'),
      ('delivery', 'How long does delivery take?', 'City delivery: 2-3 business days. Out-of-city: 4-7 business days. Express delivery available on request. Free delivery on orders over $5,000.'),
      ('business', 'What are your business hours?', 'Monday-Friday: 7:30 AM to 5:30 PM. Saturday: 8:00 AM to 2:00 PM. Sunday: Closed. WhatsApp available 24/7 for urgent queries.'),
      ('order', 'What is the minimum order quantity?', 'Minimum orders: Cement - 50 bags, Iron Rods - 100kg, Concrete Blocks - 500 units, Cement Pipes - 10 pipes. All products are sold in bulk only.'),
      ('payment', 'What payment methods do you accept?', 'We accept bank transfers, checks, and cash on delivery for local orders. Payment must be confirmed before delivery for large orders.'),
      ('contact', 'How can I contact you?', 'Call us at +1-555-BUILD, email info@buildpro.com, or WhatsApp for instant replies. You can also book an appointment through our website.')
      ON CONFLICT DO NOTHING
    `);

    console.log('✅ Database seeded successfully');
    console.log('👤 Admin login: admin@buildpro.com / Admin@123');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
