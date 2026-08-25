const express = require('express');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');
const { notify } = require('../db/notifications');

const router = express.Router();
router.use(requireAuth);

function serializeRoom(r) {
  return { num: r.room_number, floor: r.floor, type: r.type, status: r.status, price: r.price };
}

// GET /api/rooms  (optional ?type=&status=&floor= filters)
router.get('/', (req, res) => {
  const { type, status, floor } = req.query;
  let sql = 'SELECT * FROM rooms WHERE 1=1';
  const params = [];
  if (type) { sql += ' AND type = ?'; params.push(type); }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (floor) { sql += ' AND floor = ?'; params.push(Number(floor)); }
  sql += ' ORDER BY room_number ASC';
  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(serializeRoom));
});

// POST /api/rooms — create a new room
router.post('/', (req, res) => {
  const { num, floor, type, price, status } = req.body || {};
  if (!num || !floor || !type || price == null) {
    return res.status(400).json({ error: 'num, floor, type and price are required' });
  }
  const exists = db.prepare('SELECT id FROM rooms WHERE room_number = ?').get(Number(num));
  if (exists) {
    return res.status(409).json({ error: `Room ${num} already exists` });
  }
  db.prepare(
    `INSERT INTO rooms (room_number, floor, type, status, price) VALUES (?, ?, ?, ?, ?)`
  ).run(Number(num), Number(floor), type, status || 'Available', Number(price));
  notify(`Room ${num} added to inventory`, 'room');
  const row = db.prepare('SELECT * FROM rooms WHERE room_number = ?').get(Number(num));
  res.status(201).json(serializeRoom(row));
});

// PUT /api/rooms/:num — update a room (status, price, floor, type)
router.put('/:num', (req, res) => {
  const num = Number(req.params.num);
  const row = db.prepare('SELECT * FROM rooms WHERE room_number = ?').get(num);
  if (!row) return res.status(404).json({ error: 'Room not found' });

  const { status, price, floor, type } = req.body || {};
  db.prepare(
    `UPDATE rooms SET status = COALESCE(?, status), price = COALESCE(?, price),
     floor = COALESCE(?, floor), type = COALESCE(?, type), updated_at = datetime('now')
     WHERE room_number = ?`
  ).run(status ?? null, price ?? null, floor ?? null, type ?? null, num);

  const updated = db.prepare('SELECT * FROM rooms WHERE room_number = ?').get(num);
  res.json(serializeRoom(updated));
});

// PATCH /api/rooms/:num/cycle-status — Available -> Occupied -> Maintenance -> Available
router.patch('/:num/cycle-status', (req, res) => {
  const num = Number(req.params.num);
  const row = db.prepare('SELECT * FROM rooms WHERE room_number = ?').get(num);
  if (!row) return res.status(404).json({ error: 'Room not found' });

  const cycle = { Available: 'Occupied', Occupied: 'Maintenance', Maintenance: 'Available' };
  const next = cycle[row.status] || 'Available';
  db.prepare(`UPDATE rooms SET status = ?, updated_at = datetime('now') WHERE room_number = ?`).run(next, num);
  notify(`Room ${num} status changed to ${next}`, 'room');

  const updated = db.prepare('SELECT * FROM rooms WHERE room_number = ?').get(num);
  res.json(serializeRoom(updated));
});

// DELETE /api/rooms/:num
router.delete('/:num', (req, res) => {
  const num = Number(req.params.num);
  const info = db.prepare('DELETE FROM rooms WHERE room_number = ?').run(num);
  if (info.changes === 0) return res.status(404).json({ error: 'Room not found' });
  res.status(204).send();
});

module.exports = router;
