const express = require('express');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/dashboard/stats
router.get('/stats', (req, res) => {
  const totalRooms = db.prepare('SELECT COUNT(*) AS n FROM rooms').get().n;
  const occupiedRooms = db.prepare("SELECT COUNT(*) AS n FROM rooms WHERE status = 'Occupied'").get().n;
  const availableRooms = db.prepare("SELECT COUNT(*) AS n FROM rooms WHERE status = 'Available'").get().n;
  const maintenanceRooms = db.prepare("SELECT COUNT(*) AS n FROM rooms WHERE status = 'Maintenance'").get().n;

  const totalGuests = db.prepare('SELECT COUNT(*) AS n FROM guests').get().n;
  const checkedInGuests = db.prepare("SELECT COUNT(*) AS n FROM guests WHERE status = 'Checked In'").get().n;

  const activeBookings = db.prepare("SELECT COUNT(*) AS n FROM bookings WHERE status IN ('Confirmed','Pending')").get().n;
  const revenue = db.prepare("SELECT COALESCE(SUM(amount),0) AS s FROM bookings WHERE status = 'Confirmed'").get().s;

  const occupancyRate = totalRooms ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  res.json({
    totalRooms,
    occupiedRooms,
    availableRooms,
    maintenanceRooms,
    occupancyRate,
    totalGuests,
    checkedInGuests,
    activeBookings,
    revenue,
  });
});

module.exports = router;
