const express = require('express');
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM notifications WHERE recipient_id=$1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    const unread = await query(
      'SELECT COUNT(*) FROM notifications WHERE recipient_id=$1 AND is_read=false',
      [req.user.id]
    );
    res.json({ notifications: result.rows, unread_count: parseInt(unread.rows[0].count) });
  } catch (err) { next(err); }
});

router.patch('/mark-read', authenticate, async (req, res, next) => {
  try {
    await query('UPDATE notifications SET is_read=true WHERE recipient_id=$1', [req.user.id]);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) { next(err); }
});

router.patch('/:id/read', authenticate, async (req, res, next) => {
  try {
    await query('UPDATE notifications SET is_read=true WHERE id=$1 AND recipient_id=$2', [req.params.id, req.user.id]);
    res.json({ message: 'Notification marked as read' });
  } catch (err) { next(err); }
});

module.exports = router;
