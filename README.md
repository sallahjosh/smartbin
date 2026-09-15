# SmartBin Cloud — IoT Smart Waste Management Platform

A complete rebuild of the Smart Dustbin website into a commercial-grade IoT platform:

- **Public website** — product marketing site explaining the Smart Dustbin system, with a fully interactive **live demo dashboard** running on clearly-labelled *simulated* data.
- **User platform** — register bins, monitor fill levels/battery/status, live map, alerts, fill history charts, maintenance tickets, device key provisioning.
- **Admin platform** — manage all users + bins platform-wide, assign owners, view activity logs, analytics, system settings and diagnostics.
- **IoT-ready backend** — secure device ingest API (`POST /api/devices/ingest` with per-device keys) ready for real ESP32/Arduino hardware.

> **Honesty note:** no physical dustbin hardware is currently connected. Demo bins are flagged
> `is_demo = 1` in the database and driven by a built-in simulator. Real bins only ever receive
> data from a physical device posting with a valid device key. The two data sources are never mixed.

## Architecture

```
Sensors → ESP32/Arduino → HTTP (X-Device-Key) → Express API → MySQL/MariaDB → React dashboards
                                                        └→ alerts → SMS/email/in-app notifications
```

| Part | Tech | Location |
|---|---|---|
| Public site + dashboards | React 18, Vite, Bootstrap 5, Leaflet, Chart.js | `client/` |
| API backend | Node.js, Express, JWT auth | `server/` |
| Database | MySQL / MariaDB | schema auto-created at startup |

### Database schema (auto-migrated, legacy data preserved)

`users`, `dustbins` (ownership, device keys, live state, demo flags), `sensor_readings`
(time-series telemetry), `maintenance_records`, `alerts`, `notification_log`, `user_activity`,
`settings`. The legacy PHP-era tables are preserved as `dustbins_legacy` and `notifications`.

## Quick start

```bash
# 1. Database — create a database named `smartdustbin` (or set DB_NAME in server/.env)

# 2. API server
cd server
cp .env.example .env       # then edit credentials
npm install
npm run dev                # listens on :3000, auto-creates schema + seeds

# 3. Frontend (dev)
cd client
npm install
npm run dev                # listens on :5173, proxies /api → :3000

# Production build (served by the API server from client/dist)
cd client && npm run build
```

**Seeded accounts**

| Role | Email | Password |
|---|---|---|
| Admin | `admin@example.com` (or `ADMIN_EMAIL` from .env) | `admin123` (or `ADMIN_PASSWORD`) |
| Demo user | `demo@example.com` | `demo1234` |

**Seeded data:** 9 demo bins (public live demo), plus 48 h of simulated reading history.

## Connecting a real device (ESP32)

1. Log in → **My Dustbins → Register bin** → copy the 32-hex **device key**.
2. Flash the example sketch in [`docs/esp32-example/`](docs/esp32-example) (or write your own) with your WiFi credentials, API URL and device key.
3. The device POSTs telemetry; the platform does the rest — status derivation, map updates, alerts, notifications.

Full API contract: [`docs/IOT_INTEGRATION.md`](docs/IOT_INTEGRATION.md).

### Ingest contract (short version)

```http
POST /api/devices/ingest
X-Device-Key: <32-hex device key>
Content-Type: application/json

{
  "fill_level": 82,          // or send distance_cm instead
  "distance_cm": 21.5,
  "motion_detected": true,
  "lid_opened": true,
  "battery_level": 87,
  "temperature_c": 28.4,
  "latitude": 6.5244,
  "longitude": 3.3792,
  "device_error": null       // string → raises a maintenance alert
}
```

Status is derived automatically: `<15 %` empty · `<80 %` normal · `<95 %` almost full · `≥95 %` full.
Threshold crossings raise in-app alerts, and SMS/email when providers are configured.

## Notifications (pluggable, no fake SMS)

`server/src/notifications.js` defines a provider interface:

- **SMS** — mNotify (existing integration, activates when `MNOTIFY_API_KEY` is set).
- **Email** — stub that logs attempts; wire `emailProvider` to SMTP/SendGrid/etc.
- Every attempt is recorded in `notification_log` with status `queued → sent | failed | skipped`.

## Key endpoints

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `PUT /api/auth/profile` |
| Bins | `GET/POST /api/dustbins`, `GET/PUT/DELETE /api/dustbins/:id`, `/readings`, `/maintenance`, `/regenerate-key` |
| Dashboard | `GET /api/dashboard`, `/api/dashboard/alerts`, `/unread-count`, `POST /alerts/read` |
| Pages | `GET /api/dashboard/sensors`, `/api/dashboard/maintenance`, `/api/dashboard/history?days=N` |
| Devices | `POST /api/devices/ingest`, `GET /api/devices/ping`, `/api/devices/info` |
| Public | `GET /api/public/demo`, `/api/public/demo/readings/:binId`, `/api/public/stats` |
| Admin | `GET /api/users`, `PUT /api/users/:id/active`, `/role`, `DELETE /api/users/:id`, `/api/users/activity`, `/api/analytics/overview`, `/api/settings`, `/api/system/info` |

## Project layout

```
client/src
  pages/        Landing, LiveDemo, Login, Register, Dashboard, Dustbins,
                DustbinView, DustbinAdd, DustbinEdit, Alerts, Profile,
                Analytics, AdminDustbins, Users, Activity, AdminSettings
  components/   Layout, BinMap (Leaflet), Charts (Chart.js), Widgets, AuthContext
  assets/css/   smartbin.css (design system)
server/src
  routes/       auth, dustbins, dashboard, devices, public, users, analytics, settings, system
  db.js         schema + idempotent migrations + seeds
  notifications.js  alert + provider dispatch pipeline
  simulator.js  demo simulator + offline watcher (background jobs)
  status.js     status derivation, activity logging
docs/
  IOT_INTEGRATION.md       full device API guide
  esp32-example/           ready-to-flash Arduino sketch
```

## Security

- JWT bearer auth; passwords bcrypt-hashed (legacy `$2y$` PHP hashes still verify).
- Role gates (`requireAuth`, `requireAdmin`) on every sensitive route.
- Owner-scoped queries: users can only read/modify their own bins.
- Devices authenticate with unique per-bin 32-hex keys (regenerable from the UI).
- Login blocked for disabled accounts; all admin actions land in `user_activity`.
