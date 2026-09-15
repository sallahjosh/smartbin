/**
 * Analytics routes (admin charts) + per-owner trend support.
 *
 *   GET /api/analytics/overview — admin: trend, status distribution, volume
 *   GET /api/analytics/trend    — any user: own bins' fill trend (days param)
 */
const express = require('express');
const { query } = require('../db');
const { requireAuth, requireAdmin } = require('../auth');

const router = express.Router();

router.get('/overview', requireAuth, requireAdmin, async (req, res) => {
  try {
    const days = Math.min(30, Math.max(1, Number(req.query.days) || 7));

    const trend = await query(
      `SELECT DATE_FORMAT(r.recorded_at, '%Y-%m-%d') AS day,
              ROUND(AVG(r.fill_level), 1) AS avg_fill,
              ROUND(MAX(r.fill_level), 0) AS max_fill
       FROM sensor_readings r
       WHERE r.recorded_at >= NOW() - INTERVAL ? DAY
       GROUP BY day ORDER BY day`,
      [String(days)]
    );

    const statusDist = await query(
      `SELECT status, COUNT(*) AS count FROM dustbins GROUP BY status`
    );

    const volume = await query(
      `SELECT DATE_FORMAT(recorded_at, '%Y-%m-%d') AS day, COUNT(*) AS count
       FROM sensor_readings
       WHERE recorded_at >= NOW() - INTERVAL ? DAY
       GROUP BY day ORDER BY day`,
      [String(days)]
    );

    const topBins = await query(
      `SELECT d.id, d.name, d.fill_level, d.status, d.battery_level
       FROM dustbins d ORDER BY d.fill_level DESC LIMIT 8`
    );

    return res.json({ success: true, days, trend, status_distribution: statusDist, volume, top_bins: topBins });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/trend', requireAuth, async (req, res) => {
  try {
    const days = Math.min(30, Math.max(1, Number(req.query.days) || 7));
    const isAdmin = req.user.role === 'admin';
    const rows = await query(
      `SELECT DATE_FORMAT(r.recorded_at, '%Y-%m-%d') AS day,
              ROUND(AVG(r.fill_level), 1) AS avg_fill
       FROM sensor_readings r JOIN dustbins d ON d.id = r.dustbin_id
       WHERE r.recorded_at >= NOW() - INTERVAL ? DAY ${isAdmin ? '' : 'AND d.owner_id = ?'}
       GROUP BY day ORDER BY day`,
      isAdmin ? [String(days)] : [String(days), req.user.id]
    );
    return res.json({ success: true, days, trend: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
