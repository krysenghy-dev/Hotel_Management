require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

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
app.listen(PORT, () => {
  console.log(`HotelDesk server running at http://localhost:${PORT}`);
});
