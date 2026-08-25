# HotelDesk — Hotel Management System (Full Stack)

A complete hotel front-desk system: the original HTML/CSS/JS mockups,
now backed by a real **SQL database** and a **REST API backend**
(Node.js + Express). No more localStorage — rooms, guests, and
bookings are stored in an actual database and shared across anyone
using the app.

## Stack

- **Frontend**: HTML / CSS / vanilla JS (unchanged look & feel, `public/`)
- **Backend**: Node.js + Express (`server.js`, `server/routes/*`)
- **Database**: SQLite via Node's **built-in** `node:sqlite` module
  (zero-config, single file: `server/db/hoteldesk.db`, no native
  compiler/Visual Studio Build Tools required — it ships with Node
  22.5+). It logs one "experimental feature" warning on startup;
  that's expected. The schema (`server/db/schema.sql`) is written in
  portable SQL, so pointing the app at MySQL/MariaDB instead (the
  stack the original slide deck proposed) only means swapping the
  driver in `server/db/database.js`.
- **Auth**: JWT bearer tokens + bcrypt-hashed passwords

## Project structure

```
hoteldesk/
├── server.js                 Express app entry point (serves API + static frontend)
├── package.json
├── .env.example               Copy to .env to override PORT / JWT_SECRET
├── server/
│   ├── db/
│   │   ├── schema.sql          Reference SQL DDL (MySQL/ANSI-flavoured)
│   │   ├── database.js         SQLite connection + table creation
│   │   └── seed.js             Seeds default admin user + demo rooms/guests/bookings
│   ├── middleware/
│   │   └── auth.js             JWT verification middleware
│   └── routes/
│       ├── auth.js             POST /api/auth/login, GET /api/auth/me
│       ├── rooms.js            /api/rooms (list/create/update/cycle-status/delete)
│       ├── guests.js           /api/guests (list/search/create/update/delete)
│       ├── bookings.js         /api/bookings (list/create/update-status/delete)
│       └── dashboard.js        /api/dashboard/stats
└── public/                     Frontend (served statically by Express)
    ├── index.html / dashboard.html / rooms.html / booking.html / guests.html
    ├── css/style.css
    └── js/
        ├── data.js              API client (replaces old localStorage Store)
        ├── common.js             Auth guard, sidebar, toast
        ├── auth.js / dashboard.js / rooms.js / booking.js / guests.js
```

## Running it

```bash
cd hoteldesk
npm install
npm start
```

Requires **Node.js 22.5 or newer** (for the built-in `node:sqlite`
module — check with `node --version`; update Node if it's older).

Then open **http://localhost:3000**.

On first launch, since there's no account yet, you'll land on a
**Create Account** screen instead of the login form — pick your own
username and password there (min 6 characters). That's stored in the
database and used to sign in from then on.

If you ever want to redo that (forgot your password, want a clean
demo login, etc.) without wiping your rooms/bookings/guests data:

```bash
npm run reset-account
```

This deletes just the account(s) — the app will show the Create
Account screen again next time you open it.

To reset **everything** (rooms, guests, bookings, notifications, and
accounts) back to a clean seeded state:

```bash
rm server/db/hoteldesk.db*
npm run seed
```

## API overview

All `/api/*` routes except `/api/auth/login` and `/api/health` require
a bearer token: `Authorization: Bearer <token>` (obtained from
`POST /api/auth/login`).

| Method | Endpoint                          | Description                          |
|--------|------------------------------------|---------------------------------------|
| GET    | `/api/auth/setup-status`           | Whether a first-run account still needs to be created |
| POST   | `/api/auth/setup`                  | Create the first admin account (only works once) |
| POST   | `/api/auth/login`                  | Log in, returns `{ token, user }`     |
| GET    | `/api/auth/me`                     | Current user info                     |
| GET    | `/api/rooms`                       | List rooms (`?type=&status=&floor=`)  |
| POST   | `/api/rooms`                       | Create a room                         |
| PUT    | `/api/rooms/:num`                  | Update a room                         |
| PATCH  | `/api/rooms/:num/cycle-status`     | Cycle Available→Occupied→Maintenance  |
| DELETE | `/api/rooms/:num`                  | Delete a room                         |
| GET    | `/api/guests`                      | List/search guests (`?q=`)            |
| POST   | `/api/guests`                      | Create a guest                        |
| PUT    | `/api/guests/:code`                | Update a guest                        |
| DELETE | `/api/guests/:code`                | Delete a guest                        |
| GET    | `/api/bookings`                    | List bookings (`?limit=&status=`)     |
| POST   | `/api/bookings`                    | Create a booking (server computes nights/total) |
| PUT    | `/api/bookings/:code/status`       | Update booking status                 |
| DELETE | `/api/bookings/:code`              | Delete a booking                      |
| GET    | `/api/dashboard/stats`             | Aggregate stats for the dashboard     |
| GET    | `/api/notifications`               | List notifications (`?unread=true&limit=`) |
| GET    | `/api/notifications/unread-count`  | Unread notification count             |
| PATCH  | `/api/notifications/:id/read`      | Mark one notification as read         |
| PATCH  | `/api/notifications/read-all`      | Mark all notifications as read        |
| PUT    | `/api/auth/me`                     | Update profile (full name / username) |
| PUT    | `/api/auth/me/password`            | Change password                       |

## How it works now

- **First launch**: with an empty `users` table, the login page shows
  a one-time **Create Account** form (`GET /api/auth/setup-status` →
  `POST /api/auth/setup`) instead of the sign-in form, so you choose
  your own username/password rather than a hardcoded default. Once an
  account exists, `/api/auth/setup` refuses further calls (409) and
  the login page always shows the normal sign-in form.
- **Sign in** authenticates against the `users` table (bcrypt-hashed
  password) and returns a JWT, stored in `sessionStorage`. Every page
  sends it as a bearer token; an expired/missing token bounces back
  to the login screen.
- **Rooms, bookings, and guests** live in SQL tables
  (`server/db/schema.sql`) with foreign keys linking guests/bookings
  to rooms. Changes persist in the database and are visible to every
  browser/user hitting the same server — this is a real shared
  backend, not per-browser localStorage.
- Booking totals (nights × rate) are computed **server-side** so the
  amount can't be tampered with from the browser.
- Click a room card's **Edit** button to cycle its status
  (Available → Occupied → Maintenance → Available) via
  `PATCH /api/rooms/:num/cycle-status`.
- **Notifications**: the bell icon in the top bar shows a live unread
  count and a dropdown of recent activity. New bookings, new rooms,
  and room status changes automatically create a notification
  server-side. Click a notification to mark it read, or "Mark all
  read" to clear the badge.
- **Manage Account**: click the avatar in the top bar to open the
  account menu, then "Manage Account" for a modal with two tabs —
  updating your full name/username, and changing your password
  (verified against your current password server-side).

## Moving to MySQL in production

`server/db/schema.sql` is the reference schema. To run against real
MySQL/MariaDB instead of the bundled SQLite file:

1. Run `schema.sql` against your MySQL database.
2. Replace `server/db/database.js` with a `mysql2` connection pool
   exposing the same `prepare(...).all()/.get()/.run()`-style calls
   used throughout `server/routes/*.js` (or swap in an ORM like
   Prisma/Sequelize and adjust the route files' queries accordingly).
3. Set `JWT_SECRET` and DB credentials via environment variables
   (see `.env.example`).
