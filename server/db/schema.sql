-- =====================================================================
-- HotelDesk — SQL schema
-- Written in portable ANSI/MySQL-flavoured SQL. The app itself runs on
-- SQLite (see database.js) for a zero-config demo, but this file is
-- what you'd run against a real MySQL 8 / MariaDB server in production
-- (matches the original Laravel + MySQL stack proposed in the deck).
-- =====================================================================

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTO_INCREMENT,
  username      VARCHAR(100)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  full_name     VARCHAR(150)  NOT NULL DEFAULT '',
  role          VARCHAR(30)   NOT NULL DEFAULT 'front-desk', -- admin | front-desk
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rooms (
  id            INTEGER PRIMARY KEY AUTO_INCREMENT,
  room_number   INTEGER       NOT NULL UNIQUE,
  floor         INTEGER       NOT NULL,
  type          VARCHAR(30)   NOT NULL,               -- Single | Double | Deluxe | Suite
  status        VARCHAR(20)   NOT NULL DEFAULT 'Available', -- Available | Occupied | Maintenance
  price         DECIMAL(10,2) NOT NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS guests (
  id            INTEGER PRIMARY KEY AUTO_INCREMENT,
  code          VARCHAR(20)   NOT NULL UNIQUE,          -- e.g. G-1001
  name          VARCHAR(150)  NOT NULL,
  email         VARCHAR(150)  NOT NULL,
  phone         VARCHAR(40)   NOT NULL,
  room_id       INTEGER       NULL REFERENCES rooms(id) ON DELETE SET NULL,
  status        VARCHAR(20)   NOT NULL DEFAULT 'Reserved', -- Checked In | Reserved | Checked Out
  last_visit    DATE          NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
  id            INTEGER PRIMARY KEY AUTO_INCREMENT,
  code          VARCHAR(20)   NOT NULL UNIQUE,          -- e.g. BK-7829
  guest_id      INTEGER       NULL REFERENCES guests(id) ON DELETE SET NULL,
  guest_name    VARCHAR(150)  NOT NULL,                 -- denormalized snapshot at booking time
  room_id       INTEGER       NULL REFERENCES rooms(id) ON DELETE SET NULL,
  room_type     VARCHAR(30)   NOT NULL,
  check_in      DATE          NOT NULL,
  check_out     DATE          NOT NULL,
  guests_count  INTEGER       NOT NULL DEFAULT 1,
  amount        DECIMAL(10,2) NOT NULL,
  status        VARCHAR(20)   NOT NULL DEFAULT 'Pending', -- Confirmed | Pending | Cancelled
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_dates ON bookings(check_in, check_out);
CREATE INDEX idx_guests_status ON guests(status);
CREATE INDEX idx_rooms_status ON rooms(status);

CREATE TABLE IF NOT EXISTS notifications (
  id            INTEGER PRIMARY KEY AUTO_INCREMENT,
  message       VARCHAR(255) NOT NULL,
  type          VARCHAR(20)  NOT NULL DEFAULT 'info', -- info | booking | room | guest
  is_read       TINYINT(1)   NOT NULL DEFAULT 0,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_read ON notifications(is_read);
