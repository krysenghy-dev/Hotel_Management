const express = require('express');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function serialize(n) {
  return { id: n.id, message: n.message, type: n.type, read: !!n.is_read, createdAt: n.created_at };
}

// GET /api/notifications  (?unread=true, ?limit=)
router.get('/', (req, res) => {
  const { unread, limit } = req.query;
  let sql = 'SELECT * FROM notifications WHERE 1=1';
  const params = [];
  if (unread === 'true') sql += ' AND is_read = 0';
  sql += ' ORDER BY created_at DESC';
  if (limit) { sql += ' LIMIT ?'; params.push(Number(limit)); }
  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(serialize));
});

// GET /api/notifications/unread-count
router.get('/unread-count', (req, res) => {
  const row = db.prepare('SELECT COUNT(*) AS n FROM notifications WHERE is_read = 0').get();
  res.json({ count: row.n });
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', (req, res) => {
  const info = db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(Number(req.params.id));
  if (info.changes === 0) return res.status(404).json({ error: 'Notification not found' });
  res.json({ ok: true });
});

// PATCH /api/notifications/read-all
router.patch('/read-all', (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE is_read = 0').run();
  res.json({ ok: true });
});

module.exports = router;
