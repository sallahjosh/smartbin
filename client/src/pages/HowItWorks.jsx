import { Link } from 'react-router-dom';
import PublicLayout from '../components/PublicLayout';
import { Reveal } from '../components/Motion';

const PIPELINE = [
  ['bi-trash', 'Dustbin', 'sensors'],
  ['bi-cpu', 'Controller', 'ESP32'],
  ['bi-wifi', 'Internet', 'WiFi/GSM'],
  ['bi-cloud-arrow-up', 'API', 'ingest'],
  ['bi-database', 'Database', 'time-series'],
  ['bi-speedometer2', 'Dashboard', 'live UI'],
  ['bi-bell', 'Alerts', 'SMS/in-app'],
];

const JOURNEY = [
  ['A person approaches', 'The bin sits quietly, measuring its own fill level and battery. When the motion sensor detects someone within range, it wakes up.'],
  ['The sensor detects them', 'A PIR motion sensor picks up the approaching person and signals the controller — no buttons, no handles, no touching.'],
  ['The lid opens automatically', 'The controller drives a servo that raises the lid hands-free. Hygienic for users, and the open/close event is logged as data.'],
  ['Waste goes in', 'The user disposes of waste. Nothing about the interaction needs an app, an account, or an explanation.'],
  ['The fill level is measured', 'An ultrasonic sensor bounces a pulse off the waste surface and converts distance-to-surface into a fill percentage.'],
  ['The device transmits', 'The ESP32 packages fill level, motion, battery, temperature and GPS into a signed JSON payload and posts it to the platform.'],
  ['The backend processes it', 'The API validates the device key, stores the reading, derives the status (Empty / Normal / Almost Full / Full) and detects threshold crossings.'],
  ['Dashboards update live', 'Maps, gauges and charts refresh — owners see their bins, admins see the whole fleet, statuses change in real time.'],
  ['Alerts fire when needed', 'Full, almost-full, offline and low-battery events raise in-app alerts — and SMS to the responsible phone when configured.'],
  ['Maintenance gets recorded', 'Lid jams, sensor faults and reported problems become structured tickets with severity, workflow states and resolution notes.'],
];

const J_TAGS = [
  'PIR motion sensor', 'proximity detection', 'servo actuator', 'hands-free',
  'HC-SR04 ultrasonic', 'fill %', 'JSON over HTTPS', 'X-Device-Key',
  'status derivation', 'threshold events', 'live map', 'auto-refresh',
  'SMS + in-app', 'severity levels', 'audit log', 'tickets',
];

export default function HowItWorks() {
  return (
    <PublicLayout>
      <section className="page-hero">
        <div className="inner">
          <div className="eyebrow">How it works</div>
          <h1><span style={{ color: 'var(--accent)' }}>From sensor to alert</span> — the complete journey</h1>
          <p className="lede">
            Every Smart Dustbin follows the same loop: sense, transmit, decide, notify.
            Here is exactly what happens, step by step.
          </p>
        </div>
      </section>

      {/* pipeline diagram */}
      <section className="site-section" style={{ paddingBottom: 40 }}>
        <div className="inner">
          <Reveal>
            <div className="pipeline">
              {PIPELINE.map(([icon, t, d], i) => (
                <div key={t} className="pipe-item">
                  <div className="pipe-node">
                    <i className={`bi ${icon}`} />
                    <div className="t">{t}</div>
                    <div className="d">{d}</div>
                  </div>
                  {i < PIPELINE.length - 1 && <div className="pipe-arrow"><i className="bi bi-arrow-right" /></div>}
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* 10-step journey */}
      <section className="site-section tinted" style={{ paddingTop: 50 }}>
        <div className="inner">
          <div className="section-head">
            <div className="eyebrow">Step by step</div>
            <h2>What happens, in order</h2>
          </div>
          <div className="journey">
            {JOURNEY.map(([t, d], i) => (
              <Reveal key={t} className="j-step" delay={Math.min(i * 40, 200)}>
                <span className="dot">{i + 1}</span>
                <h3>{t}</h3>
                <p>{d}</p>
                <span className="j-tag">{J_TAGS[i]}</span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* the honest bit */}
      <section className="site-section dark">
        <div className="inner">
          <div className="split">
            <div className="s-copy">
              <div className="eyebrow" style={{ color: '#7fd0a5' }}>Under the hood</div>
              <h2>Built on honest hardware</h2>
              <p>
                The reference build uses an ESP32 controller, an HC-SR04 ultrasonic sensor for fill level,
                a PIR motion sensor for the auto-lid, a servo actuator, and GPS — all commodity parts.
              </p>
              <p>
                Any device that can post JSON over HTTPS works with the platform. The device API is a
                single endpoint authenticated by a per-bin key.
              </p>
              <Link to="/demo" className="btn btn-invert mt-2">Watch it running →</Link>
            </div>
            <div>
              <Reveal delay={120}>
                <div style={{ border: '1px solid #3a4854', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                  <div className="d-flex justify-content-between align-items-center px-3 py-2" style={{ borderBottom: '1px solid #3a4854' }}>
                    <span className="mono" style={{ fontSize: '.72rem', color: '#8fa0ad' }}>POST /api/devices/ingest</span>
                    <span className="badge-sb badge-live">secure</span>
                  </div>
                  <pre className="mono p-3 m-0" style={{ fontSize: '.78rem', color: '#c7d2da', whiteSpace: 'pre-wrap' }}>{`POST /api/devices/ingest
X-Device-Key: 3f9a…c21e

{
  "fill_level": 82,
  "motion_detected": true,
  "lid_opened": true,
  "temperature_c": 27.4,
  "battery_level": 91,
  "latitude": 6.5244,
  "longitude": 3.3792
}

201 Accepted
{ "status": "almost_full", "alerts_raised": 1 }`}</pre>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-band">
        <div className="inner">
          <div>
            <h2>See every step on a live dashboard</h2>
            <p>The demo network runs the same pipeline with simulated data.</p>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            <Link to="/demo" className="btn btn-invert px-4 py-2">Open the demo</Link>
            <Link to="/register" className="btn btn-ghost-dark px-4 py-2">Register free</Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
