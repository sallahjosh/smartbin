/**
 * Public (no-auth) API — powers the live demo on the marketing site.
 *
 * GET /api/public/demo          — demo bins + stats (clearly marked simulated)
 * GET /api/public/demo/readings/:binId — fill history for demo charts
 * GET /api/public/stats         — platform marketing counters (bins, users…)
 *
 * Only dustbins flagged is_demo=1 are exposed here. Real customer data is
 * never public.
 */
const express = require('express');
const { query, getPool } = require('../db');

const router = express.Router();

router.get('/demo', async (_req, res) => {
  try {
    const bins = await query(
      `SELECT id, name, location, status, fill_level, battery_level, temperature_c,
              latitude, longitude, last_seen_at, last_updated
       FROM dustbins WHERE is_demo = 1 ORDER BY name`
    );
    const stats = { total: bins.length, empty: 0, normal: 0, almost_full: 0, full: 0, maintenance: 0, offline: 0 };
    for (const b of bins) stats[b.status] = (stats[b.status] || 0) + 1;
    return res.json({ success: true, simulated: true, bins, stats });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/demo/readings/:binId(\\d+)', async (req, res) => {
  try {
    const rows = await query(
      `SELECT fill_level, battery_level, recorded_at FROM sensor_readings
       WHERE dustbin_id = ? ORDER BY recorded_at DESC LIMIT 48`,
      [req.params.binId]
    );
    const bin = await query('SELECT is_demo FROM dustbins WHERE id = ?', [req.params.binId]);
    if (bin.length === 0 || Number(bin[0].is_demo) !== 1) {
      return res.status(404).json({ success: false, message: 'Demo bin not found' });
    }
    return res.json({ success: true, simulated: true, readings: rows.reverse() });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/stats', async (_req, res) => {
  try {
    const [[bins]] = await getPool().query('SELECT COUNT(*) AS c FROM dustbins WHERE is_demo = 0');
    const [[users]] = await getPool().query("SELECT COUNT(*) AS c FROM users WHERE role = 'user'");
    const [[alerts]] = await getPool().query('SELECT COUNT(*) AS c FROM alerts');
    return res.json({
      success: true,
      stats: {
        bins: Number(bins.c),
        users: Number(users.c),
        alerts_processed: Number(alerts.c),
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
