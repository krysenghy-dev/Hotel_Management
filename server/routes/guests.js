const express = require('express');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function serializeGuest(g) {
  return {
    name: g.name,
    code: g.code,
    email: g.email,
    phone: g.phone,
    room: g.room_number ?? null,
    status: g.status,
    visit: g.last_visit || 'First Visit',
  };
}

const BASE_SELECT = `
  SELECT g.*, r.room_number AS room_number
  FROM guests g
  LEFT JOIN rooms r ON r.id = g.room_id
`;

// GET /api/guests  (optional ?q= search across name/email/phone)
router.get('/', (req, res) => {
  const { q } = req.query;
  let sql = BASE_SELECT + ' WHERE 1=1';
  const params = [];
  if (q) {
    sql += ' AND (LOWER(g.name) LIKE ? OR LOWER(g.email) LIKE ? OR LOWER(g.phone) LIKE ?)';
    const needle = `%${q.toLowerCase()}%`;
    params.push(needle, needle, needle);
  }
  sql += ' ORDER BY g.created_at DESC';
  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(serializeGuest));
});

// GET /api/guests/:code
router.get('/:code', (req, res) => {
  const row = db.prepare(BASE_SELECT + ' WHERE g.code = ?').get(req.params.code);
  if (!row) return res.status(404).json({ error: 'Guest not found' });
  res.json(serializeGuest(row));
});

// POST /api/guests — create a guest
router.post('/', (req, res) => {
  const { name, email, phone, room, status } = req.body || {};
  if (!name || !email || !phone) {
    return res.status(400).json({ error: 'name, email and phone are required' });
  }
  const last = db.prepare("SELECT code FROM guests ORDER BY id DESC LIMIT 1").get();
  const nextNum = last ? Number(last.code.split('-')[1]) + 1 : 1001;
  const code = `G-${nextNum}`;

  let roomId = null;
  if (room) {
    const r = db.prepare('SELECT id FROM rooms WHERE room_number = ?').get(Number(room));
    roomId = r ? r.id : null;
  }

  db.prepare(
    `INSERT INTO guests (code, name, email, phone, room_id, status, last_visit)
     VALUES (?, ?, ?, ?, ?, ?, date('now'))`
  ).run(code, name, email, phone, roomId, status || 'Reserved');

  const row = db.prepare(BASE_SELECT + ' WHERE g.code = ?').get(code);
  res.status(201).json(serializeGuest(row));
});

// PUT /api/guests/:code — update a guest
router.put('/:code', (req, res) => {
  const existing = db.prepare('SELECT * FROM guests WHERE code = ?').get(req.params.code);
  if (!existing) return res.status(404).json({ error: 'Guest not found' });

  const { name, email, phone, room, status } = req.body || {};
  let roomId = existing.room_id;
  if (room !== undefined) {
    const r = room ? db.prepare('SELECT id FROM rooms WHERE room_number = ?').get(Number(room)) : null;
    roomId = r ? r.id : null;
  }

  db.prepare(
    `UPDATE guests SET name = COALESCE(?, name), email = COALESCE(?, email),
     phone = COALESCE(?, phone), room_id = ?, status = COALESCE(?, status)
     WHERE code = ?`
  ).run(name ?? null, email ?? null, phone ?? null, roomId, status ?? null, req.params.code);

  const row = db.prepare(BASE_SELECT + ' WHERE g.code = ?').get(req.params.code);
  res.json(serializeGuest(row));
});

// DELETE /api/guests/:code
router.delete('/:code', (req, res) => {
  const info = db.prepare('DELETE FROM guests WHERE code = ?').run(req.params.code);
  if (info.changes === 0) return res.status(404).json({ error: 'Guest not found' });
  res.status(204).send();
});

module.exports = router;
