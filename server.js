require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const db = require('./server/db/database');
const { seedAll } = require('./server/db/seed');
const authRoutes = require('./server/routes/auth');
const roomsRoutes = require('./server/routes/rooms');
const guestsRoutes = require('./server/routes/guests');
const bookingsRoutes = require('./server/routes/bookings');
const dashboardRoutes = require('./server/routes/dashboard');
const notificationsRoutes = require('./server/routes/notifications');

// Make sure tables exist & demo data is seeded on first run.
seedAll();

const app = express();
app.use(cors());
app.use(express.json());

// Every /api/* response is live data (room/booking/guest counts, stats,
// etc.) — never let the browser (or an intermediate proxy) cache it.
// Without this, some browsers will silently reuse a stale response when
// the user navigates back to a page like dashboard.html after adding/
// editing data elsewhere, making it look like "nothing changed".
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// ---- REST API ----
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/guests', guestsRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationsRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

// ---- Static frontend ----
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---- Error handler ----
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`HotelDesk server running at http://localhost:${PORT}`);
});

// Flush any pending SQLite writes to disk and close cleanly instead of
// letting the host kill the process mid-write (e.g. on redeploy/restart).
function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
