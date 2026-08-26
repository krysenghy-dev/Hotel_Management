/* Seeds the database with demo rooms/guests/bookings/notifications so
   the app has something to look at right away. Deliberately does NOT
   create a default user account — the very first person to open the
   app is walked through a one-time setup screen (see
   public/js/auth.js + POST /api/auth/setup) to choose their own
   admin username and password instead of shipping a hardcoded
   admin/admin123 login. Safe to re-run: only inserts rows into empty
   tables. */
const db = require('./database');

function seedRooms() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM rooms').get().n;
  if (count > 0) return;
  const rooms = [
    { num: 101, floor: 1, type: 'Single', status: 'Occupied', price: 150 },
    { num: 102, floor: 1, type: 'Double', status: 'Occupied', price: 200 },
    { num: 103, floor: 1, type: 'Single', status: 'Maintenance', price: 150 },
    { num: 201, floor: 2, type: 'Suite', status: 'Occupied', price: 450 },
    { num: 202, floor: 2, type: 'Double', status: 'Available', price: 220 },
    { num: 203, floor: 2, type: 'Deluxe', status: 'Occupied', price: 300 },
    { num: 301, floor: 3, type: 'Suite', status: 'Occupied', price: 450 },
    { num: 302, floor: 3, type: 'Single', status: 'Available', price: 150 },
    { num: 303, floor: 3, type: 'Double', status: 'Available', price: 200 },
    { num: 304, floor: 3, type: 'Suite', status: 'Occupied', price: 450 },
    { num: 404, floor: 4, type: 'Single', status: 'Available', price: 150 },
    { num: 405, floor: 4, type: 'Double', status: 'Occupied', price: 200 },
    { num: 406, floor: 4, type: 'Single', status: 'Maintenance', price: 150 },
    { num: 407, floor: 4, type: 'Suite', status: 'Available', price: 450 },
    { num: 501, floor: 5, type: 'Single', status: 'Available', price: 150 },
    { num: 502, floor: 5, type: 'Double', status: 'Occupied', price: 200 },
    { num: 503, floor: 5, type: 'Single', status: 'Maintenance', price: 150 },
  ];
  const insert = db.prepare(
    `INSERT INTO rooms (room_number, floor, type, status, price) VALUES (?, ?, ?, ?, ?)`
  );
  const tx = db.transaction((list) => list.forEach(r => insert.run(r.num, r.floor, r.type, r.status, r.price)));
  tx(rooms);
  console.log(`Seeded ${rooms.length} rooms`);
}

function roomIdByNumber(num) {
  const row = db.prepare('SELECT id FROM rooms WHERE room_number = ?').get(num);
  return row ? row.id : null;
}

function seedGuests() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM guests').get().n;
  if (count > 0) return;
  const guests = [
    // room numbers below all exist in the seed room list above, and
    // 'Checked In' guests are only linked to rooms actually marked
    // Occupied — otherwise the dashboard's "checked in" and "occupied
    // rooms" stats disagree with each other, which is confusing.
    { name: 'Eleanor Shellstrop', code: 'G-1001', email: 'eleanor@example.com', phone: '+1 (555) 123-4567', room: 201, status: 'Checked In', visit: '2023-10-12' },
    { name: 'Chidi Anagonye', code: 'G-1002', email: 'chidi@example.com', phone: '+1 (555) 234-5678', room: 101, status: 'Checked In', visit: '2023-10-12' },
    { name: 'Tahani Al-Jamil', code: 'G-1003', email: 'tahani@example.com', phone: '+1 (555) 345-6789', room: 501, status: 'Reserved', visit: '2023-03-04' },
    { name: 'Jason Mendoza', code: 'G-1004', email: 'jason@example.com', phone: '+1 (555) 456-7890', room: null, status: 'Checked Out', visit: '2023-09-28' },
    { name: 'Michael Realman', code: 'G-1005', email: 'michael@example.com', phone: '+1 (555) 567-8901', room: 304, status: 'Checked In', visit: null },
    { name: 'Janet Della-Denunzio', code: 'G-1006', email: 'janet@example.com', phone: '+1 (555) 678-9012', room: 202, status: 'Reserved', visit: '2023-01-15' },
    { name: 'Mindy St. Claire', code: 'G-1007', email: 'mindy@example.com', phone: '+1 (555) 789-0123', room: null, status: 'Checked Out', visit: '2023-08-10' },
  ];
  const insert = db.prepare(
    `INSERT INTO guests (code, name, email, phone, room_id, status, last_visit) VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const tx = db.transaction((list) => list.forEach(g => {
    insert.run(g.code, g.name, g.email, g.phone, g.room ? roomIdByNumber(g.room) : null, g.status, g.visit);
  }));
  tx(guests);
  console.log(`Seeded ${guests.length} guests`);
}

function seedBookings() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM bookings').get().n;
  if (count > 0) return;
  const year = new Date().getFullYear();
  const bookings = [
    // room + type here must match an actual seeded room (see seedRooms)
    { name: 'Eleanor Shellstrop', code: 'BK-7829', room: 201, type: 'Suite', in: `${year}-10-12`, out: `${year}-10-15`, amount: 1250, status: 'Confirmed' },
    { name: 'Chidi Anagonye', code: 'BK-7830', room: 101, type: 'Single', in: `${year}-10-12`, out: `${year}-10-14`, amount: 450, status: 'Confirmed' },
    { name: 'Tahani Al-Jamil', code: 'BK-7831', room: 501, type: 'Single', in: `${year}-10-13`, out: `${year}-10-20`, amount: 3800, status: 'Pending' },
    { name: 'Jason Mendoza', code: 'BK-7832', room: null, type: 'Double', in: `${year}-10-14`, out: `${year}-10-16`, amount: 600, status: 'Cancelled' },
    { name: 'Michael Realman', code: 'BK-7833', room: 304, type: 'Suite', in: `${year}-10-15`, out: `${year}-10-18`, amount: 1500, status: 'Confirmed' },
  ];
  const insert = db.prepare(
    `INSERT INTO bookings (code, guest_name, room_id, room_type, check_in, check_out, amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const tx = db.transaction((list) => list.forEach(b => {
    insert.run(b.code, b.name, b.room ? roomIdByNumber(b.room) : null, b.type, b.in, b.out, b.amount, b.status);
  }));
  tx(bookings);
  console.log(`Seeded ${bookings.length} bookings`);
}

function seedNotifications() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM notifications').get().n;
  if (count > 0) return;
  const notifications = [
    { message: 'Welcome to HotelDesk! New bookings, room updates and account changes will show up here.', type: 'info', read: 1 },
    { message: 'New booking BK-7833 — Michael Realman (Suite, 3 nights)', type: 'booking', read: 0 },
    { message: 'Room 103 status changed to Maintenance', type: 'room', read: 0 },
  ];
  const insert = db.prepare(
    `INSERT INTO notifications (message, type, is_read) VALUES (?, ?, ?)`
  );
  const tx = db.transaction((list) => list.forEach(n => insert.run(n.message, n.type, n.read)));
  tx(notifications);
  console.log(`Seeded ${notifications.length} notifications`);
}

function seedAll() {
  seedRooms();
  seedGuests();
  seedBookings();
  seedNotifications();
}

if (require.main === module) {
  seedAll();
  console.log('Seeding complete.');
}

module.exports = { seedAll };
