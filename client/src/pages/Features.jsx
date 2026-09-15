import { Link } from 'react-router-dom';
import PublicLayout from '../components/PublicLayout';
import { Reveal, CountUp } from '../components/Motion';

const HARDWARE = [
  ['bi-door-open', 'Automatic lid opening', 'A PIR motion sensor detects someone approaching and a servo raises the lid — hands-free and hygienic. Every open/close is logged as data.'],
  ['bi-triangle', 'Fill-level sensing', 'An ultrasonic sensor converts distance-to-waste into a precise fill percentage, calibrated per bin.'],
  ['bi-battery-half', 'Battery monitoring', 'Battery voltage is reported with every reading, with low-battery alerts before devices die.'],
  ['bi-geo', 'GPS location', 'GPS-equipped bins report their position, so the map reflects where bins actually are.'],
];

const SOFTWARE = [
  ['bi-speedometer2', 'Real-time dashboard', 'Fill gauges, status pills and last-seen times for every bin, auto-refreshing as devices report.'],
  ['bi-map', 'Live tracking map', 'Status-coloured pins, click-to-inspect popups and fleet filters (full, almost full, offline).'],
  ['bi-bell', 'SMS + in-app alerts', 'Threshold crossings fire in-app alerts and SMS via a pluggable provider — every attempt audited.'],
  ['bi-tools', 'Maintenance workflow', 'Faults become tickets: open → in progress → resolved, with severity, notes and resolver recorded.'],
  ['bi-graph-up', 'History & analytics', 'Min/avg/max fill trends, sensor volume, event timelines and per-bin history charts.'],
  ['bi-shield-check', 'Roles & security', 'JWT auth, owner-scoped data, disabled-account blocking and a full admin audit trail.'],
];

const BENTO = [
  ['bi-person-gear', 'User dashboard', 'Register bins, monitor fill levels, track devices, manage alerts and maintenance from one overview.', '', ''],
  ['bi-hdd-network', 'Admin management', 'Platform-wide fleet view, user management with enable/disable, owner assignment and system settings.', 'b-wide', ''],
  ['bi-cpu', 'Device provisioning', 'Per-bin device keys with copy/regenerate — devices authenticate with a single header.', '', ''],
  ['bi-clipboard-pulse', 'Sensor telemetry', 'Distance, motion, lid state, temperature, humidity, signal strength and source on every reading.', '', ''],
  ['bi-clock-history', 'Offline detection', 'Devices silent past the configured threshold are flagged and owners notified automatically.', 'b-wide', ''],
];

export default function Features() {
  return (
    <PublicLayout>
      <section className="page-hero">
        <div className="inner">
          <div className="eyebrow">Features</div>
          <h1>Everything a bin network needs, <span style={{ color: 'var(--accent)' }}>nothing it doesn’t</span></h1>
          <p className="lede">
            Hardware features on the bin, software features in the platform — designed as one
            system so data flows end-to-end without glue code.
          </p>
        </div>
      </section>

      {/* on the bin */}
      <section className="site-section" style={{ paddingBottom: 46 }}>
        <div className="inner">
          <div className="section-head">
            <div className="eyebrow">On the bin</div>
            <h2>Smart hardware, commodity parts</h2>
          </div>
          <div className="row g-4">
            {HARDWARE.map(([icon, t, d], i) => (
              <div className="col-md-6" key={t}>
                <Reveal delay={i * 70} className="feature-item" style={{ borderBottom: 0, paddingTop: 0 }}>
                  <i className={`bi ${icon}`} />
                  <div>
                    <h3>{t}</h3>
                    <p>{d}</p>
                  </div>
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* in the platform — bento */}
      <section className="site-section tinted">
        <div className="inner">
          <div className="section-head">
            <div className="eyebrow">In the platform</div>
            <h2>Software that closes the loop</h2>
          </div>
          <div className="bento">
            {SOFTWARE.map(([icon, t, d], i) => (
              <Reveal key={t} delay={Math.min(i * 50, 200)} className="b-cell">
                <i className={`bi ${icon}`} />
                <h3>{t}</h3>
                <p>{d}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* platform capabilities bento with one wide cell */}
      <section className="site-section">
        <div className="inner">
          <div className="section-head">
            <div className="eyebrow">Under the hood</div>
            <h2>Built to grow with your fleet</h2>
          </div>
          <div className="bento">
            {BENTO.map(([icon, t, d, extra], i) => (
              <Reveal key={t} delay={Math.min(i * 60, 180)} className={`b-cell ${extra || ''}`}>
                <i className={`bi ${icon}`} />
                <h3>{t}</h3>
                <p>{d}</p>
                <div className="b-kpi">core platform</div>
              </Reveal>
            ))}
            <Reveal className="b-cell b-wide" style={{ background: 'var(--ink)', borderColor: 'var(--ink)' }}>
              <i className="bi bi-puzzle" style={{ color: '#7fd0a5' }} />
              <h3 style={{ color: '#fff' }}>Open device API</h3>
              <p style={{ color: '#a7b3bd' }}>
                One endpoint, one header. ESP32, Arduino, GSM modules — if it can POST JSON, it can join your fleet.
              </p>
              <div className="b-kpi" style={{ color: '#7fd0a5' }}>docs/IOT_INTEGRATION.md</div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* stats band */}
      <section className="site-section dark" style={{ padding: '52px 22px' }}>
        <div className="inner">
          <div className="bn-strip">
            <div className="bn"><div className="v" style={{ color: '#fff' }}><CountUp to={6} /></div><div className="l">bin statuses tracked automatically</div></div>
            <div className="bn"><div className="v" style={{ color: '#fff' }}><CountUp to={11} /></div><div className="l">telemetry fields per reading</div></div>
            <div className="bn"><div className="v" style={{ color: '#fff' }}><CountUp to={3} /></div><div className="l">notification channels with audit log</div></div>
            <div className="bn"><div className="v" style={{ color: '#fff' }}><CountUp to={1} /></div><div className="l">endpoint for every device ever made</div></div>
          </div>
        </div>
      </section>

      <section className="cta-band">
        <div className="inner">
          <div>
            <h2>Try it before you build it</h2>
            <p>The live demo runs the full pipeline on simulated data — no signup needed.</p>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            <Link to="/demo" className="btn btn-invert px-4 py-2">View live demo</Link>
            <Link to="/register" className="btn btn-ghost-dark px-4 py-2">Get started</Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
