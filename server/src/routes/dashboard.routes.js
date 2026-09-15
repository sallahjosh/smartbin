/**
 * Dashboard routes.
 *
 *   GET /api/dashboard                — overview stats + recent alerts + 24h trend
 *   GET /api/dashboard/alerts         — alert feed (filters: type, unread, limit)
 *   POST /api/dashboard/alerts/read   — mark alerts read (ids or all)
 *   GET /api/dashboard/unread-count   — bell badge count
 *   GET /api/dashboard/maintenance    — maintenance queue across my bins
 *   GET /api/dashboard/sensors        — latest reading per bin (sensor monitoring)
 *   GET /api/dashboard/history        — fill trend + event counts (analytics)
 */
const express = require('express');
const { query } = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    // ownerSql always starts with AND — every query below has an unconditional WHERE first.
    const ownerSql = isAdmin ? '' : 'AND d.owner_id = ?';
    const ownerParams = isAdmin ? [] : [req.user.id];

    const statsRows = await query(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'full' THEN 1 ELSE 0 END) AS full_count,
         SUM(CASE WHEN status = 'almost_full' THEN 1 ELSE 0 END) AS almost_full_count,
         SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) AS maintenance_count,
         SUM(CASE WHEN status = 'offline' THEN 1 ELSE 0 END) AS offline_count,
         SUM(CASE WHEN status <> 'offline' THEN 1 ELSE 0 END) AS online_count,
         AVG(fill_level) AS avg_fill
       FROM dustbins d ${isAdmin ? '' : 'WHERE d.owner_id = ?'}`,
      ownerParams
    );
    const stats = statsRows[0] || {};

    const recentAlerts = await query(
      `SELECT a.id, a.type, a.severity, a.title, a.message, a.is_read, a.created_at, d.name AS bin_name
       FROM alerts a LEFT JOIN dustbins d ON d.id = a.dustbin_id
       ${isAdmin ? '' : 'WHERE a.user_id = ?'}
       ORDER BY a.created_at DESC LIMIT 8`,
      ownerParams
    );

    const trend = await query(
      `SELECT DATE_FORMAT(r.recorded_at, '%Y-%m-%d %H:00') AS hour, ROUND(AVG(r.fill_level), 1) AS avg_fill
       FROM sensor_readings r JOIN dustbins d ON d.id = r.dustbin_id
       WHERE r.recorded_at >= NOW() - INTERVAL 24 HOUR ${ownerSql}
       GROUP BY hour ORDER BY hour`,
      ownerParams
    );

    const maintenanceRows = await query(
      `SELECT COUNT(*) AS c FROM maintenance_records m JOIN dustbins d ON d.id = m.dustbin_id
       WHERE m.status <> 'resolved' ${ownerSql}`,
      ownerParams
    );
    const openMaintenance = Number(maintenanceRows[0]?.c || 0);

    return res.json({
      success: true,
      stats: {
        total: Number(stats.total || 0),
        full: Number(stats.full_count || 0),
        almost_full: Number(stats.almost_full_count || 0),
        maintenance: Number(stats.maintenance_count || 0),
        offline: Number(stats.offline_count || 0),
        online: Number(stats.online_count || 0),
        avg_fill: Math.round(Number(stats.avg_fill || 0)),
      },
      open_maintenance: openMaintenance,
      recent_alerts: recentAlerts,
      trend,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

// ── Maintenance queue (all my bins) ────────────────────────────────────────
router.get('/maintenance', requireAuth, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const rows = await query(
      `SELECT m.*, d.name AS bin_name, d.location AS bin_location, d.owner_id,
              ru.email AS reported_by_email, uu.email AS resolved_by_email
       FROM maintenance_records m
       JOIN dustbins d ON d.id = m.dustbin_id
       LEFT JOIN users ru ON ru.id = m.reported_by
       LEFT JOIN users uu ON uu.id = m.resolved_by
       ${isAdmin ? '' : 'WHERE d.owner_id = ?'}
       ORDER BY FIELD(m.status, 'open', 'in_progress', 'resolved'), m.created_at DESC
       LIMIT 200`,
      isAdmin ? [] : [req.user.id]
    );
    const open = rows.filter((r) => r.status === 'open').length;
    const inProgress = rows.filter((r) => r.status === 'in_progress').length;
    const resolved = rows.filter((r) => r.status === 'resolved').length;
    return res.json({ success: true, records: rows, stats: { open, in_progress: inProgress, resolved } });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

// ── Sensor monitoring: latest reading per bin ───────────────────────────────
router.get('/sensors', requireAuth, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const bins = await query(
      `SELECT d.id, d.name, d.location, d.status, d.fill_level, d.battery_level, d.temperature_c,
              d.last_seen_at, d.simulate
       FROM dustbins d ${isAdmin ? '' : 'WHERE d.owner_id = ?'} ORDER BY d.name`,
      isAdmin ? [] : [req.user.id]
    );
    const out = [];
    for (const bin of bins) {
      // eslint-disable-next-line no-await-in-loop
      const rows = await query(
        `SELECT fill_level, distance_cm, motion_detected, lid_opened, temperature_c, humidity,
                battery_level, signal_strength, source, recorded_at
         FROM sensor_readings WHERE dustbin_id = ? ORDER BY recorded_at DESC LIMIT 1`,
        [bin.id]
      );
      out.push({ ...bin, latest: rows[0] || null });
    }
    const withMotion = out.filter((b) => b.latest && Number(b.latest.motion_detected) === 1).length;
    const lowBattery = bins.filter((b) => b.battery_level != null && Number(b.battery_level) <= 20).length;
    return res.json({ success: true, bins: out, summary: { total: bins.length, motion_recent: withMotion, low_battery: lowBattery } });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

// ── History / analytics for the current user's fleet ───────────────────────
router.get('/history', requireAuth, async (req, res) => {
  try {
    const days = Math.min(30, Math.max(1, Number(req.query.days) || 7));
    const isAdmin = req.user.role === 'admin';
    const ownerFilter = isAdmin ? '' : 'AND d.owner_id = ?';
    const params = isAdmin ? [String(days)] : [String(days), req.user.id];

    const trend = await query(
      `SELECT DATE_FORMAT(r.recorded_at, '%Y-%m-%d') AS day,
              ROUND(AVG(r.fill_level), 1) AS avg_fill,
              ROUND(MAX(r.fill_level), 0) AS max_fill,
              ROUND(MIN(r.fill_level), 0) AS min_fill
       FROM sensor_readings r JOIN dustbins d ON d.id = r.dustbin_id
       WHERE r.recorded_at >= NOW() - INTERVAL ? DAY ${ownerFilter}
       GROUP BY day ORDER BY day`,
      params
    );

    const volume = await query(
      `SELECT DATE_FORMAT(r.recorded_at, '%Y-%m-%d') AS day, COUNT(*) AS count
       FROM sensor_readings r JOIN dustbins d ON d.id = r.dustbin_id
       WHERE r.recorded_at >= NOW() - INTERVAL ? DAY ${ownerFilter}
       GROUP BY day ORDER BY day`,
      params
    );

    const eventCounts = await query(
      `SELECT a.type, COUNT(*) AS count FROM alerts a
       JOIN dustbins d ON d.id = a.dustbin_id
       WHERE a.created_at >= NOW() - INTERVAL ? DAY ${ownerFilter}
       GROUP BY a.type`,
      params
    );

    const recentEvents = await query(
      `SELECT a.id, a.type, a.severity, a.title, a.message, a.created_at, d.name AS bin_name
       FROM alerts a JOIN dustbins d ON d.id = a.dustbin_id
       WHERE a.created_at >= NOW() - INTERVAL ? DAY ${ownerFilter}
       ORDER BY a.created_at DESC LIMIT 15`,
      params
    );

    const lidEvents = await query(
      `SELECT COUNT(*) AS c FROM sensor_readings r JOIN dustbins d ON d.id = r.dustbin_id
       WHERE r.lid_opened = 1 AND r.recorded_at >= NOW() - INTERVAL ? DAY ${ownerFilter}`,
      params
    );

    return res.json({
      success: true,
      days,
      trend,
      volume,
      event_counts: eventCounts,
      recent_events: recentEvents,
      lid_openings: Number(lidEvents[0].c),
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

// Alerts feed (user: own; admin: all)
router.get('/alerts', requireAuth, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const limit = Math.min(200, Math.max(10, Number(req.query.limit) || 50));
    const rows = await query(
      `SELECT a.*, d.name AS bin_name, d.location AS bin_location
       FROM alerts a LEFT JOIN dustbins d ON d.id = a.dustbin_id
       ${isAdmin ? '' : 'WHERE a.user_id = ?'}
       ORDER BY a.created_at DESC LIMIT ?`,
      isAdmin ? [String(limit)] : [req.user.id, String(limit)]
    );
    return res.json({ success: true, alerts: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

// Mark alerts read
router.post('/alerts/read', requireAuth, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const ids = Array.isArray(req.body.ids) ? req.body.ids.map(Number).filter(Boolean) : null;
    if (ids && ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');
      const params = [...ids];
      let sql = `UPDATE alerts SET is_read = 1 WHERE id IN (${placeholders})`;
      if (!isAdmin) sql += ' AND user_id = ?';
      params.push(req.user.id);
      await query(sql, params);
    } else {
      if (isAdmin) await query('UPDATE alerts SET is_read = 1');
      else await query('UPDATE alerts SET is_read = 1 WHERE user_id = ?', [req.user.id]);
    }
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

// Bell badge
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const rows = isAdmin
      ? await query('SELECT COUNT(*) AS c FROM alerts WHERE is_read = 0')
      : await query('SELECT COUNT(*) AS c FROM alerts WHERE user_id = ? AND is_read = 0', [req.user.id]);
    return res.json({ success: true, count: Number(rows[0].c) });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
