const db = require('./database');

/** Insert a new notification. Call this from any route that performs
 *  an action worth surfacing in the notification bell (new booking,
 *  room status change, etc). */
function notify(message, type = 'info') {
  db.prepare(`INSERT INTO notifications (message, type) VALUES (?, ?)`).run(message, type);
}

module.exports = { notify };
