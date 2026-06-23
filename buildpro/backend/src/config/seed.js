require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query } = require('./database');

const seed = async () => {
  console.log('🌱 Seeding database...\n');

  const adminHash = await bcrypt.hash('Admin@123', 12);
  await query(`
    INSERT INTO users (name, email, password_hash, role, phone) VALUES
    ('Admin User', 'admin@buildpro.com', $1, 'admin', '+1-555-0100')
    ON CONFLICT (email) DO NOTHING;
  `, [adminHash]);
  console.log('✅ Admin user created: admin@buildpro.com / Admin@123');

  await query(`
    INSERT INTO products (name, slug, description, unit, price_per_unit, min_order_qty) VALUES
    ('Cement', 'cement', 'OPC 53 Grade Portland Cement. Ideal for all structural works, RCC, plastering and general construction. 50kg bags.', 'bag', 8.50, 100),
    ('Iron Rods', 'iron-rods', 'Fe500 TMT Steel Bars. High tensile strength, earthquake-resistant. Available in 8mm, 10mm, 12mm, 16mm, 20mm, 25mm, 32mm diameters.', 'rod', 1.20, 50),
    ('Concrete Blocks', 'concrete-blocks', 'Solid concrete blocks 400×200×200mm. High compressive strength, thermally efficient, ideal for load-bearing walls.', 'unit', 2.10, 500),
    ('Cement Pipes', 'cement-pipes', 'NP2/NP3 class RCC cement pipes. Available in 150mm, 200mm, 300mm, 450mm, 600mm diameters. Ideal for drainage and sewerage.', 'pipe', 18.00, 20)
    ON CONFLICT (slug) DO NOTHING;
  `);
  console.log('✅ Products seeded');

  await query(`
    INSERT INTO inventory (product_id, current_stock, max_capacity, low_stock_threshold, reorder_quantity)
    SELECT id,
      CASE slug
        WHEN 'cement' THEN 1240
        WHEN 'iron-rods' THEN 340
        WHEN 'concrete-blocks' THEN 8900
        WHEN 'cement-pipes' THEN 0
      END,
      CASE slug
        WHEN 'cement' THEN 2000
        WHEN 'iron-rods' THEN 1500
        WHEN 'concrete-blocks' THEN 12000
        WHEN 'cement-pipes' THEN 600
      END,
      CASE slug
        WHEN 'cement' THEN 300
        WHEN 'iron-rods' THEN 400
        WHEN 'concrete-blocks' THEN 1000
        WHEN 'cement-pipes' THEN 50
      END,
      CASE slug
        WHEN 'cement' THEN 500
        WHEN 'iron-rods' THEN 600
        WHEN 'concrete-blocks' THEN 2000
        WHEN 'cement-pipes' THEN 200
      END
    FROM products
    ON CONFLICT (product_id) DO NOTHING;
  `);
  console.log('✅ Inventory seeded');

  await query(`
    INSERT INTO customers (name, email, phone, address, city, total_orders, total_spent) VALUES
    ('Marcus Webb', 'marcus@example.com', '+1-555-0201', '123 Construction Ave', 'Austin', 3, 12750.00),
    ('Priya Sharma', 'priya@example.com', '+1-555-0202', '456 Builder Blvd', 'Houston', 5, 8920.00),
    ('Carlos Rivera', 'carlos@example.com', '+1-555-0203', '789 Site Road', 'Dallas', 2, 4200.00),
    ('Aisha Okonkwo', 'aisha@example.com', '+1-555-0204', '321 Foundation St', 'San Antonio', 1, 0.00)
    ON CONFLICT DO NOTHING;
  `);
  console.log('✅ Sample customers seeded');

  await query(`
    INSERT INTO chatbot_knowledge (category, question, answer, keywords) VALUES
    ('products', 'What products do you sell?', 'We sell 4 bulk construction materials: Cement (OPC 53 grade, $8.50/bag), Iron Rods (Fe500 TMT, $1.20/kg), Concrete Blocks (400x200x200mm, $2.10/unit), and Cement Pipes (NP2/NP3 class, $18.00/pipe). All sold in bulk quantities.', ARRAY['products','sell','offer','materials','what','catalog']),
    ('pricing', 'What is the price of cement?', 'Cement is priced at $8.50 per 50kg bag. Minimum order is 100 bags. Bulk discounts available for orders over 500 bags. Contact us for special pricing on large projects.', ARRAY['cement','price','cost','bag','how much']),
    ('delivery', 'How long does delivery take?', 'Delivery times: City area: 2-3 business days. Out-of-city: 4-7 business days. Express delivery available on request. Free delivery on orders over $5,000. Delivery charges depend on quantity and distance.', ARRAY['delivery','shipping','days','how long','arrive','when']),
    ('hours', 'What are your business hours?', 'We are open Monday to Friday 7:30 AM - 5:30 PM, Saturday 8:00 AM - 2:00 PM. Closed on Sundays and public holidays. For urgent orders, WhatsApp us anytime.', ARRAY['hours','open','time','schedule','working','days','sunday','saturday']),
    ('orders', 'How do I place a bulk order?', 'To place a bulk order: 1) Fill the order form on our website with your contact details, 2) Select your product and quantity, 3) Specify delivery address and preferred date, 4) Submit and we confirm within 24 hours. You can also order via WhatsApp for instant response.', ARRAY['order','place','buy','purchase','how to','bulk']),
    ('appointments', 'How do I book an appointment?', 'Book an appointment through our website by selecting your preferred date and time (Mon-Fri 9AM-4PM), choosing the purpose (site consultation, product enquiry, bulk order discussion), and submitting your contact details. Admin will confirm within 2 hours.', ARRAY['appointment','book','meet','visit','consultation','schedule'])
    ON CONFLICT DO NOTHING;
  `);
  console.log('✅ Chatbot knowledge seeded\n');
  console.log('🎉 Database seeded successfully!');
  console.log('   Admin login: admin@buildpro.com / Admin@123\n');
  process.exit(0);
};

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
