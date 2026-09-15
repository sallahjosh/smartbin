/**
 * Demo simulator + device health watcher.
 *
 * - Simulator: every 30 s, advance fill/battery for dustbins with simulate=1,
 *   writing simulated sensor_readings so the platform demonstrates the full
 *   event pipeline (status transitions → alerts → notifications) with clearly
 *   labelled SIMULATED data. Never claims to be real device data.
 * - Watcher: every 60 s, flag bins whose last_seen_at is older than the
 *   configured offline threshold.
 *
 * Controlled by settings.simulation_enabled ('1'/'0'). Bins never simulate
 * unless dustbins.simulate = 1, so real device data is never overwritten.
 */
const { query, getPool } = require('./db');
const { deriveStatus } = require('./status');
const { notifyBinEvent } = require('./notifications');

const SIM_INTERVAL_MS = 30 * 1000;
const WATCH_INTERVAL_MS = 60 * 1000;

let simTimer = null;
let watchTimer = null;

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * One simulator tick.
 * @returns {number} number of bins advanced
 */
async function tick() {
  try {
    const settingsRows = await query("SELECT setting_value FROM settings WHERE setting_key = 'simulation_enabled'");
    if (settingsRows.length > 0 && String(settingsRows[0].setting_value) !== '1') return 0;

    const bins = await query('SELECT * FROM dustbins WHERE simulate = 1');
    let advanced = 0;

    for (const bin of bins) {
      const prevStatus = bin.status;
      // Demo bins that were flagged offline self-revive on the next tick:
      // the simulator is the only thing keeping their last_seen_at fresh, so
      // skipping them would leave them offline forever. Real bins
      // (simulate = 0) are never touched by this loop, so the offline watcher
      // remains the sole authority for real device health.
      if (prevStatus === null) continue;

      let fill = Number(bin.fill_level) || 0;
      let battery = Number(bin.battery_level);
      if (!Number.isFinite(battery)) battery = 100;

      // Fill drifts up when below ~90, then is "collected" back to a low level.
      if (fill >= 92) fill = rand(4, 12); // collection happened
      else fill = Math.min(100, fill + rand(0.5, 6));

      // Battery slowly drains; below 5% it gets "recharged" (demo device swap).
      battery = battery > 5 ? Math.max(0, battery - rand(0, 0.4)) : 100;

      const motion = Math.random() < 0.45;
      const lid = motion && Math.random() < 0.8;
      const temp = Math.round((27 + rand(-1.5, 2.5)) * 10) / 10;
      const newStatus = deriveStatus({ fill_level: fill, status: bin.status === 'maintenance' ? 'maintenance' : 'normal' });

      // eslint-disable-next-line no-await-in-loop
      await getPool().execute(
        `INSERT INTO sensor_readings (dustbin_id, fill_level, distance_cm, motion_detected, lid_opened, temperature_c, battery_level, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'simulated')`,
        [bin.id, Math.round(fill), Math.round((1 - fill / 100) * 120 + 10), motion ? 1 : 0, lid ? 1 : 0, temp, Math.round(battery)]
      );

      // eslint-disable-next-line no-await-in-loop
      await getPool().execute(
        'UPDATE dustbins SET status = ?, fill_level = ?, battery_level = ?, temperature_c = ?, last_seen_at = NOW() WHERE id = ?',
        [newStatus, Math.round(fill), Math.round(battery), temp, bin.id]
      );
      advanced += 1;

      // ── transition events (only on crossing, like real ingest) ──
      const events = [];
      if (prevStatus === 'offline') {
        // Revived from offline — fire once; next tick prevStatus differs.
        events.push({ type: 'online', severity: 'info', title: 'Device back online', message: `${bin.name} is reporting again. Status: ${newStatus.replace('_', ' ')}.` });
      }
      if (newStatus === 'full' && prevStatus !== 'full') {
        events.push({ type: 'full', severity: 'critical', title: 'Dustbin full', message: `${bin.name} is FULL (${Math.round(fill)}%). Please arrange collection.` });
      } else if (newStatus === 'almost_full' && prevStatus !== 'almost_full' && prevStatus !== 'full') {
        events.push({ type: 'almost_full', severity: 'warning', title: 'Dustbin almost full', message: `${bin.name} is almost full (${Math.round(fill)}%).` });
      }
      for (const ev of events) {
        // eslint-disable-next-line no-await-in-loop
        await notifyBinEvent({ dustbin: bin, ...ev });
      }
    }
    if (advanced > 0) {
      console.log(`[simulator] tick: advanced ${advanced} simulated bin(s)`);
    }
    return advanced;
  } catch (e) {
    console.warn('[simulator] tick failed:', e.message);
    return 0;
  }
}

/** Flag bins offline when they have not reported within the threshold. */
async function watchOffline() {
  try {
    const rows = await query(
      `SELECT id, name, owner_id, last_seen_at FROM dustbins
       WHERE status <> 'offline' AND status <> 'maintenance' AND (last_seen_at IS NULL OR last_seen_at < NOW() - INTERVAL ? MINUTE)`,
      [Number(process.env.OFFLINE_AFTER_MINUTES || 30)]
    );
    for (const bin of rows) {
      // eslint-disable-next-line no-await-in-loop
      await getPool().execute("UPDATE dustbins SET status = 'offline' WHERE id = ?", [bin.id]);
      // eslint-disable-next-line no-await-in-loop
      await notifyBinEvent({
        dustbin: bin,
        type: 'offline',
        severity: 'warning',
        title: 'Device offline',
        message: `${bin.name} has not reported in over ${Number(process.env.OFFLINE_AFTER_MINUTES || 30)} minutes.`,
      });
      console.log(`[watcher] bin ${bin.id} (${bin.name}) marked offline`);
    }
  } catch (e) {
    console.warn('[watcher] offline check failed:', e.message);
  }
}

/** Start background loops (called once from index.js). */
function startBackgroundJobs() {
  if (simTimer || watchTimer) return;
  // First tick after a short delay so server startup is not slowed.
  simTimer = setInterval(tick, SIM_INTERVAL_MS);
  watchTimer = setInterval(watchOffline, WATCH_INTERVAL_MS);
  setTimeout(() => tick().catch(() => {}), 5000);
  console.log('[jobs] simulator + offline watcher started (sim every 30s, offline check every 60s)');
}

module.exports = { startBackgroundJobs, tick, watchOffline };
