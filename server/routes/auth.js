const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// GET /api/auth/setup-status — does an account already exist?
router.get('/setup-status', (req, res) => {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM users').get();
  res.json({ needsSetup: n === 0 });
});

// POST /api/auth/setup — create the first admin account (only when none exists yet)
router.post('/setup', (req, res) => {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM users').get();
  if (n > 0) {
    return res.status(409).json({ error: 'Setup has already been completed. Please sign in instead.' });
  }

  const { username, password, fullName } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  if (username.trim().length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const hash = bcrypt.hashSync(password, 10);
  db.prepare(
    `INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, 'admin')`
  ).run(username.trim(), hash, (fullName || '').trim() || username.trim());

  const user = db.prepare('SELECT id, username, full_name, role FROM users WHERE username = ?').get(username.trim());
  const token = jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.status(201).json({
    token,
    user: { id: user.id, username: user.username, fullName: user.full_name, role: user.role },
  });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.json({
    token,
    user: { id: user.id, username: user.username, fullName: user.full_name, role: user.role },
  });
});

// GET /api/auth/me — verify current token & return user info
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, username, full_name, role FROM users WHERE id = ?').get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, username: user.username, fullName: user.full_name, role: user.role });
});

// PUT /api/auth/me — update profile (full name / username)
router.put('/me', requireAuth, (req, res) => {
  const { fullName, username } = req.body || {};
  if (!fullName && !username) {
    return res.status(400).json({ error: 'Nothing to update' });
  }
  if (username) {
    const clash = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username.trim(), req.user.sub);
    if (clash) return res.status(409).json({ error: 'That username is already taken' });
  }
  db.prepare(
    `UPDATE users SET full_name = COALESCE(?, full_name), username = COALESCE(?, username) WHERE id = ?`
  ).run(fullName ?? null, username ? username.trim() : null, req.user.sub);

  const user = db.prepare('SELECT id, username, full_name, role FROM users WHERE id = ?').get(req.user.sub);
  // Re-issue the token so a changed username stays correct without forcing re-login.
  const token = jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
  res.json({ token, user: { id: user.id, username: user.username, fullName: user.full_name, role: user.role } });
});

// PUT /api/auth/me/password — change password
router.put('/me/password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.sub);
  if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);
  res.json({ ok: true });
});

module.exports = router;
