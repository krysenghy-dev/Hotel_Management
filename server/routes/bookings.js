const express = require('express');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');
const { notify } = require('../db/notifications');

const router = express.Router();
router.use(requireAuth);

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
}

function serializeBooking(b) {
  return {
    name: b.guest_name,
    code: b.code,
    room: b.room_number ?? '—',
    type: b.room_type,
    in: fmtDate(b.check_in),
    out: fmtDate(b.check_out),
    amount: `$${Number(b.amount).toLocaleString()}`,
    status: b.status,
  };
}

const BASE_SELECT = `
  SELECT b.*, r.room_number AS room_number
  FROM bookings b
  LEFT JOIN rooms r ON r.id = b.room_id
`;

// GET /api/bookings  (optional ?limit= for "recent bookings" widgets, ?status=)
router.get('/', (req, res) => {
  const { limit, status } = req.query;
  let sql = BASE_SELECT + ' WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND b.status = ?'; params.push(status); }
  sql += ' ORDER BY b.created_at DESC';
  if (limit) { sql += ' LIMIT ?'; params.push(Number(limit)); }
  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(serializeBooking));
});

// POST /api/bookings — create a booking (server computes nights/amount)
router.post('/', (req, res) => {
  const { firstName, lastName, email, phone, roomTypeLabel, ratePerNight, checkIn, checkOut, guestsCount, roomNumber } = req.body || {};

  if (!firstName || !lastName || !email || !checkIn || !checkOut || !roomTypeLabel || !ratePerNight) {
    return res.status(400).json({ error: 'Please fill in all required fields' });
  }

  const inD = new Date(checkIn);
  const outD = new Date(checkOut);
  if (isNaN(inD) || isNaN(outD) || outD <= inD) {
    return res.status(400).json({ error: 'Check-out must be after check-in' });
  }
  const nights = Math.max(1, Math.round((outD - inD) / 86400000));
  const amount = nights * Number(ratePerNight);

  const code = 'BK-' + Math.floor(1000 + Math.random() * 9000);

  let roomId = null;
  if (roomNumber) {
    const r = db.prepare('SELECT id FROM rooms WHERE room_number = ?').get(Number(roomNumber));
    roomId = r ? r.id : null;
  }

  // Reserved | Checked In | Checked Out, judged against today's date so
  // it lines up with the room's real occupancy rather than a status
  // that's set once and never revisited.
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const guestStatus = outD <= today ? 'Checked Out' : (inD <= today ? 'Checked In' : 'Reserved');
  const guestName = `${firstName} ${lastName}`;

  // One guest identity per email — new bookings for a returning guest
  // update their existing record (room/status/last-visit) instead of
  // creating a duplicate, so "Total Guests" reflects distinct people.
  const existingGuest = db.prepare('SELECT id FROM guests WHERE email = ?').get(email);
  let guestId;
  if (existingGuest) {
    db.prepare(
      `UPDATE guests SET name = ?, phone = COALESCE(NULLIF(?, ''), phone), room_id = ?, status = ?, last_visit = date('now') WHERE id = ?`
    ).run(guestName, phone || '', roomId, guestStatus, existingGuest.id);
    guestId = existingGuest.id;
  } else {
    const last = db.prepare("SELECT code FROM guests ORDER BY id DESC LIMIT 1").get();
    const nextNum = last ? Number(last.code.split('-')[1]) + 1 : 1001;
    const guestCode = `G-${nextNum}`;
    const info = db.prepare(
      `INSERT INTO guests (code, name, email, phone, room_id, status, last_visit) VALUES (?, ?, ?, ?, ?, ?, date('now'))`
    ).run(guestCode, guestName, email, phone || '', roomId, guestStatus);
    guestId = info.lastInsertRowid;
  }

  db.prepare(
    `INSERT INTO bookings (code, guest_id, guest_name, room_id, room_type, check_in, check_out, guests_count, amount, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Confirmed')`
  ).run(code, guestId, guestName, roomId, roomTypeLabel, checkIn, checkOut, Number(guestsCount) || 1, amount);
  notify(`New booking ${code} — ${guestName} (${roomTypeLabel}, ${nights} night${nights > 1 ? 's' : ''})`, 'booking');

  // A guest physically in the hotel means their room is occupied — keep
  // the room list in sync with what the booking just implied, so the
  // dashboard's "occupied rooms" and "checked in" numbers agree.
  if (roomId && guestStatus === 'Checked In') {
    db.prepare(`UPDATE rooms SET status = 'Occupied', updated_at = datetime('now') WHERE id = ?`).run(roomId);
  }

  const row = db.prepare(BASE_SELECT + ' WHERE b.code = ?').get(code);
  res.status(201).json(serializeBooking(row));
});

// PUT /api/bookings/:code/status — update booking status
router.put('/:code/status', (req, res) => {
  const { status } = req.body || {};
  if (!['Confirmed', 'Pending', 'Cancelled'].includes(status)) {
    return res.status(400).json({ error: 'status must be Confirmed, Pending or Cancelled' });
  }
  const info = db.prepare('UPDATE bookings SET status = ? WHERE code = ?').run(status, req.params.code);
  if (info.changes === 0) return res.status(404).json({ error: 'Booking not found' });
  const row = db.prepare(BASE_SELECT + ' WHERE b.code = ?').get(req.params.code);
  res.json(serializeBooking(row));
});

// DELETE /api/bookings/:code
router.delete('/:code', (req, res) => {
  const info = db.prepare('DELETE FROM bookings WHERE code = ?').run(req.params.code);
  if (info.changes === 0) return res.status(404).json({ error: 'Booking not found' });
  res.status(204).send();
});

module.exports = router;
