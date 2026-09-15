/**
 * Authentication helpers (JWT).
 *
 * Replaces the PHP session-based auth. Tokens are signed with a server-side
 * secret (from .env) and carry { id, username, email, role }.
 */
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'smartbin_dev_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

/** Verify password (supports PHP's $2y$ bcrypt hashes via bcryptjs). */
async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

/** Hash a password (bcrypt, same algorithm family as PHP password_hash). */
async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

/**
 * Express middleware: require a valid Bearer token.
 * Populates req.user.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized' });
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'smartbin_dev_secret');
    return next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Session expired or invalid' });
  }
}

/** Express middleware: require the admin role. */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  return next();
}

module.exports = { signToken, verifyPassword, hashPassword, requireAuth, requireAdmin };