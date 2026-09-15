# IoT Integration Guide — connecting a real Smart Dustbin

This guide explains how a physical Smart Dustbin (ESP32/Arduino + sensors) connects to the
platform, the exact API contract, and how the event pipeline behaves end-to-end.

## Data flow

```
┌─────────────────────────────────┐
│ Smart Dustbin hardware          │
│ • HC-SR04 ultrasonic (fill)     │
│ • PIR motion sensor (lid)       │
│ • Servo (lid actuator)          │
│ • GPS module (location)         │
│ • Battery voltage divider       │
└──────────────┬──────────────────┘
               │ WiFi (HTTP POST, JSON)
               ▼
┌─────────────────────────────────┐
│ POST /api/devices/ingest        │
│ header: X-Device-Key            │
└──────────────┬──────────────────┘
               ▼
┌─────────────────────────────────┐
│ Backend                         │
│ 1. validate + store reading     │
│ 2. update live bin state        │
│ 3. derive status                │
│ 4. on threshold crossing →      │
│    alert + SMS/email/in-app     │
└──────────────┬──────────────────┘
               ▼
     User / Admin dashboards, live map, charts
```

## 1. Register the bin and get a device key

1. Log in to the platform → **My Dustbins → Register bin**.
2. Fill in the name/location (optional coordinates — a GPS-equipped device will update them).
3. Copy the **32-hex device key** shown after registration. It is stored on the bin's
   `dustbins.device_key` column and can be regenerated any time from the bin detail page
   (regenerating immediately invalidates the old key).

## 2. Hardware (reference build)

| Component | Purpose | Notes |
|---|---|---|
| ESP32 dev board | MCU + WiFi | any variant |
| HC-SR04 ultrasonic sensor | fill level (distance to waste surface) | mount at lid, pointing down |
| PIR motion sensor | detects approaching user | triggers servo |
| SG90 servo | opens/closes the lid | lid logic runs **on the device** (offline-safe) |
| NEO-6M GPS (optional) | coordinates | omit and set coordinates manually if the bin is static |
| 2× 18650 + voltage divider | battery + level monitoring | read via ADC pin |

**Fill calculation:** the platform converts distance to a percentage when you send
`distance_cm` alone: `fill % = (capacity_distance_cm − distance) / capacity_distance_cm × 100`.
Send `capacity_distance_cm` (bin interior depth) once per request if non-default (120 cm).
It is usually more accurate to compute the percentage on-device and send `fill_level`.

## 3. Device API contract

Base URL: wherever the API is hosted, e.g. `http://<server>:3000`.

### POST /api/devices/ingest

| Header | Value |
|---|---|
| `X-Device-Key` | the bin's 32-hex device key (required) |
| `Content-Type` | `application/json` |

Body (all fields optional except one of `fill_level`/`distance_cm`):

| Field | Type | Notes |
|---|---|---|
| `fill_level` | 0–100 | percentage. Preferred. |
| `distance_cm` | number | raw ultrasonic distance, converted server-side |
| `capacity_distance_cm` | number | bin depth used for conversion (default 120) |
| `motion_detected` | bool | from PIR |
| `lid_opened` | bool | whether the servo opened the lid |
| `battery_level` | 0–100 | device battery |
| `temperature_c` | number | ambient temperature (maintenance-relevant) |
| `humidity` | number | optional |
| `latitude`, `longitude` | number | GPS position — updates the live map |
| `signal_strength` | 0–100 | WiFi RSSI mapped to % |
| `device_error` | string | e.g. `"lid servo not responding"` → raises a critical device-error alert |

Response `200`:

```json
{
  "success": true,
  "bin_id": 1,
  "fill_level": 82,
  "status": "almost_full",
  "alerts_raised": 0
}
```

Errors: `401` unknown key · `403` demo bin (demo bins cannot receive device data) ·
`400` missing/invalid fields.

### GET /api/devices/ping

Header `X-Device-Key`. Keep-alive that refreshes `last_seen_at` without a reading —
useful for long sleep cycles. Response: `{ "success": true, "bin": "…", "time": "…" }`.

### GET /api/devices/info

Header `X-Device-Key`. Returns the bin's identity, current status and whether it is in
maintenance mode, so the device can adjust behaviour (e.g. disable auto-lid when flagged).

## 4. Status derivation (server-side)

| Fill | Status |
|---|---|
| < 15 % | `empty` |
| 15–79 % | `normal` |
| 80–94 % | `almost_full` |
| ≥ 95 % | `full` |
| any | `maintenance` (flag set manually or via device error workflow) |
| no data ≥ threshold | `offline` (watcher, default 30 min) |

## 5. Event pipeline

Threshold crossings (never repeats on every reading — only on *transitions*):

| Transition | Alert | Notification channels |
|---|---|---|
| → almost_full | warning "Dustbin almost full" | in-app always; SMS/email when configured + enabled |
| → full | critical "Dustbin full" | same |
| battery drops ≤ 20 % | warning "Device battery low" | same |
| `device_error` present | critical "Device error reported" | same |
| misses offline window | warning "Device offline" | same (raised by the background watcher) |

Every alert is stored in `alerts` (drives the bell icon and alert feeds) and every outbound
notification attempt is recorded in `notification_log` (`queued → sent / failed / skipped`).
SMS is sent via mNotify when `MNOTIFY_API_KEY` is set; email is a stub until you wire a
provider in `server/src/notifications.js` (`emailProvider`).

## 6. Testing without hardware

```bash
KEY=<your 32-hex device key>
curl -X POST http://localhost:3000/api/devices/ingest \
  -H "Content-Type: application/json" -H "X-Device-Key: $KEY" \
  -d '{"fill_level": 97, "battery_level": 61, "temperature_c": 29.5}'
```

A `fill_level ≥ 95` from a previously-lower state triggers the FULL alert pipeline instantly.

## 7. Demo vs real data

- Demo bins: `is_demo = 1`, `simulate = 1` — driven by the server-side simulator (30 s tick),
  exposed publicly via `/api/public/*`, **rejected** on the ingest endpoint.
- Real bins: `is_demo = 0` — accept device data only, never appear on the public demo.
- Simulator + offline watcher respect the `simulation_enabled` and `offline_after_minutes`
  settings (Admin → Settings).
