/**
 * Database module — Smart Waste Management Platform.
 *
 * Owns schema creation + idempotent migrations + seed data.
 *
 * Schema v2 (this file):
 *   users               — accounts (role: user | admin, is_active flag)
 *   dustbins            — bins, ownership, device identity, live state
 *   sensor_readings     — time-series telemetry from devices / simulator
 *   maintenance_records — reported issues + resolution workflow
 *   alerts              — in-app alerts / system alerts (bell icon)
 *   notification_log    — every outbound notification attempt (SMS/email/…)
 *   user_activity       — audit trail of user actions
 *   settings            — persisted platform settings
 *
 * All credentials come from environment variables (never the client).
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

function dbConfig() {
  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    database: process.env.DB_NAME || 'smartdustbin',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true,
  };
}

let pool = null;

/** Get the shared connection pool (creating it on first use). */
function getPool() {
  if (!pool) pool = mysql.createPool(dbConfig());
  return pool;
}

/** Low-level helper to run a query. */
async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

/** Run a query without prepared-statement placeholders (DDL etc.). */
async function rawQuery(sql) {
  const [rows] = await getPool().query(sql);
  return rows;
}

async function tableExists(table) {
  const rows = await query(
    'SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
    [table]
  );
  return Number(rows[0].c) > 0;
}

async function columnExists(table, column) {
  const rows = await query(
    'SELECT COUNT(*) AS c FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?',
    [table, column]
  );
  return Number(rows[0].c) > 0;
}

async function getTableColumns(table) {
  const rows = await query(
    'SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ?',
    [table]
  );
  return rows.map((r) => r.COLUMN_NAME);
}

function getConnection() {
  return getPool().getConnection();
}

/** Random 32-char hex device key. */
function generateDeviceKey() {
  const bytes = require('crypto').randomBytes(16);
  return bytes.toString('hex');
}

/**
 * Initialize the database schema + seed data. Idempotent — safe to run at
 * every server start.
 */
async function initializeDatabase() {
  try {
    await migrateUsers();
    await migrateDustbins();
    await migrateNotifications();
    await createTableIfMissing('settings', `
      CREATE TABLE IF NOT EXISTS settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(100) NOT NULL UNIQUE,
        setting_value TEXT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await createTableIfMissing('sensor_readings', `
      CREATE TABLE IF NOT EXISTS sensor_readings (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        dustbin_id INT NOT NULL,
        fill_level TINYINT UNSIGNED NOT NULL DEFAULT 0,
        distance_cm FLOAT NULL,
        motion_detected TINYINT(1) DEFAULT 0,
        lid_opened TINYINT(1) DEFAULT 0,
        temperature_c FLOAT NULL,
        humidity FLOAT NULL,
        battery_level TINYINT UNSIGNED NULL,
        latitude DECIMAL(10, 8) NULL,
        longitude DECIMAL(11, 8) NULL,
        signal_strength TINYINT UNSIGNED NULL,
        source ENUM('device', 'simulated', 'manual') NOT NULL DEFAULT 'device',
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_readings_bin_time (dustbin_id, recorded_at),
        CONSTRAINT fk_readings_bin FOREIGN KEY (dustbin_id) REFERENCES dustbins(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await createTableIfMissing('maintenance_records', `
      CREATE TABLE IF NOT EXISTS maintenance_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        dustbin_id INT NOT NULL,
        issue VARCHAR(255) NOT NULL,
        description TEXT NULL,
        severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
        status ENUM('open', 'in_progress', 'resolved') DEFAULT 'open',
        reported_by INT NULL,
        resolved_by INT NULL,
        resolved_at DATETIME NULL,
        resolution_notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_maint_bin (dustbin_id, status),
        CONSTRAINT fk_maint_bin FOREIGN KEY (dustbin_id) REFERENCES dustbins(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await createTableIfMissing('alerts', `
      CREATE TABLE IF NOT EXISTS alerts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        dustbin_id INT NULL,
        user_id INT NULL,
        type ENUM('full', 'almost_full', 'maintenance', 'offline', 'device_error', 'low_battery', 'system') NOT NULL DEFAULT 'system',
        severity ENUM('info', 'warning', 'critical') DEFAULT 'info',
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_alerts_user (user_id, is_read, created_at),
        INDEX idx_alerts_bin (dustbin_id, created_at),
        CONSTRAINT fk_alerts_bin FOREIGN KEY (dustbin_id) REFERENCES dustbins(id) ON DELETE CASCADE,
        CONSTRAINT fk_alerts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await createTableIfMissing('notification_log', `
      CREATE TABLE IF NOT EXISTS notification_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        alert_id INT NULL,
        dustbin_id INT NULL,
        user_id INT NULL,
        channel ENUM('sms', 'email', 'in_app', 'push') NOT NULL DEFAULT 'sms',
        provider VARCHAR(50) NULL,
        recipient VARCHAR(100) NULL,
        message TEXT NULL,
        status ENUM('queued', 'sent', 'failed', 'skipped') DEFAULT 'queued',
        error TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_notiflog_user (user_id, created_at),
        CONSTRAINT fk_notiflog_alert FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE SET NULL,
        CONSTRAINT fk_notiflog_bin FOREIGN KEY (dustbin_id) REFERENCES dustbins(id) ON DELETE SET NULL,
        CONSTRAINT fk_notiflog_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await createTableIfMissing('user_activity', `
      CREATE TABLE IF NOT EXISTS user_activity (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NULL,
        entity_id INT NULL,
        detail VARCHAR(255) NULL,
        ip_address VARCHAR(45) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_activity_user (user_id, created_at),
        CONSTRAINT fk_activity_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await seedData();
    await seedSettings();
    return true;
  } catch (err) {
    console.error('[db] Database initialization failed:', err.message);
    return false;
  }
}

async function createTableIfMissing(name, ddl) {
  if (await tableExists(name)) return;
  await rawQuery(ddl);
  console.log(`[db] created table ${name}`);
}

/* ── users ──────────────────────────────────────────────────────────────── */

async function migrateUsers() {
  await createTableIfMissing('users', `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      email VARCHAR(100) NOT NULL UNIQUE,
      role ENUM('admin', 'user') DEFAULT 'user',
      first_name VARCHAR(60) NULL,
      last_name VARCHAR(60) NULL,
      phone_number VARCHAR(20) NULL,
      organization VARCHAR(120) NULL,
      is_active TINYINT(1) DEFAULT 1,
      last_login_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  const cols = await getTableColumns('users');
  const add = async (col, ddl, after = '') => {
    if (cols.includes(col)) return;
    try {
      await rawQuery(`ALTER TABLE users ADD COLUMN ${col} ${ddl} ${after}`.trim());
      console.log(`[db] users.${col} added`);
    } catch (e) {
      console.warn(`[db] users.${col} migration skipped:`, e.message);
    }
  };
  await add('first_name', 'VARCHAR(60) NULL', 'AFTER email');
  await add('last_name', 'VARCHAR(60) NULL', 'AFTER first_name');
  await add('phone_number', 'VARCHAR(20) NULL', 'AFTER last_name');
  await add('organization', 'VARCHAR(120) NULL', 'AFTER phone_number');
  await add('is_active', 'TINYINT(1) DEFAULT 1', 'AFTER organization');
  await add('last_login_at', 'DATETIME NULL', 'AFTER is_active');

  // Pre-existing installs may have created_at without a default (older PHP
  // schema) — normalize so INSERTs that omit timestamps still work.
  try {
    await rawQuery("ALTER TABLE users MODIFY created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP");
  } catch (e) {
    console.warn('[db] users.created_at normalization skipped:', e.message);
  }
}

/* ── dustbins ───────────────────────────────────────────────────────────── */

const BIN_STATUSES = ['empty', 'normal', 'almost_full', 'full', 'maintenance', 'offline'];

async function migrateDustbins() {
  const exists = await tableExists('dustbins');
  if (!exists) {
    await rawQuery(`
      CREATE TABLE dustbins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        location VARCHAR(255) NULL,
        owner_id INT NULL,
        device_key CHAR(32) NOT NULL UNIQUE,
        device_id VARCHAR(64) NULL,
        status ENUM('empty', 'normal', 'almost_full', 'full', 'maintenance', 'offline') DEFAULT 'empty',
        fill_level TINYINT UNSIGNED DEFAULT 0,
        battery_level TINYINT UNSIGNED DEFAULT 100,
        temperature_c FLOAT NULL,
        latitude DECIMAL(10, 8) NULL,
        longitude DECIMAL(11, 8) NULL,
        capacity_liters INT DEFAULT 120,
        is_demo TINYINT(1) DEFAULT 0,
        simulate TINYINT(1) DEFAULT 0,
        last_seen_at DATETIME NULL,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        INDEX idx_bins_owner (owner_id),
        INDEX idx_bins_status (status),
        CONSTRAINT fk_bins_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('[db] created table dustbins');
    return;
  }

  const add = async (col, ddl) => {
    if (cols.includes(col)) return;
    try {
      await rawQuery(`ALTER TABLE dustbins ADD COLUMN ${col} ${ddl}`);
      console.log(`[db] dustbins.${col} added`);
    } catch (e) {
      console.warn(`[db] dustbins.${col} migration skipped:`, e.message);
    }
  };
  await add('name', "VARCHAR(120) NOT NULL DEFAULT 'Unnamed bin'");
  await add('device_key', "CHAR(32) NULL");
  await add('owner_id', 'INT NULL');
  await add('device_id', "VARCHAR(64) NULL");
  await add('battery_level', 'TINYINT UNSIGNED DEFAULT 100');
  await add('temperature_c', 'FLOAT NULL');
  await add('capacity_liters', 'INT DEFAULT 120');
  await add('is_demo', 'TINYINT(1) DEFAULT 0');
  await add('simulate', 'TINYINT(1) DEFAULT 0');
  await add('last_seen_at', 'DATETIME NULL');
  await add('notes', 'TEXT NULL');

  // Ensure the status enum carries the new states (safe re-run).
  try {
    await rawQuery(
      `ALTER TABLE dustbins MODIFY status ENUM('empty','normal','almost_full','full','maintenance','offline') DEFAULT 'empty'`
    );
  } catch (e) {
    console.warn('[db] dustbins.status enum migration skipped:', e.message);
  }
  if (!(await columnExists('dustbins', 'fk_bins_owner'))) {
    try {
      await rawQuery(
        `ALTER TABLE dustbins ADD CONSTRAINT fk_bins_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL`
      );
    } catch (e) {
      /* constraint may already exist under another name */
    }
  }

}

/* ── alerts + notification log ─────────────────────────────────────────── */

async function migrateNotifications() {
  await createTableIfMissing('notifications', `
    CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      dustbin_id INT NULL,
      user_id INT NULL,
      title VARCHAR(255) NULL,
      message TEXT NOT NULL,
      type ENUM('maintenance', 'empty') NOT NULL,
      status ENUM('pending','sent','failed') DEFAULT 'pending',
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await createTableIfMissing('alerts', `
    CREATE TABLE IF NOT EXISTS alerts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      dustbin_id INT NULL,
      user_id INT NULL,
      type ENUM('full', 'almost_full', 'maintenance', 'offline', 'device_error', 'low_battery', 'online', 'system') NOT NULL DEFAULT 'system',
      severity ENUM('info', 'warning', 'critical') DEFAULT 'info',
      title VARCHAR(200) NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_alerts_user (user_id, is_read, created_at),
      INDEX idx_alerts_bin (dustbin_id, created_at),
      CONSTRAINT fk_alerts_bin FOREIGN KEY (dustbin_id) REFERENCES dustbins(id) ON DELETE CASCADE,
      CONSTRAINT fk_alerts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  // Existing installs: widen the alert type enum to include 'online'.
  await rawQuery("ALTER TABLE alerts MODIFY type ENUM('full', 'almost_full', 'maintenance', 'offline', 'device_error', 'low_battery', 'online', 'system') NOT NULL DEFAULT 'system'");
}

/* ── seeds ──────────────────────────────────────────────────────────────── */

async function seedData() {
  // Default admin account (if missing).
  const [[admin]] = await getPool().query(
    "SELECT id FROM users WHERE email = ?",
    [process.env.ADMIN_EMAIL || 'admin@example.com']
  );
  if (!admin) {
    const hashed = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
    await query(
      'INSERT INTO users (username, password, email, role, first_name, last_name, phone_number) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        'admin',
        hashed,
        process.env.ADMIN_EMAIL || 'admin@example.com',
        'admin',
        'System',
        'Administrator',
        process.env.ADMIN_PHONE || null,
      ]
    );
    console.log('[db] seeded default admin account');
  }

  // A demo user account for evaluations/demos.
  const [[demoUser]] = await getPool().query('SELECT id FROM users WHERE email = ?', ['demo@example.com']);
  if (!demoUser) {
    const hashed = await bcrypt.hash('demo1234', 10);
    await query(
      'INSERT INTO users (username, password, email, role, first_name, last_name, phone_number, organization) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['demo', hashed, 'demo@example.com', 'user', 'Demo', 'User', '+233558260017', 'Acme Facilities Ltd.']
    );
  }

  // Demo dustbins (public live demo + admin overview). Only when none exist.
  const [[binCount]] = await getPool().query('SELECT COUNT(*) AS c FROM dustbins');
  if (Number(binCount.c) === 0) {
    const [[dUser]] = await getPool().query("SELECT id FROM users WHERE email = 'demo@example.com'");
    const ownerId = dUser ? dUser.id : null;
    // [name, location, lat, lng, fill, battery, status, simulate]
    const samples = [
      ['Central Campus Bin', 'Main Campus — Block A entrance', 6.5244, 3.3792, 35, 96, 'normal', 1],
      ['Cafeteria Bin', 'Food court, next to serving counter', 6.5248, 3.379, 78, 88, 'almost_full', 1],
      ['Library Courtyard Bin', 'Behind the main library', 6.5242, 3.3788, 12, 100, 'empty', 1],
      ['Parking Gate Bin', 'Security post, parking entrance', 6.5246, 3.3795, 97, 64, 'full', 1],
      ['Garden Walk Bin', 'Near the fountain, east wing', 6.524, 3.3793, 55, 92, 'normal', 1],
      ['Sports Complex Bin', 'Basketball court side entrance', 6.5239, 3.3789, 44, 20, 'normal', 1],
      ['Dorm Block B Bin', 'Residence hall walkway', 6.5251, 3.3796, 88, 79, 'almost_full', 1],
      ['Clinic Entrance Bin', 'Health centre front desk', 6.5247, 3.3785, 0, 0, 'offline', 1],
      ['Maintenance Yard Bin', 'Works department yard', 6.5236, 3.3791, 42, 91, 'maintenance', 1],
    ];
    const conn = await getConnection();
    try {
      await conn.beginTransaction();
      for (const s of samples) {
        const [res] = await conn.query(
          `INSERT INTO dustbins (name, location, owner_id, device_key, device_id, status, fill_level, battery_level, latitude, longitude, is_demo, simulate, last_seen_at, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW(), ?)`,
          [
            s[0], s[1], s[1].includes('Clinic') || s[1].includes('Maintenance') ? null : ownerId,
            generateDeviceKey(), `ESP32-DEMO-${samples.indexOf(s) + 1}`,
            s[6], s[4], s[5], s[2], s[3], s[7],
            s[6] === 'maintenance' ? 'Lid actuator reported a jam — technician dispatched.' : null,
          ]
        );
        if (s[6] === 'maintenance') {
          await conn.query(
            `INSERT INTO maintenance_records (dustbin_id, issue, severity, status, description)
             VALUES (?, 'Lid actuator jammed', 'high', 'open', 'Servo motor does not respond to motion trigger. Awaiting technician visit.')`,
            [res.insertId]
          );
        }
        if (s[6] === 'offline') {
          await conn.query(
            `INSERT INTO alerts (dustbin_id, type, severity, title, message)
             VALUES (?, 'offline', 'warning', 'Device offline', 'Clinic Entrance Bin has not reported in over 30 minutes.')`,
            [res.insertId]
          );
        }
      }
      await conn.commit();
      console.log('[db] seeded demo dustbins');
    } catch (e) {
      await conn.rollback();
      console.warn('[db] demo dustbin seeding failed:', e.message);
    } finally {
      conn.release();
    }

    await seedReadingHistory();
  }
}

/** Back-fill ~48h of realistic readings for every bin so charts are alive. */
async function seedReadingHistory() {
  try {
    const bins = await query('SELECT id, fill_level FROM dustbins');
    const conn = await getConnection();
    try {
      await conn.beginTransaction();
      for (const bin of bins) {
        let fill = Math.max(5, Number(bin.fill_level) - 18);
        const now = Date.now();
        for (let h = 48; h >= 1; h--) {
          const drift = (Math.random() * 2 - 0.6) + (Math.random() < 0.35 ? 3 : 0);
          fill = Math.min(100, Math.max(0, fill + drift));
          if (h % 2 === 0) {
            const ts = new Date(now - h * 3600 * 1000);
            await conn.query(
              `INSERT INTO sensor_readings (dustbin_id, fill_level, distance_cm, motion_detected, lid_opened, temperature_c, battery_level, source, recorded_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, 'simulated', ?)`,
              [bin.id, Math.round(fill), Math.round((1 - fill / 100) * 120 + 10), Math.random() < 0.4 ? 1 : 0, Math.random() < 0.3 ? 1 : 0, 27 + Math.random() * 4, null, ts]
            );
          }
        }
      }
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      console.warn('[db] reading history seeding failed:', e.message);
    } finally {
      conn.release();
    }
  } catch (e) {
    console.warn('[db] reading history seeding skipped:', e.message);
  }
}

const DEFAULT_SETTINGS = {
  site_name: 'SmartBin Cloud — Smart Waste Management',
  items_per_page: '25',
  maintenance_mode: '0',
  email_notifications: '1',
  browser_notifications: '1',
  notification_email: 'admin@example.com',
  simulation_enabled: '1',
  offline_after_minutes: '30',
  sms_enabled: '0',
};

async function seedSettings() {
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    const [[row]] = await getPool().query('SELECT id FROM settings WHERE setting_key = ?', [key]);
    if (!row) {
      await query('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)', [key, value]);
    }
  }
}

/** Read all settings as a plain object. */
async function getAllSettings() {
  const rows = await query('SELECT setting_key, setting_value FROM settings');
  const out = { ...DEFAULT_SETTINGS };
  for (const r of rows) out[r.setting_key] = r.setting_value;
  return out;
}

/** Write a settings key/value. */
async function setSetting(key, value) {
  await getPool().query(
    'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
    [key, String(value)]
  );
}

/** Append a line to a storage log file (e.g. sms.log). */
function appendLog(filename, line) {
  try {
    const logDir = path.join(__dirname, '..', 'storage', 'logs');
    fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(path.join(logDir, filename), line + '\n');
  } catch (e) {
    // logging must never crash the request
  }
}

/** Read the last N lines of a storage log file. */
function readLogTail(filename, lines = 10) {
  try {
    const filePath = path.join(__dirname, '..', 'storage', 'logs', filename);
    if (!fs.existsSync(filePath)) return [];
    return fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter(Boolean).slice(-lines);
  } catch (e) {
    return [];
  }
}

module.exports = {
  getPool,
  getConnection,
  query,
  rawQuery,
  tableExists,
  columnExists,
  getTableColumns,
  generateDeviceKey,
  initializeDatabase,
  getAllSettings,
  setSetting,
  appendLog,
  readLogTail,
};
