/* Deletes all accounts so the next server start / page load shows the
   first-run "Create Account" screen again. Leaves rooms, guests,
   bookings and notifications untouched — only the login is reset.

   Usage:  npm run reset-account
*/
const db = require('./database');

const { n } = db.prepare('SELECT COUNT(*) AS n FROM users').get();
db.prepare('DELETE FROM users').run();

console.log(
  n > 0
    ? `Removed ${n} account${n > 1 ? 's' : ''}. Restart the server and open the app — you'll be asked to create a new username and password.`
    : 'No accounts existed. Restart the server and open the app to create one.'
);
