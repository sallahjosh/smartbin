/**
 * Notification service.
 *
 * Central place where platform events (bin full, almost full, maintenance,
 * offline, device errors) are turned into:
 *   1. an `alerts` row              (in-app, bell icon / admin feed)
 *   2. outbound notifications       (SMS / email) via a pluggable provider
 *   3. `notification_log` rows      (audit of every attempt)
 *
 * Providers implement the same tiny interface:
 *   { name, isConfigured(), send({ recipient, message, subject }) }
 *
 * SMS uses the existing mNotify integration (config/sms.php port). Email is a
 * stub that records the attempt — wire a real provider (SMTP/SendGrid/etc.)
 * in `emailProvider` below when ready. No fake SMS: if no provider is
 * configured the notification is logged with status 'skipped'.
 */
const { query, getPool, appendLog } = require('./db');
const { mnotifySendSms } = require('./sms');

/* ── Providers ──────────────────────────────────────────────────────────── */

const smsProvider = {
  name: 'mnotify',
  isConfigured() {
    return Boolean(process.env.MNOTIFY_API_KEY);
  },
  async send({ recipient, message }) {
    return mnotifySendSms([recipient], message);
  },
};

const emailProvider = {
  name: 'email-stub',
  isConfigured() {
    return false; // TODO: wire a real provider (nodemailer SMTP, SendGrid…)
  },
  async send({ recipient, subject, message }) {
    appendLog('email.log', `${new Date().toISOString()} | STUB (not configured) | to:${recipient} | ${subject} | ${message}`);
    return { success: false, error: 'Email provider not configured' };
  },
};

function getProvider(channel) {
  if (channel === 'sms') return smsProvider;
  if (channel === 'email') return emailProvider;
  return null;
}

/* ── Core API ───────────────────────────────────────────────────────────── */

/**
 * Create an in-app alert.
 *
 * @param {object} a { dustbinId, userId, type, severity, title, message }
 * @returns {number|undefined} alert id
 */
async function createAlert({ dustbinId = null, userId = null, type = 'system', severity = 'info', title, message }) {
  try {
    const [res] = await getPool().execute(
      'INSERT INTO alerts (dustbin_id, user_id, type, severity, title, message) VALUES (?, ?, ?, ?, ?, ?)',
      [dustbinId, userId, type, severity, title, message]
    );
    return res.insertId;
  } catch (e) {
    console.error('[notifications] createAlert failed:', e.message);
    return undefined;
  }
}

/**
 * Dispatch a notification for an existing alert through a channel.
 *
 * Resolves the recipient from the bin owner (or alert user), sends via the
 * provider, and writes a notification_log row (queued → sent/failed/skipped).
 *
 * @param {object} n { alertId, dustbinId, userId, channel, subject, message, recipientOverride }
 * @returns {object} { status, recipient, provider, error }
 */
async function dispatch({ alertId = null, dustbinId = null, userId = null, channel = 'sms', subject = null, message, recipientOverride = null }) {
  const provider = getProvider(channel);

  // Resolve recipient
  let recipient = recipientOverride || null;
  if (!recipient && userId) {
    const rows = await query('SELECT phone_number, email FROM users WHERE id = ?', [userId]);
    if (rows.length > 0) {
      recipient = channel === 'email' ? rows[0].email : rows[0].phone_number || null;
    }
  }
  if (!recipient && dustbinId) {
    const rows = await query(
      `SELECT u.phone_number, u.email FROM dustbins d JOIN users u ON u.id = d.owner_id WHERE d.id = ?`,
      [dustbinId]
    );
    if (rows.length > 0) {
      recipient = channel === 'email' ? rows[0].email : rows[0].phone_number || null;
    }
  }

  const logId = await logNotification({ alertId, dustbinId, userId, channel, provider: provider ? provider.name : null, recipient, message, status: 'queued' });

  if (!provider || !provider.isConfigured()) {
    await markNotification(logId, 'skipped', 'Provider not configured');
    return { status: 'skipped', recipient, provider: provider ? provider.name : null, error: 'Provider not configured' };
  }
  if (!recipient) {
    await markNotification(logId, 'skipped', 'No recipient resolved');
    return { status: 'skipped', recipient: null, provider: provider.name, error: 'No recipient' };
  }

  try {
    const result = await provider.send({ recipient, subject, message });
    if (result.success) {
      await markNotification(logId, 'sent', null);
      return { status: 'sent', recipient, provider: provider.name, error: null };
    }
    await markNotification(logId, 'failed', result.error || 'Provider returned failure');
    return { status: 'failed', recipient, provider: provider.name, error: result.error || 'Provider error' };
  } catch (e) {
    await markNotification(logId, 'failed', e.message);
    return { status: 'failed', recipient, provider: provider.name, error: e.message };
  }
}

async function logNotification(n) {
  try {
    const [res] = await getPool().execute(
      `INSERT INTO notification_log (alert_id, dustbin_id, user_id, channel, provider, recipient, message, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [n.alertId, n.dustbinId, n.userId, n.channel, n.provider, n.recipient, n.message, 'queued']
    );
    return res.insertId;
  } catch (e) {
    console.error('[notifications] log failed:', e.message);
    return null;
  }
}

async function markNotification(id, status, error) {
  if (!id) return;
  try {
    await getPool().execute('UPDATE notification_log SET status = ?, error = ? WHERE id = ?', [status, error, id]);
  } catch (e) {
    console.error('[notifications] mark failed:', e.message);
  }
}

/* ── Event helpers (used by ingest + simulator + admin actions) ─────────── */

/** Notify about a bin status event. Creates alert + dispatches per settings. */
async function notifyBinEvent({ dustbin, type, severity, title, message }) {
  const settings = await getSettingsCached();
  const alertId = await createAlert({
    dustbinId: dustbin.id,
    userId: dustbin.owner_id ?? null,
    type,
    severity,
    title,
    message,
  });

  const outcomes = [];
  const wantsSms = String(settings.sms_enabled) === '1' && dustbin.owner_id;
  if (wantsSms) {
    outcomes.push(await dispatch({ alertId, dustbinId: dustbin.id, userId: dustbin.owner_id, channel: 'sms', message }));
  }
  const wantsEmail = String(settings.email_notifications) === '1' && dustbin.owner_id;
  if (wantsEmail) {
    outcomes.push(await dispatch({ alertId, dustbinId: dustbin.id, userId: dustbin.owner_id, channel: 'email', subject: title, message }));
  }
  return { alertId, outcomes };
}

async function getSettingsCached() {
  try {
    const rows = await query('SELECT setting_key, setting_value FROM settings');
    const out = {};
    for (const r of rows) out[r.setting_key] = r.setting_value;
    return out;
  } catch (e) {
    return {};
  }
}

module.exports = { createAlert, dispatch, notifyBinEvent, getProvider, smsProvider, emailProvider };
