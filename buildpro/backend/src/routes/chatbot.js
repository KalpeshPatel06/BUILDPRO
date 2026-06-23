const express = require('express');
const { query } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// POST /api/chatbot/message - AI-powered chat
router.post('/message', async (req, res, next) => {
  try {
    const { message, conversation_history = [] } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message required' });

    // Fetch dynamic knowledge base
    const knowledge = await query(`
      SELECT category, question, answer FROM chatbot_knowledge WHERE is_active=true ORDER BY category
    `);

    // Fetch live product/inventory data
    const products = await query(`
      SELECT p.name, p.price_per_unit, p.unit, p.description, i.current_stock,
        CASE WHEN i.current_stock=0 THEN 'OUT OF STOCK' WHEN i.current_stock<=i.low_stock_threshold THEN 'LOW STOCK' ELSE 'IN STOCK' END as status
      FROM products p LEFT JOIN inventory i ON p.id=i.product_id WHERE p.is_active=true
    `);

    const knowledgeText = knowledge.rows.map(k => `Q: ${k.question}\nA: ${k.answer}`).join('\n\n');
    const productText = products.rows.map(p =>
      `${p.name}: $${p.price_per_unit}/${p.unit} | Stock: ${p.current_stock} ${p.unit}s (${p.status})`
    ).join('\n');

    const systemPrompt = `You are BuildBot, a friendly and knowledgeable AI assistant for BuildPro, a construction materials supplier. 
You help customers with product information, pricing, stock availability, bulk order guidance, delivery info, and appointment booking.
Always be professional, concise, and helpful. For complex orders, guide users to fill the order form on the website.

CURRENT PRODUCT INVENTORY (live data):
${productText}

KNOWLEDGE BASE:
${knowledgeText}

RULES:
- Only discuss BuildPro products (Cement, Iron Rods, Concrete Blocks, Cement Pipes)
- Always mention if a product is low stock or out of stock
- For orders: direct to website order form or WhatsApp
- For appointments: available Mon-Fri 9AM-4PM
- Keep responses under 150 words unless technical details are needed
- Use bullet points for lists`;

    if (process.env.ANTHROPIC_API_KEY) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          system: systemPrompt,
          messages: [
            ...conversation_history.slice(-10),
            { role: 'user', content: message }
          ]
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      return res.json({ reply: data.content[0].text, source: 'ai' });
    }

    // Fallback: rule-based responses
    const m = message.toLowerCase();
    let reply = "I can help with product info, pricing, stock, ordering, delivery, and appointments. What do you need?";
    if (m.includes('cement') && !m.includes('pipe')) {
      const c = products.rows.find(p => p.name === 'Cement');
      reply = c ? `Cement (OPC 53 grade): $${c.price_per_unit}/bag. Currently ${c.status}: ${c.current_stock} bags available. Min order: 100 bags.` : "Cement info unavailable.";
    } else if (m.includes('iron') || m.includes('rod') || m.includes('steel')) {
      const p = products.rows.find(p => p.name === 'Iron Rods');
      reply = p ? `Iron Rods (Fe500 TMT): $${p.price_per_unit}/kg. Status: ${p.status} — ${p.current_stock} rods. Available 8–32mm diameters.` : "Iron rod info unavailable.";
    } else if (m.includes('block')) {
      const p = products.rows.find(p => p.name === 'Concrete Blocks');
      reply = p ? `Concrete Blocks (400×200×200mm): $${p.price_per_unit}/unit. ${p.status}: ${p.current_stock} units. Min order: 500.` : "Block info unavailable.";
    } else if (m.includes('pipe')) {
      const p = products.rows.find(p => p.name === 'Cement Pipes');
      reply = p ? `Cement Pipes (150–600mm dia): $${p.price_per_unit}/pipe. Status: ${p.status}${p.current_stock === 0 ? ' — Restocking soon.' : ': ' + p.current_stock + ' available.'}` : "Pipe info unavailable.";
    } else if (m.includes('order')) {
      reply = "To place a bulk order: fill the form on the Customer page with your name, contact, product, quantity and delivery address. We confirm within 24 hours! Or WhatsApp us for instant response.";
    } else if (m.includes('delivery')) {
      reply = "Delivery times: City area 2-3 days, Out-of-city 4-7 days. Free delivery on orders over $5,000. Express available on request.";
    } else if (m.includes('appointment') || m.includes('book')) {
      reply = "Book an appointment via the Customer page. Available Mon–Fri 9AM–4PM, Saturday 9AM–1PM. Slots fill up fast — book early!";
    } else if (m.includes('price') || m.includes('cost') || m.includes('how much')) {
      reply = products.rows.map(p => `• ${p.name}: $${p.price_per_unit}/${p.unit}`).join('\n');
    } else if (m.includes('stock') || m.includes('available')) {
      reply = "Current stock:\n" + products.rows.map(p => `• ${p.name}: ${p.current_stock} ${p.unit}s (${p.status})`).join('\n');
    }

    res.json({ reply, source: 'rules' });
  } catch (err) { next(err); }
});

// GET /api/chatbot/knowledge - admin
router.get('/knowledge', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM chatbot_knowledge ORDER BY category, created_at DESC');
    res.json({ knowledge: result.rows });
  } catch (err) { next(err); }
});

// POST /api/chatbot/knowledge - admin
router.post('/knowledge', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { category, question, answer, keywords } = req.body;
    if (!category || !question || !answer) return res.status(400).json({ error: 'Category, question and answer required' });
    const result = await query(
      'INSERT INTO chatbot_knowledge (category, question, answer, keywords, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [category, question, answer, keywords || [], req.user.id]
    );
    res.status(201).json({ knowledge: result.rows[0] });
  } catch (err) { next(err); }
});

// DELETE /api/chatbot/knowledge/:id - admin
router.delete('/knowledge/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    await query('UPDATE chatbot_knowledge SET is_active=false WHERE id=$1', [req.params.id]);
    res.json({ message: 'Knowledge entry removed' });
  } catch (err) { next(err); }
});

module.exports = router;
