/**
 * Users + admin routes.
 *
 *   GET    /api/users            — admin: list users with bin counts
 *   PUT    /api/users/:id/active — admin: enable/disable account
 *   PUT    /api/users/:id/role   — admin: change role
 *   DELETE /api/users/:id        — admin: delete account
 *   GET    /api/users/me/activity — current user's activity feed
 *   GET    /api/users/activity   — admin: all user activity
 *   GET    /api/users/stats      — admin: user stats
 */
const express = require('express');
const { query, getPool } = require('../db');
const { requireAuth, requireAdmin } = require('../auth');
const { logActivity } = require('../status');

const router = express.Router();

// ── Admin: list users ───────────────────────────────────────────────────────
router.get('/', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const rows = await query(
      `SELECT u.id, u.username, u.first_name, u.last_name, u.email, u.role, u.phone_number,
              u.organization, u.is_active, u.created_at, u.last_login_at,
              (SELECT COUNT(*) FROM dustbins d WHERE d.owner_id = u.id) AS bin_count
       FROM users u ORDER BY u.created_at DESC`
    );
    return res.json({ success: true, users: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

// ── Admin: enable/disable ───────────────────────────────────────────────────
router.put('/:id(\\d+)/active', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const active = Number(req.body.is_active) ? 1 : 0;
    if (id === Number(req.user.id)) {
      return res.status(400).json({ success: false, message: 'You cannot disable your own account' });
    }
    const [r] = await getPool().execute('UPDATE users SET is_active = ? WHERE id = ?', [active, id]);
    if (r.affectedRows === 0) return res.status(404).json({ success: false, message: 'User not found' });
    await logActivity({ query }, { userId: req.user.id, action: 'user_' + (active ? 'activate' : 'disable'), entityType: 'user', entityId: id, detail: `Account ${active ? 'enabled' : 'disabled'} by admin` });
    return res.json({ success: true, message: `Account ${active ? 'enabled' : 'disabled'}` });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

// ── Admin: change role ──────────────────────────────────────────────────────
router.put('/:id(\\d+)/role', requireAuth, requireAdmin, async (req, res) => {
  try {
    const role = req.body.role;
    if (!['user', 'admin'].includes(role)) return res.status(400).json({ success: false, message: 'Invalid role' });
    const id = Number(req.params.id);
    if (id === Number(req.user.id)) return res.status(400).json({ success: false, message: 'You cannot change your own role' });
    const [r] = await getPool().execute('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    if (r.affectedRows === 0) return res.status(404).json({ success: false, message: 'User not found' });
    await logActivity({ query }, { userId: req.user.id, action: 'user_role_change', entityType: 'user', entityId: id, detail: `Role changed to ${role}` });
    return res.json({ success: true, message: `Role updated to ${role}` });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

// ── Admin: delete user ──────────────────────────────────────────────────────
router.delete('/:id(\\d+)', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (id === Number(req.user.id)) return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    const [r] = await getPool().execute('DELETE FROM users WHERE id = ?', [id]);
    if (r.affectedRows === 0) return res.status(404).json({ success: false, message: 'User not found' });
    await logActivity({ query }, { userId: req.user.id, action: 'user_delete', entityType: 'user', entityId: null, detail: `Deleted user #${id}` });
    return res.json({ success: true, message: 'User deleted' });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

// ── Activity: mine ──────────────────────────────────────────────────────────
router.get('/me/activity', requireAuth, async (req, res) => {
  try {
    const rows = await query(
      'SELECT action, entity_type, entity_id, detail, created_at FROM user_activity WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    return res.json({ success: true, activity: rows });
  } catch (e) {
    return res.status(500).json({ success: 500, message: e.message });
  }
});

// ── Admin: all activity ─────────────────────────────────────────────────────
router.get('/activity', requireAuth, requireAdmin, async (req, res) => {
  try {
    const rows = await query(
      `SELECT a.*, u.email AS user_email, u.username
       FROM user_activity a LEFT JOIN users u ON u.id = a.user_id
       ORDER BY a.created_at DESC LIMIT 200`
    );
    return res.json({ success: true, activity: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

// ── Admin: user stats ───────────────────────────────────────────────────────
router.get('/stats', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const [[total]] = await getPool().query('SELECT COUNT(*) AS c FROM users');
    const [[active]] = await getPool().query('SELECT COUNT(*) AS c FROM users WHERE is_active = 1');
    const [[admins]] = await getPool().query("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'");
    return res.json({
      success: true,
      stats: {
        total: Number(total.c),
        active: Number(active.c),
        admins: Number(admins.c),
        disabled: Number(total.c) - Number(active.c),
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
