/**
 * System routes.
 *
 *   GET /api/system/health — public health probe (no auth)
 *   GET /api/system/info   — admin: DB/uptime/device counts, provider status
 *   GET /api/system/logs   — admin: SMS/email log tails
 */
const express = require('express');
const { query, getPool, readLogTail } = require('../db');
const { requireAuth, requireAdmin } = require('../auth');
const { smsProvider, emailProvider } = require('../notifications');

const router = express.Router();

router.get('/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    return res.json({ success: true, status: 'ok', time: new Date().toISOString() });
  } catch (e) {
    return res.status(500).json({ success: false, status: 'error', message: e.message });
  }
});

router.get('/info', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const [[bins]] = await getPool().query('SELECT COUNT(*) AS c FROM dustbins');
    const [[demoBins]] = await getPool().query('SELECT COUNT(*) AS c FROM dustbins WHERE is_demo = 1');
    const [[realBins]] = await getPool().query('SELECT COUNT(*) AS c FROM dustbins WHERE is_demo = 0');
    const [[users]] = await getPool().query('SELECT COUNT(*) AS c FROM users');
    const [[readings]] = await getPool().query('SELECT COUNT(*) AS c FROM sensor_readings');
    const [[readings24h]] = await getPool().query('SELECT COUNT(*) AS c FROM sensor_readings WHERE recorded_at >= NOW() - INTERVAL 24 HOUR');
    return res.json({
      success: true,
      system: {
        uptime_seconds: Math.round(process.uptime()),
        node_version: process.version,
        database: 'connected',
        bins: { total: Number(bins.c), demo: Number(demoBins.c), real: Number(realBins.c) },
        users: Number(users.c),
        readings: { total: Number(readings.c), last_24h: Number(readings24h.c) },
        notification_providers: {
          sms: { name: smsProvider.name, configured: smsProvider.isConfigured() },
          email: { name: emailProvider.name, configured: emailProvider.isConfigured() },
        },
        simulation_enabled: true,
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/logs', requireAuth, requireAdmin, async (_req, res) => {
  try {
    return res.json({
      success: true,
      sms: readLogTail('sms.log', 30),
      sms_debug: readLogTail('sms_debug.log', 30),
      email: readLogTail('email.log', 30),
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
