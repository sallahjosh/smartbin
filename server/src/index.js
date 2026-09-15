/**
 * Express API server — SmartBin Cloud: Smart Waste Management Platform.
 *
 * Usage:
 *   PORT=3000 node src/index.js
 *
 * Routes:
 *   /api/auth        — register/login/me/profile
 *   /api/dustbins    — owner-scoped bin CRUD + readings + maintenance
 *   /api/dashboard   — overview stats, alerts feed, unread count
 *   /api/devices     — ESP32/Arduino ingest (X-Device-Key)
 *   /api/public      — marketing live-demo data (simulated, no auth)
 *   /api/users       — admin user management + activity
 *   /api/analytics   — admin charts
 *   /api/settings    — admin platform settings
 *   /api/system      — health, diagnostics, logs
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { initializeDatabase } = require('../src/db');
const { startBackgroundJobs } = require('../src/simulator');

const authRoutes = require('../src/routes/auth.routes');
const dustbinsRoutes = require('../src/routes/dustbins.routes');
const usersRoutes = require('../src/routes/users.routes');
const analyticsRoutes = require('../src/routes/analytics.routes');
const settingsRoutes = require('../src/routes/settings.routes');
const systemRoutes = require('../src/routes/system.routes');
const dashboardRoutes = require('../src/routes/dashboard.routes');
const devicesRoutes = require('../src/routes/devices.routes');
const publicRoutes = require('../src/routes/public.routes');

const PORT = Number(process.env.PORT) || 3000;
const app = express();

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ── API routes ─────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/dustbins', dustbinsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/devices', devicesRoutes);
app.use('/api/public', publicRoutes);

// ── SPA fallback (production build of client/) ─────────────────────────────
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ── Global error handler ───────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err.stack || err);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || String(err)),
  });
});

// ── Start ──────────────────────────────────────────────────────────────────
(async () => {
  try {
    await initializeDatabase();
    startBackgroundJobs();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`API server listening on http://localhost:${PORT}`);
    });
  } catch (e) {
    console.error('Failed to initialize database:', e.message);
    process.exit(1);
  }
})();
