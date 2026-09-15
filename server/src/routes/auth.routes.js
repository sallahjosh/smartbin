/**
 * Auth routes: register, login, me, logout, profile update.
 * JWT-based; roles: user | admin. Disabled accounts cannot log in.
 */
const express = require('express');
const { query, getPool } = require('../db');
const { signToken, verifyPassword, hashPassword, requireAuth } = require('../auth');
const { logActivity } = require('../status');

const router = express.Router();

function publicUser(u) {
  return {
    id: u.id,
    username: u.username,
    first_name: u.first_name ?? null,
    last_name: u.last_name ?? null,
    email: u.email,
    role: u.role,
    phone_number: u.phone_number ?? null,
    organization: u.organization ?? null,
    is_active: Number(u.is_active) === 1,
    created_at: u.created_at,
    last_login_at: u.last_login_at ?? null,
  };
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const firstName = String(req.body.first_name || '').trim();
    const lastName = String(req.body.last_name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const phone = String(req.body.phone_number || '').trim();
    const organization = String(req.body.organization || '').trim();
    const password = String(req.body.password || '');
    const confirmPassword = String(req.body.confirm_password || '');

    const errors = [];
    if (!firstName) errors.push('First name is required');
    if (!lastName) errors.push('Last name is required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Invalid email format');
    if (password.length < 8) errors.push('Password must be at least 8 characters long');
    if (password !== confirmPassword) errors.push('Passwords do not match');

    if (errors.length === 0) {
      const dup = await query('SELECT id FROM users WHERE email = ?', [email]);
      if (dup.length > 0) errors.push('Email already registered');
    }
    if (errors.length > 0) {
      return res.status(422).json({ success: false, message: errors.join('. '), errors });
    }

    // Unique username derived from the full name.
    let base = `${firstName}${lastName}`.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || email.split('@')[0].replace(/[^a-z0-9]+/g, '_');
    base = base.slice(0, 40);
    let username = base;
    let i = 1;
    while ((await query('SELECT id FROM users WHERE username = ?', [username])).length > 0) {
      username = `${base}_${i++}`.slice(0, 50);
    }

    const hashed = await hashPassword(password);
    const [result] = await getPool().execute(
      'INSERT INTO users (username, password, email, role, first_name, last_name, phone_number, organization) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [username, hashed, email, 'user', firstName, lastName, phone || null, organization || null]
    );

    const user = { id: result.insertId, username, email, role: 'user', first_name: firstName, last_name: lastName, phone_number: phone || null, organization: organization || null, is_active: 1 };
    await logActivity({ query }, { userId: user.id, action: 'register', entityType: 'user', entityId: user.id, detail: `Account created for ${email}` });
    return res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to SmartBin Cloud.',
      token: signToken(user),
      user: publicUser(user),
    });
  } catch (e) {
    console.error('Register error:', e.message);
    return res.status(500).json({ success: false, message: 'Registration failed: ' + e.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim();
    const password = String(req.body.password || '');
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    const rows = await query('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];
    if (!user || !(await verifyPassword(password, user.password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password. Please check your credentials.' });
    }
    if (Number(user.is_active) !== 1) {
      return res.status(403).json({ success: false, message: 'This account has been disabled. Contact an administrator.' });
    }
    await getPool().execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);
    await logActivity({ query }, { userId: user.id, action: 'login', entityType: 'user', entityId: user.id, detail: `Signed in`, ip: req.ip });
    return res.json({ success: true, token: signToken(user), user: publicUser(user), message: 'Login successful' });
  } catch (e) {
    console.error('Login error:', e.stack || e.message);
    return res.status(500).json({ success: false, message: 'An error occurred during login: ' + e.message });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const rows = await query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const user = rows[0];
    if (!user) return res.status(401).json({ success: false, message: 'User account not found' });
    if (Number(user.is_active) !== 1) return res.status(403).json({ success: false, message: 'Account disabled' });
    return res.json({ success: true, user: publicUser(user) });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Database error. Please try again later.' });
  }
});

// PUT /api/auth/profile — update own profile
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { first_name, last_name, phone_number, organization } = req.body;
    await getPool().execute(
      'UPDATE users SET first_name = COALESCE(?, first_name), last_name = COALESCE(?, last_name), phone_number = COALESCE(?, phone_number), organization = COALESCE(?, organization) WHERE id = ?',
      [first_name ?? null, last_name ?? null, phone_number ?? null, organization ?? null, req.user.id]
    );
    const rows = await query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    await logActivity({ query }, { userId: req.user.id, action: 'profile_update', entityType: 'user', entityId: req.user.id, detail: 'Profile updated' });
    return res.json({ success: true, message: 'Profile updated', user: publicUser(rows[0]) });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Update failed: ' + e.message });
  }
});

// POST /api/auth/logout (stateless JWT — client discards the token)
router.post('/logout', (req, res) => {
  return res.json({ success: true, message: 'Logged out' });
});

module.exports = router;
