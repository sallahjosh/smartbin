/**
 * Device ingest API — the endpoint Arduino/ESP32 firmware posts telemetry to.
 *
 * POST /api/devices/ingest
 *   Headers: X-Device-Key: <32-hex device key>
 *   Body (JSON):
 *     {
 *       fill_level: 0-100,                  // required
 *       distance_cm, motion_detected, lid_opened,
 *       temperature_c, humidity, battery_level,
 *       latitude, longitude, signal_strength
 *     }
 *
 * Pipeline: validate → store sensor_readings → update live dustbin state →
 * derive status → raise alerts / dispatch notifications on transitions.
 *
 * GET /api/devices/ping  (X-Device-Key) — cheap keep-alive for devices.
 * GET /api/devices/info  (X-Device-Key) — bin identity + current config.
 */
const express = require('express');
const { query, getPool } = require('../db');
const { deriveStatus, isOffline } = require('../status');
const { notifyBinEvent } = require('../notifications');

const router = express.Router();

/** Resolve the dustbin bound to the X-Device-Key header (or null). */
async function getDeviceBin(req) {
  const key = String(req.headers['x-device-key'] || '').trim().toLowerCase();
  if (!/^[a-f0-9]{32}$/.test(key)) return null;
  const rows = await query('SELECT * FROM dustbins WHERE device_key = ?', [key]);
  return rows[0] || null;
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, Number(v)));

router.post('/ingest', async (req, res) => {
  try {
    const bin = await getDeviceBin(req);
    if (!bin) {
      return res.status(401).json({ success: false, message: 'Unknown or missing device key' });
    }
    if (Number(bin.is_demo) === 1) {
      return res.status(403).json({ success: false, message: 'Demo bins are simulated and cannot receive device data' });
    }

    const b = req.body || {};
    if (b.fill_level === undefined && b.distance_cm === undefined) {
      return res.status(400).json({ success: false, message: 'fill_level or distance_cm is required' });
    }

    // Accept distance_cm instead of fill_level (ultrasonic sensor reading).
    let fill;
    if (b.fill_level !== undefined) {
      fill = clamp(b.fill_level, 0, 100);
    } else {
      const distance = Number(b.distance_cm);
      const capacityCm = Number(b.capacity_distance_cm || 120);
      if (!Number.isFinite(distance) || capacityCm <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid distance_cm' });
      }
      fill = clamp(((capacityCm - distance) / capacityCm) * 100, 0, 100);
    }

    const battery = b.battery_level !== undefined ? clamp(b.battery_level, 0, 100) : bin.battery_level;
    const lat = b.latitude !== undefined && b.latitude !== null && b.latitude !== '' ? Number(b.latitude) : bin.latitude;
    const lng = b.longitude !== undefined && b.longitude !== null && b.longitude !== '' ? Number(b.longitude) : bin.longitude;

    // 1) store the reading
    await getPool().execute(
      `INSERT INTO sensor_readings
         (dustbin_id, fill_level, distance_cm, motion_detected, lid_opened, temperature_c, humidity, battery_level, latitude, longitude, signal_strength, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'device')`,
      [
        bin.id,
        Math.round(fill),
        b.distance_cm !== undefined && b.distance_cm !== null ? Number(b.distance_cm) : null,
        b.motion_detected ? 1 : 0,
        b.lid_opened ? 1 : 0,
        b.temperature_c !== undefined && b.temperature_c !== null ? Number(b.temperature_c) : null,
        b.humidity !== undefined && b.humidity !== null ? Number(b.humidity) : null,
        battery,
        lat, lng,
        b.signal_strength !== undefined && b.signal_strength !== null ? Number(b.signal_strength) : null,
      ]
    );

    // 2) update the live bin row
    const prevStatus = bin.status;
    const prevFill = Number(bin.fill_level);
    const newStatus = deriveStatus({ fill_level: fill, status: bin.status === 'maintenance' ? 'maintenance' : 'normal' });
    await getPool().execute(
      `UPDATE dustbins SET status = ?, fill_level = ?, battery_level = ?, temperature_c = ?, latitude = ?, longitude = ?, last_seen_at = NOW() WHERE id = ?`,
      [newStatus, Math.round(fill), battery, b.temperature_c ?? bin.temperature_c, lat, lng, bin.id]
    );

    // 3) transition alerts (deduplicated: only when crossing a threshold)
    const events = [];
    if (newStatus === 'full' && prevStatus !== 'full') {
      events.push({ type: 'full', severity: 'critical', title: 'Dustbin full', message: `${bin.name} is FULL (${Math.round(fill)}%). Please arrange collection.` });
    } else if (newStatus === 'almost_full' && prevStatus !== 'almost_full' && prevStatus !== 'full') {
      events.push({ type: 'almost_full', severity: 'warning', title: 'Dustbin almost full', message: `${bin.name} is almost full (${Math.round(fill)}%).` });
    }
    if (battery !== null && Number(battery) <= 20 && Number(bin.battery_level) > 20) {
      events.push({ type: 'low_battery', severity: 'warning', title: 'Device battery low', message: `${bin.name} battery is at ${Math.round(battery)}%.` });
    }
    if (b.device_error) {
      events.push({ type: 'device_error', severity: 'critical', title: 'Device error reported', message: `${bin.name}: ${String(b.device_error).slice(0, 200)}` });
    }

    const raised = [];
    for (const ev of events) {
      // eslint-disable-next-line no-await-in-loop
      const out = await notifyBinEvent({ dustbin: { ...bin, fill_level: fill }, ...ev });
      raised.push(out);
    }

    return res.json({
      success: true,
      message: 'Reading accepted',
      bin_id: bin.id,
      fill_level: Math.round(fill),
      status: newStatus,
      alerts_raised: raised.length,
    });
  } catch (e) {
    console.error('[devices] ingest failed:', e.message);
    return res.status(500).json({ success: false, message: 'Ingest failed' });
  }
});

/** Keep-alive ping — updates last_seen_at only. */
router.get('/ping', async (req, res) => {
  try {
    const bin = await getDeviceBin(req);
    if (!bin) return res.status(401).json({ success: false, message: 'Unknown device key' });
    await getPool().execute('UPDATE dustbins SET last_seen_at = NOW() WHERE id = ?', [bin.id]);
    return res.json({ success: true, bin: bin.name, time: new Date().toISOString() });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Ping failed' });
  }
});

/** Device self-check — returns bin identity + current state. */
router.get('/info', async (req, res) => {
  try {
    const bin = await getDeviceBin(req);
    if (!bin) return res.status(401).json({ success: false, message: 'Unknown device key' });
    return res.json({
      success: true,
      device: {
        bin_id: bin.id,
        name: bin.name,
        location: bin.location,
        status: bin.status,
        fill_level: bin.fill_level,
        battery_level: bin.battery_level,
        simulate: Number(bin.simulate) === 1,
        maintenance_flag: bin.status === 'maintenance',
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Info failed' });
  }
});

/** Admin: list device keys for provisioning UIs. */
router.get('/keys', async (req, res, next) => {
  // reuse requireAuth indirectly via inline check to avoid circular import
  try {
    const jwt = require('jsonwebtoken');
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: 'Not authorized' });
    const user = jwt.verify(token, process.env.JWT_SECRET || 'smartbin_dev_secret');
    if (user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin access required' });

    const rows = await query(
      `SELECT d.id, d.name, d.device_id, d.device_key, d.owner_id, u.email AS owner_email, d.last_seen_at
       FROM dustbins d LEFT JOIN users u ON u.id = d.owner_id
       WHERE d.is_demo = 0 ORDER BY d.id DESC`
    );
    const offlineAfter = Number(process.env.OFFLINE_AFTER_MINUTES || 30);
    return res.json({
      success: true,
      devices: rows.map((r) => ({ ...r, online: !isOffline(r.last_seen_at, offlineAfter) })),
    });
  } catch (e) {
    return next(e);
  }
});

module.exports = router;
