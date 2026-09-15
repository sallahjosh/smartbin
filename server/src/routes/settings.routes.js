/**
 * Settings routes (admin).
 *
 *   GET /api/settings — all platform settings
 *   PUT /api/settings — update a key/value map
 */
const express = require('express');
const { getAllSettings, setSetting } = require('../db');
const { requireAuth, requireAdmin } = require('../auth');
const { logActivity } = require('../status');

const router = express.Router();

router.get('/', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const settings = await getAllSettings();
    return res.json({ success: true, settings });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

router.put('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const updates = req.body.settings || req.body;
    const allowed = [
      'site_name', 'items_per_page', 'maintenance_mode', 'email_notifications',
      'browser_notifications', 'notification_email', 'simulation_enabled',
      'offline_after_minutes', 'sms_enabled',
    ];
    const applied = [];
    for (const [k, v] of Object.entries(updates)) {
      if (!allowed.includes(k)) continue;
      // eslint-disable-next-line no-await-in-loop
      await setSetting(k, v);
      applied.push(k);
    }
    await logActivity({ query: require('../db').query }, { userId: req.user.id, action: 'settings_update', entityType: 'settings', detail: `Updated: ${applied.join(', ') || 'none'}` });
    return res.json({ success: true, message: 'Settings saved', applied });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
