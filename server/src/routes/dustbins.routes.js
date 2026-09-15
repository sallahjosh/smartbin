/**
 * Dustbins routes — full CRUD scoped to the owner (or admin).
 *
 *   GET    /api/dustbins                — list my bins (admins: all) + stats
 *   POST   /api/dustbins                — register a bin (user or admin)
 *   GET    /api/dustbins/:id            — bin detail incl. latest reading
 *   PUT    /api/dustbins/:id            — update my bin
 *   DELETE /api/dustbins/:id            — remove my bin
 *   GET    /api/dustbins/:id/readings   — fill-level history (charts)
 *   GET    /api/dustbins/:id/maintenance — maintenance records
 *   POST   /api/dustbins/:id/maintenance — report an issue (user or admin)
 *   PUT    /api/dustbins/:id/maintenance/:mid — update record (admin)
 *   POST   /api/dustbins/:id/regenerate-key — new device key (owner/admin)
 */
const express = require('express');
const { query, getPool, generateDeviceKey } = require('../db');
const { requireAuth, requireAdmin } = require('../auth');
const { deriveStatus, logActivity } = require('../status');
const { notifyBinEvent, createAlert } = require('../notifications');

const router = express.Router();

/** Load a bin if the requester may see it (owner or admin). */
async function loadAuthorizedBin(id, user) {
  const rows = await query('SELECT * FROM dustbins WHERE id = ?', [id]);
  const bin = rows[0];
  if (!bin) return { error: 404 };
  if (user.role !== 'admin' && Number(bin.owner_id) !== Number(user.id)) {
    return { error: 403 };
  }
  return { bin };
}

function clampFill(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

// ── List ────────────────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const isAll = req.query.all === '1';
    const isAdmin = req.user.role === 'admin';
    let bins;
    if (isAdmin && isAll) {
      bins = await query(
        `SELECT d.*, u.email AS owner_email, u.first_name AS owner_first_name, u.last_name AS owner_last_name
         FROM dustbins d LEFT JOIN users u ON u.id = d.owner_id ORDER BY d.created_at DESC`
      );
    } else {
      bins = await query(
        `SELECT d.*, u.email AS owner_email FROM dustbins d LEFT JOIN users u ON u.id = d.owner_id
         WHERE d.owner_id = ? ORDER BY d.created_at DESC`,
        [req.user.id]
      );
    }
    const stats = computeStats(bins, req.user.role === 'admin');
    return res.json({ success: true, dustbins: bins, stats });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

// ── Create ──────────────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      name, location = null, latitude = null, longitude = null,
      capacity_liters = 120, notes = '', simulate = 0,
    } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: 'Bin name is required' });
    }
    const isAdmin = req.user.role === 'admin';
    const requestedOwner = Number(req.body.owner_id) || null;
    const ownerId = isAdmin && requestedOwner ? requestedOwner : req.user.id;

    const deviceKey = generateDeviceKey();
    const [result] = await getPool().execute(
      `INSERT INTO dustbins (name, location, owner_id, device_key, device_id, status, fill_level, battery_level, latitude, longitude, capacity_liters, is_demo, simulate, last_seen_at, notes)
       VALUES (?, ?, ?, ?, NULL, 'empty', 0, 100, ?, ?, ?, 0, ?, NOW(), ?)`,
      [
        String(name).trim(), location, ownerId, deviceKey,
        latitude || null, longitude || null,
        Number(capacity_liters) || 120,
        isAdmin && Number(simulate) === 1 ? 1 : 0,
        notes || null,
      ]
    );
    await logActivity({ query }, { userId: req.user.id, action: 'bin_create', entityType: 'dustbin', entityId: result.insertId, detail: `Registered bin "${String(name).trim()}"` });
    return res.status(201).json({ success: true, message: 'Dustbin registered', dustbin: { id: result.insertId, device_key: deviceKey } });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

// ── Detail ──────────────────────────────────────────────────────────────────
router.get('/:id(\\d+)', requireAuth, async (req, res) => {
  try {
    const { bin, error } = await loadAuthorizedBin(req.params.id, req.user);
    if (error) return res.status(error).json({ success: false, message: error === 404 ? 'Dustbin not found' : 'Access denied' });
    const readings = await query(
      'SELECT * FROM sensor_readings WHERE dustbin_id = ? ORDER BY recorded_at DESC LIMIT 1',
      [bin.id]
    );
    const openIssues = await query(
      "SELECT COUNT(*) AS c FROM maintenance_records WHERE dustbin_id = ? AND status <> 'resolved'",
      [bin.id]
    );
    return res.json({
      success: true,
      dustbin: bin,
      latest_reading: readings[0] || null,
      open_maintenance: Number(openIssues[0].c),
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

// ── Update ──────────────────────────────────────────────────────────────────
router.put('/:id(\\d+)', requireAuth, async (req, res) => {
  try {
    const { bin, error } = await loadAuthorizedBin(req.params.id, req.user);
    if (error) return res.status(error).json({ success: false, message: error === 404 ? 'Dustbin not found' : 'Access denied' });

    const b = req.body || {};
    if (b.name !== undefined && !String(b.name).trim()) {
      return res.status(400).json({ success: false, message: 'Bin name cannot be empty' });
    }
    const next = {
      name: b.name !== undefined ? String(b.name).trim() : bin.name,
      location: b.location !== undefined ? b.location : bin.location,
      latitude: b.latitude !== undefined ? (b.latitude === '' || b.latitude === null ? null : Number(b.latitude)) : bin.latitude,
      longitude: b.longitude !== undefined ? (b.longitude === '' || b.longitude === null ? null : Number(b.longitude)) : bin.longitude,
      capacity_liters: b.capacity_liters !== undefined ? Number(b.capacity_liters) || 120 : bin.capacity_liters,
      notes: b.notes !== undefined ? b.notes : bin.notes,
      simulate: req.user.role === 'admin' && b.simulate !== undefined ? (Number(b.simulate) ? 1 : 0) : bin.simulate,
      // owner/admin can reset status manually (e.g. after emptying)
      status: b.status !== undefined ? b.status : bin.status,
    };
    if (!['empty', 'normal', 'almost_full', 'full', 'maintenance', 'offline'].includes(next.status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    await getPool().execute(
      `UPDATE dustbins SET name = ?, location = ?, latitude = ?, longitude = ?, capacity_liters = ?, notes = ?, simulate = ?, status = ? WHERE id = ?`,
      [next.name, next.location, next.latitude, next.longitude, next.capacity_liters, next.notes, next.simulate, next.status, bin.id]
    );
    await logActivity({ query }, { userId: req.user.id, action: 'bin_update', entityType: 'dustbin', entityId: bin.id, detail: `Updated bin "${next.name}"` });
    return res.json({ success: true, message: 'Dustbin updated' });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

// ── Delete ──────────────────────────────────────────────────────────────────
router.delete('/:id(\\d+)', requireAuth, async (req, res) => {
  try {
    const { bin, error } = await loadAuthorizedBin(req.params.id, req.user);
    if (error) return res.status(error).json({ success: false, message: error === 404 ? 'Dustbin not found' : 'Access denied' });
    await getPool().execute('DELETE FROM dustbins WHERE id = ?', [bin.id]);
    await logActivity({ query }, { userId: req.user.id, action: 'bin_delete', entityType: 'dustbin', entityId: bin.id, detail: `Deleted bin "${bin.name}"` });
    return res.json({ success: true, message: 'Dustbin removed' });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

// ── Readings history ────────────────────────────────────────────────────────
router.get('/:id(\\d+)/readings', requireAuth, async (req, res) => {
  try {
    const { bin, error } = await loadAuthorizedBin(req.params.id, req.user);
    if (error) return res.status(error).json({ success: false, message: error === 404 ? 'Dustbin not found' : 'Access denied' });
    const limit = Math.min(500, Math.max(10, Number(req.query.limit) || 200));
    const rows = await query(
      `SELECT fill_level, distance_cm, motion_detected, lid_opened, temperature_c, battery_level, source, recorded_at
       FROM sensor_readings WHERE dustbin_id = ? ORDER BY recorded_at DESC LIMIT ?`,
      [bin.id, String(limit)]
    );
    return res.json({ success: true, readings: rows.reverse() });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

// ── Maintenance ─────────────────────────────────────────────────────────────
router.get('/:id(\\d+)/maintenance', requireAuth, async (req, res) => {
  try {
    const { bin, error } = await loadAuthorizedBin(req.params.id, req.user);
    if (error) return res.status(error).json({ success: false, message: error === 404 ? 'Dustbin not found' : 'Access denied' });
    const rows = await query(
      `SELECT m.*, ru.email AS reported_by_email, uu.email AS resolved_by_email
       FROM maintenance_records m
       LEFT JOIN users ru ON ru.id = m.reported_by
       LEFT JOIN users uu ON uu.id = m.resolved_by
       WHERE m.dustbin_id = ? ORDER BY m.created_at DESC`,
      [bin.id]
    );
    return res.json({ success: true, records: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/:id(\\d+)/maintenance', requireAuth, async (req, res) => {
  try {
    const { bin, error } = await loadAuthorizedBin(req.params.id, req.user);
    if (error) return res.status(error).json({ success: false, message: error === 404 ? 'Dustbin not found' : 'Access denied' });
    const issue = String(req.body.issue || '').trim();
    if (!issue) return res.status(400).json({ success: false, message: 'Issue description is required' });
    const severity = ['low', 'medium', 'high', 'critical'].includes(req.body.severity) ? req.body.severity : 'medium';
    const [result] = await getPool().execute(
      `INSERT INTO maintenance_records (dustbin_id, issue, description, severity, status, reported_by)
       VALUES (?, ?, ?, ?, 'open', ?)`,
      [bin.id, issue, req.body.description || null, severity, req.user.id]
    );
    await getPool().execute("UPDATE dustbins SET status = 'maintenance' WHERE id = ?", [bin.id]);
    await notifyBinEvent({
      dustbin: bin,
      type: 'maintenance',
      severity: severity === 'critical' ? 'critical' : 'warning',
      title: 'Maintenance required',
      message: `${bin.name}: ${issue}`,
    });
    await logActivity({ query }, { userId: req.user.id, action: 'maintenance_report', entityType: 'dustbin', entityId: bin.id, detail: `Reported: ${issue}` });
    return res.status(201).json({ success: true, message: 'Maintenance issue reported', record_id: result.insertId });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

router.put('/:id(\\d+)/maintenance/:mid(\\d+)', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { bin, error } = await loadAuthorizedBin(req.params.id, req.user);
    if (error) return res.status(error).json({ success: false, message: error === 404 ? 'Dustbin not found' : 'Access denied' });
    const status = ['open', 'in_progress', 'resolved'].includes(req.body.status) ? req.body.status : null;
    if (!status) return res.status(400).json({ success: false, message: 'Invalid status' });
    await getPool().execute(
      `UPDATE maintenance_records SET status = ?, resolved_by = ?, resolved_at = ?, resolution_notes = COALESCE(?, resolution_notes) WHERE id = ? AND dustbin_id = ?`,
      [status, status === 'resolved' ? req.user.id : null, status === 'resolved' ? new Date() : null, req.body.resolution_notes || null, req.params.mid, bin.id]
    );
    if (status === 'resolved') {
      // Only clear the maintenance flag if no other open records remain.
      const [[open]] = await getPool().query(
        "SELECT COUNT(*) AS c FROM maintenance_records WHERE dustbin_id = ? AND status <> 'resolved'",
        [bin.id]
      );
      if (Number(open.c) === 0) {
        const [[b]] = await getPool().query('SELECT fill_level FROM dustbins WHERE id = ?', [bin.id]);
        await getPool().execute('UPDATE dustbins SET status = ? WHERE id = ?', [deriveStatus({ fill_level: b.fill_level }), bin.id]);
      }
    }
    await logActivity({ query }, { userId: req.user.id, action: 'maintenance_update', entityType: 'dustbin', entityId: bin.id, detail: `Record #${req.params.mid} → ${status}` });
    return res.json({ success: true, message: `Maintenance record ${status}` });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

// ── Device key regeneration ─────────────────────────────────────────────────
router.post('/:id(\\d+)/regenerate-key', requireAuth, async (req, res) => {
  try {
    const { bin, error } = await loadAuthorizedBin(req.params.id, req.user);
    if (error) return res.status(error).json({ success: false, message: error === 404 ? 'Dustbin not found' : 'Access denied' });
    const newKey = generateDeviceKey();
    await getPool().execute('UPDATE dustbins SET device_key = ? WHERE id = ?', [newKey, bin.id]);
    await logActivity({ query }, { userId: req.user.id, action: 'device_key_regen', entityType: 'dustbin', entityId: bin.id, detail: 'Device key regenerated' });
    return res.json({ success: true, message: 'Device key regenerated — update your device firmware', device_key: newKey });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

function computeStats(bins, isAdminView) {
  const stats = {
    total: bins.length, empty: 0, normal: 0, almost_full: 0, full: 0, maintenance: 0, offline: 0,
    online: 0, avg_fill: 0, unassigned: 0,
  };
  let sum = 0;
  for (const d of bins) {
    stats[d.status] = (stats[d.status] || 0) + 1;
    if (d.status !== 'offline') stats.online += 1;
    sum += Number(d.fill_level) || 0;
    if (isAdminView && !d.owner_id) stats.unassigned += 1;
  }
  stats.avg_fill = bins.length > 0 ? Math.round(sum / bins.length) : 0;
  return stats;
}

module.exports = router;
