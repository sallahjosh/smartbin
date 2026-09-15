/**
 * mNotify SMS helper.
 *
 * Faithful port of the original `config/sms.php`. Ghana phone numbers are
 * normalized to 233XXXXXXXXX, the SMS is sent via the mNotify "quick"
 * endpoint, and every attempt is logged to storage/logs/sms.log and
 * storage/logs/sms_debug.log (same as the PHP app).
 */
const { appendLog } = require('./db');

function getEndpoint() {
  return process.env.MNOTIFY_API_ENDPOINT || 'https://api.mnotify.com/api/sms/quick';
}

function getApiKey() {
  return process.env.MNOTIFY_API_KEY || '';
}

function getSender() {
  return process.env.MNOTIFY_SENDER || 'Smart Bin';
}

/**
 * Normalize a phone number to Ghana E.164 format (233XXXXXXXXX).
 * Accepts local (024...), 233..., +233... and 00233... formats.
 * Returns null for numbers that cannot be normalized.
 */
function normalizePhoneNumber(n) {
  if (typeof n !== 'string') return null;
  const digits = n.trim().replace(/\D+/g, '');
  if (digits.length < 10) return null;
  if (digits.startsWith('00233')) return digits.slice(2);
  if (digits.startsWith('233')) return digits;
  if (digits[0] === '0') return '233' + digits.slice(1);
  if (digits.length >= 9) return '233' + digits;
  return null;
}

/** Normalize an array of recipients, dropping unusable entries. */
function normalizeRecipients(recipients) {
  const seen = new Set();
  const out = [];
  for (const n of recipients || []) {
    const normalized = normalizePhoneNumber(n);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      out.push(normalized);
    }
  }
  return out;
}

/**
 * Send SMS via the mNotify quick endpoint.
 *
 * @param {string[]} recipients  array of phone numbers (any Ghana format)
 * @param {string}   message     SMS message content
 * @param {object}   [opts]      { smsType: 'otp' | null, scheduleDate: null|'YYYY-MM-DD HH:MM', sender: string|null }
 * @returns {Promise<object>} { success, data, error, http_code, normalized_recipients }
 */
async function mnotifySendSms(recipients, message, opts = {}) {
  const sender = opts.sender || getSender();
  const normalized = normalizeRecipients(recipients);

  const payload = {
    recipient: normalized,
    message,
    is_schedule: Boolean(opts.scheduleDate),
    schedule_date: opts.scheduleDate || '',
    priority: 'high',
    sender,
  };
  if (opts.smsType === 'otp') {
    payload.sms_type = 'otp';
  }

  let httpCode = null;
  let raw = null;
  let decoded = null;
  let error = null;

  try {
    const url = `${getEndpoint()}?key=${encodeURIComponent(getApiKey())}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);
    httpCode = res.status;
    raw = await res.text();
    try {
      decoded = JSON.parse(raw);
    } catch (e) {
      /* keep raw string */
    }

    const success = httpCode >= 200 && httpCode < 300;
    if (!success) {
      const body = decoded || raw;
      const detail =
        typeof body === 'string'
          ? body.slice(0, 500)
          : JSON.stringify(body).slice(0, 500);
      if (httpCode === 401) {
        error =
          'Sender ID "' +
          sender +
          '" is not registered with mNotify. Please contact support@mnotify.com to register your sender ID.';
      } else if (httpCode === 422 && decoded && decoded.errors) {
        error = 'Validation error: ' + JSON.stringify(decoded.errors);
      } else {
        error = 'HTTP ' + httpCode + ' response';
      }
      console.error('[mNotify SMS] HTTP', httpCode, detail);
    }
  } catch (e) {
    error = e.name === 'AbortError' ? 'cURL/network timeout' : 'Network error: ' + e.message;
    httpCode = httpCode || null;
  }

  // Logging (same file names as the PHP app)
  const msgForLog =
    typeof message === 'string' && message.length > 200
      ? message.slice(0, 200) + '...'
      : message;
  appendLog(
    'sms.log',
    `${timestamp()} | http:${httpCode} | sender:${sender} | recipients:${JSON.stringify(normalized)} | payload:${JSON.stringify({ message: msgForLog, is_schedule: payload.is_schedule })} | resp:${typeof raw === 'string' ? String(raw).slice(0, 500) : JSON.stringify(decoded)}`
  );
  appendLog(
    'sms_debug.log',
    `${timestamp()} | DEBUG | Original recipients: ${JSON.stringify(recipients)} | Normalized: ${JSON.stringify(normalized)} | Success: ${error ? 'false' : 'true'} | Error: ${error || 'none'}`
  );

  return {
    success: !error,
    data: decoded !== null ? decoded : raw,
    error,
    http_code: httpCode,
    normalized_recipients: normalized,
  };
}

function timestamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

module.exports = { mnotifySendSms, normalizePhoneNumber, normalizeRecipients };