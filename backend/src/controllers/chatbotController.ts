import { Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { pool } from '../config/database';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const chat = async (req: Request, res: Response) => {
  try {
    const { message, history = [] } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    // Fetch products and knowledge base
    const [products, inventory, knowledge] = await Promise.all([
      pool.query('SELECT name, slug, price_per_unit, unit, description, specifications FROM products WHERE is_active=true'),
      pool.query('SELECT p.name, i.current_stock, i.low_stock_threshold FROM inventory i JOIN products p ON p.id=i.product_id'),
      pool.query('SELECT category, question, answer FROM chatbot_knowledge WHERE is_active=true ORDER BY category')
    ]);

    const productInfo = products.rows.map(p =>
      `${p.name}: $${p.price_per_unit}/${p.unit} — ${p.description}`
    ).join('\n');

    const stockInfo = inventory.rows.map(i =>
      `${i.name}: ${i.current_stock} ${i.current_stock === 0 ? '(OUT OF STOCK)' : i.current_stock <= i.low_stock_threshold ? '(LOW STOCK)' : '(IN STOCK)'}`
    ).join('\n');

    const knowledgeText = knowledge.rows.map(k =>
      `Q: ${k.question}\nA: ${k.answer}`
    ).join('\n\n');

    const systemPrompt = `You are BuildBot, the AI assistant for BuildPro — a construction material supplier. You are helpful, professional, and knowledgeable.

PRODUCTS:
${productInfo}

CURRENT STOCK:
${stockInfo}

KNOWLEDGE BASE:
${knowledgeText}

INSTRUCTIONS:
- Answer questions about products, pricing, stock, delivery, and appointments
- Help customers with bulk order guidance and quantity estimation
- Be concise but thorough
- If asked about placing orders, guide them to the order form on the website
- If asked about appointments, guide them to the booking section
- For WhatsApp contact: ${process.env.WHATSAPP_NUMBER || '+1-555-BUILD'}
- Never make up information not in the knowledge base
- Always be friendly and professional`;

    const messages = [
      ...history.slice(-10).map((m: any) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: message }
    ];

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: systemPrompt,
      messages
    });

    const reply = response.content[0].type === 'text' ? response.content[0].text : '';
    res.json({ reply, usage: response.usage });
  } catch (err) {
    console.error('Chatbot error:', err);
    res.status(500).json({ error: 'Chatbot unavailable', reply: 'I apologize, I am temporarily unavailable. Please contact us directly at info@buildpro.com or WhatsApp.' });
  }
};

export const getKnowledge = async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT * FROM chatbot_knowledge ORDER BY category, id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch knowledge base' });
  }
};

export const addKnowledge = async (req: Request, res: Response) => {
  try {
    const { category, question, answer } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO chatbot_knowledge (category, question, answer) VALUES ($1,$2,$3) RETURNING *',
      [category, question, answer]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add knowledge' });
  }
};

export const updateKnowledge = async (req: Request, res: Response) => {
  try {
    const { category, question, answer, is_active } = req.body;
    const { rows } = await pool.query(
      'UPDATE chatbot_knowledge SET category=$1, question=$2, answer=$3, is_active=$4, updated_at=NOW() WHERE id=$5 RETURNING *',
      [category, question, answer, is_active, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update knowledge' });
  }
};

export const deleteKnowledge = async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM chatbot_knowledge WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete knowledge' });
  }
};
