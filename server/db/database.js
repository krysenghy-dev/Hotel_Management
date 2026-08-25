/* ----------------------------------------------------------------
   SQLite-backed implementation of the SQL schema in schema.sql.

   Uses Node's BUILT-IN `node:sqlite` module (ships with Node itself,
   no native compilation / Visual Studio Build Tools required, unlike
   better-sqlite3). Requires Node 22.5+ ; still "experimental" so it
   logs one warning on startup, that's expected and harmless.

   Table shapes mirror schema.sql exactly — swapping to real MySQL
   later just means pointing an ORM/driver at that file instead.
------------------------------------------------------------------*/
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = path.join(__dirname, 'hoteldesk.db');
const raw = new DatabaseSync(DB_PATH);
raw.exec('PRAGMA journal_mode = WAL');
raw.exec('PRAGMA foreign_keys = ON');

raw.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL DEFAULT '',
  role          TEXT NOT NULL DEFAULT 'front-desk',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rooms (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  room_number   INTEGER NOT NULL UNIQUE,
  floor         INTEGER NOT NULL,
  type          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'Available',
  price         REAL NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS guests (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  code          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT NOT NULL,
  room_id       INTEGER NULL REFERENCES rooms(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'Reserved',
  last_visit    TEXT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bookings (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  code          TEXT NOT NULL UNIQUE,
  guest_id      INTEGER NULL REFERENCES guests(id) ON DELETE SET NULL,
  guest_name    TEXT NOT NULL,
  room_id       INTEGER NULL REFERENCES rooms(id) ON DELETE SET NULL,
  room_type     TEXT NOT NULL,
  check_in      TEXT NOT NULL,
  check_out     TEXT NOT NULL,
  guests_count  INTEGER NOT NULL DEFAULT 1,
  amount        REAL NOT NULL,
  status        TEXT NOT NULL DEFAULT 'Pending',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_guests_status ON guests(status);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);

CREATE TABLE IF NOT EXISTS notifications (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  message       TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'info', -- info | booking | room | guest
  is_read       INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
`);

/* Thin wrapper around node:sqlite's StatementSync so the rest of the
   codebase (routes/seed) can keep using the familiar
   db.prepare(sql).all(...)/.get(...)/.run(...) shape, with .get()
   normalized to return null instead of undefined when there's no
   match (matches the behaviour the routes were written against). */
function prepare(sql) {
  const stmt = raw.prepare(sql);
  return {
    all: (...params) => stmt.all(...params),
    get: (...params) => stmt.get(...params) ?? null,
    run: (...params) => stmt.run(...params),
  };
}

function exec(sql) {
  return raw.exec(sql);
}

/* Minimal stand-in for better-sqlite3's db.transaction(fn) helper:
   returns a function that wraps the call in BEGIN/COMMIT (rolling
   back on error) and forwards its argument to fn. */
function transaction(fn) {
  return (arg) => {
    raw.exec('BEGIN');
    try {
      const result = fn(arg);
      raw.exec('COMMIT');
      return result;
    } catch (err) {
      raw.exec('ROLLBACK');
      throw err;
    }
  };
}

module.exports = { prepare, exec, transaction };
