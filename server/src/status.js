/**
 * Domain helpers shared by routes and services.
 */

/**
 * Derive the dustbin status from telemetry.
 *
 * Priority: maintenance → offline → fill-based bucket.
 *   fill < 15          → empty
 *   fill < 80          → normal
 *   80 ≤ fill < 95     → almost_full
 *   fill ≥ 95          → full
 */
function deriveStatus({ fill_level, status }) {
  if (status === 'maintenance') return 'maintenance';
  if (status === 'offline') return 'offline';
  const f = Number(fill_level) || 0;
  if (f >= 95) return 'full';
  if (f >= 80) return 'almost_full';
  if (f < 15) return 'empty';
  return 'normal';
}

/** Severity weight used for sorting alert feeds. */
const SEVERITY_WEIGHT = { info: 0, warning: 1, critical: 2 };

/** Human-readable status metadata (client mirrors this). */
const STATUS_META = {
  empty: { label: 'Empty', color: '#22c55e' },
  normal: { label: 'Normal', color: '#3b82f6' },
  almost_full: { label: 'Almost Full', color: '#f59e0b' },
  full: { label: 'Full', color: '#ef4444' },
  maintenance: { label: 'Maintenance', color: '#a855f7' },
  offline: { label: 'Offline', color: '#6b7280' },
};

/** Is a device considered offline given its last_seen_at and a threshold? */
function isOffline(lastSeenAt, thresholdMinutes = 30) {
  if (!lastSeenAt) return true;
  const last = new Date(String(lastSeenAt).replace(' ', 'T') + (String(lastSeenAt).includes('Z') ? '' : 'Z'));
  if (Number.isNaN(last.getTime())) return true;
  return Date.now() - last.getTime() > thresholdMinutes * 60 * 1000;
}

/**
 * Record a user activity row. Never throws — auditing must not break requests.
 */
async function logActivity(db, { userId, action, entityType = null, entityId = null, detail = null, ip = null }) {
  try {
    await db.query(
      'INSERT INTO user_activity (user_id, action, entity_type, entity_id, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
      [userId ?? null, action, entityType, entityId, detail ? String(detail).slice(0, 255) : null, ip]
    );
  } catch (e) {
    console.warn('[activity] log failed:', e.message);
  }
}

module.exports = { deriveStatus, SEVERITY_WEIGHT, STATUS_META, isOffline, logActivity };
