/*
  SmartBin Cloud — ESP32 Smart Dustbin firmware example
  =====================================================
  Hardware (reference build):
    - ESP32 dev board
    - HC-SR04 ultrasonic sensor  (TRIG=GPIO5, ECHO=GPIO18)  — fill level
    - PIR motion sensor          (OUT=GPIO4)                — auto lid
    - SG90 servo                 (SIGNAL=GPIO13)            — lid actuator
    - Battery voltage divider    (ADC GPIO34)               — battery %

  Behaviour:
    1. PIR detects a person → servo opens lid → closes after 5 s (works offline).
    2. Every REPORT_INTERVAL_MS, telemetry is POSTed to the platform:
         fill %, distance, motion, lid state, battery, temperature(optional).
    3. Ping keep-alive between reports so the bin is not flagged offline.

  Setup:
    - Fill in WIFI_SSID / WIFI_PASSWORD / API_HOST / DEVICE_KEY below.
    - Device key: register a bin in the platform UI → copy the 32-hex key.
    - Arduino IDE: install "ArduinoJson" (Tools → Manage Libraries).

  This sketch sends REAL sensor data — the platform stores it with
  source='device', clearly distinct from simulated demo data.
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ── Configuration ────────────────────────────────────────────────────────────
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Where the SmartBin Cloud API is reachable (no trailing slash)
const char* API_HOST = "http://192.168.1.100:3000";

// The device key shown when you registered the bin
const char* DEVICE_KEY = "PASTE_YOUR_32_HEX_DEVICE_KEY";

// Bin interior depth in cm (used to convert distance → fill %)
const float BIN_DEPTH_CM = 120.0;

const unsigned long REPORT_INTERVAL_MS = 60UL * 1000;   // report every 60 s
const unsigned long PING_INTERVAL_MS   = 5UL * 60UL;    // ping every 5 min
const unsigned long LID_HOLD_MS        = 5000;          // keep lid open 5 s

// ── Pins ─────────────────────────────────────────────────────────────────────
const int PIN_TRIG   = 5;
const int PIN_ECHO   = 18;
const int PIN_PIR    = 4;
const int PIN_SERVO  = 13;
const int PIN_BATT   = 34;   // ADC1, via voltage divider

// ── Globals ──────────────────────────────────────────────────────────────────
unsigned long lastReport = 0;
unsigned long lastPing   = 0;

// Minimal servo control without the ESP32Servo library (50 Hz PWM on any GPIO)
#include "driver/ledc.h"

void setupPWM() {
  ledcSetup(0, 50, 16);          // channel 0, 50 Hz, 16-bit resolution
  ledcAttachPin(PIN_SERVO, 0);
}

// Convert degrees (0-180) to LEDC duty at 16-bit resolution / 50 Hz
void servoWriteDegrees(int degrees) {
  const uint32_t frameUs = 20000;                      // 1 / 50 Hz
  uint32_t dutyUs = map(degrees, 0, 180, 500, 2400);   // pulse width
  uint32_t duty   = (uint32_t)((float)dutyUs / frameUs * 65535.0);
  ledcWrite(0, duty);
}

void lidOpen()  { servoWriteDegrees(75); }   // open
void lidClose() { servoWriteDegrees(0); }    // closed

// ── WiFi ─────────────────────────────────────────────────────────────────────
void ensureWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting WiFi");
  for (int i = 0; i < 30 && WiFi.status() != WL_CONNECTED; i++) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(WiFi.status() == WL_CONNECTED ? " OK" : " FAILED");
}

// ── Sensors ──────────────────────────────────────────────────────────────────
float readDistanceCm() {
  digitalWrite(PIN_TRIG, LOW);  delayMicroseconds(4);
  digitalWrite(PIN_TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);
  unsigned long dur = pulseIn(PIN_ECHO, HIGH, 30000UL);   // 30 ms timeout
  if (dur == 0) return -1;                                // no echo
  return dur * 0.0343 / 2.0;
}

int readBatteryPercent() {
  // Adjust to your divider: e.g. 2×100k → factor 2, 3.3 V ADC ref
  analogReadResolution(12);
  float v = analogRead(PIN_BATT) * 3.3 / 4095.0 * 2.0;
  // 3.0 V = 0%, 4.2 V = 100% (2S li-ion example — tune for your pack)
  int pct = (int)((v - 3.0) / (4.2 - 3.0) * 100.0);
  return constrain(pct, 0, 100);
}

int fillPercent(float distanceCm) {
  if (distanceCm < 0) return -1;
  float pct = (BIN_DEPTH_CM - distanceCm) / BIN_DEPTH_CM * 100.0;
  return constrain((int)pct, 0, 100);
}

// ── API calls ────────────────────────────────────────────────────────────────
bool postJson(const char* path, const String& body) {
  HTTPClient http;
  String url = String(API_HOST) + path;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_KEY);
  http.setTimeout(8000);
  int code = http.POST(body);
  http.end();
  return code >= 200 && code < 300;
}

void sendReport(float distance, int fill, bool motion, bool lidWasOpened, int battery) {
  JsonDocument doc;
  if (fill >= 0)              doc["fill_level"]   = fill;
  if (distance >= 0)          doc["distance_cm"]  = distance;
  doc["motion_detected"] = motion;
  doc["lid_opened"]      = lidWasOpened;
  doc["battery_level"]   = battery;
  // Optional: add "temperature_c" if you wire a DS18B20/DHT22
  // Optional GPS:  doc["latitude"] = …; doc["longitude"] = …;

  String body;
  serializeJson(doc, body);
  bool ok = postJson("/api/devices/ingest", body);
  Serial.printf("Report: fill=%d%% batt=%d%% → HTTP %s\n", fill, battery, ok ? "OK" : "FAIL");
}

void sendPing() {
  postJson("/api/devices/ping", "{}");
  Serial.println("Ping sent");
}

// ── Setup / loop ─────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  pinMode(PIN_PIR,  INPUT);
  setupPWM();
  lidClose();
  ensureWiFi();
  lastReport = lastPing = millis();
  sendPing();   // announce ourselves immediately
}

void loop() {
  unsigned long now = millis();

  // 1) Auto-lid (local, works even if WiFi is down)
  bool motion = digitalRead(PIN_PIR) == HIGH;
  static bool lidWasOpened = false;
  static unsigned long lidOpenedAt = 0;
  if (motion && lidOpenedAt == 0) {
    lidOpen();
    lidOpenedAt = now;
    lidWasOpened = true;
  }
  if (lidOpenedAt != 0 && now - lidOpenedAt > LID_HOLD_MS) {
    lidClose();
    lidOpenedAt = 0;
  }

  // 2) Telemetry report
  if (now - lastReport > REPORT_INTERVAL_MS) {
    lastReport = now;
    ensureWiFi();
    float distance = readDistanceCm();
    int fill = fillPercent(distance);
    sendReport(distance, fill, motion, lidWasOpened, readBatteryPercent());
    lidWasOpened = false;
  }

  // 3) Keep-alive ping between reports
  if (now - lastPing > PING_INTERVAL_MS) {
    lastPing = now;
    ensureWiFi();
    sendPing();
  }

  delay(100);
}
