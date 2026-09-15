import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../api';
import PublicLayout from '../components/PublicLayout';
import { Reveal, CountUp, SplitText } from '../components/Motion';

const MINI_FEATURES = [
  ['bi-speedometer2', 'Live fill monitoring', 'Every bin reports how full it is — no more guessing or fixed schedules.'],
  ['bi-bell', 'Alerts before overflow', 'SMS and in-app alerts fire the moment a bin crosses its threshold.'],
  ['bi-geo-alt', 'Location tracking', 'GPS-equipped bins appear on a live map so teams always know where to go.'],
];

const MINI_STEPS = [
  ['Sense', 'Ultrasonic, motion and GPS sensors watch each bin — and open the lid automatically when someone approaches.'],
  ['Transmit', 'An ESP32 controller sends readings to the platform API over WiFi/GSM with a secure device key.'],
  ['Act', 'Dashboards update live, statuses change, and the right people get alerted before bins overflow.'],
];

export default function Landing() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/public/stats').then((d) => setStats(d.stats)).catch(() => {});
  }, []);

  return (
    <PublicLayout>
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="hero">
        <div className="inner">
          <div>
            <div className="eyebrow">IoT Smart Waste Platform</div>
            <h1>
              <SplitText text="Smarter waste management." />{' '}
              <em><SplitText text="Cleaner communities." startDelay={480} /></em>
            </h1>
            <p className="lede">
              SmartBin Cloud turns ordinary dustbins into connected devices — sensors measure fill
              levels, lids open automatically, and your team gets alerted the moment a bin needs
              attention.
            </p>
            <div className="d-flex gap-2 flex-wrap">
              <Link to="/register" className="btn btn-sb-primary px-4 py-2">Get started — free</Link>
              <Link to="/demo" className="btn btn-sb-outline px-4 py-2"><i className="bi bi-play-circle me-1" /> View live demo</Link>
              <Link to="/how-it-works" className="btn btn-sb-ghost px-3 py-2">How it works →</Link>
            </div>
            <div className="hero-facts">
              <div className="f">
                <div className="v"><CountUp to={stats ? stats.bins : 0} />+</div>
                <div className="l">bins monitored</div>
              </div>
              <div className="f">
                <div className="v"><CountUp to={stats ? stats.users : 0} /></div>
                <div className="l">organisations</div>
              </div>
              <div className="f">
                <div className="v"><CountUp to={stats ? stats.alerts_processed : 0} /></div>
                <div className="l">alerts processed</div>
              </div>
            </div>
          </div>

          {/* dashboard preview — a slice of the real product */}
          <Reveal delay={200}>
            <div className="panel">
              <div className="panel-head" style={{ padding: '9px 14px' }}>
                <span className="mini fw-semibold text-ink">Campus network — live view</span>
                <span className="badge-sb badge-live">● live</span>
              </div>
              <table className="table-sb">
                <tbody>
                  <tr>
                    <td className="t-title">Main Entrance</td>
                    <td style={{ width: 96 }}><span className="badge-sb badge-normal">Normal</span></td>
                    <td style={{ width: 90 }}>
                      <div className="fillbar"><span style={{ width: '42%', background: 'var(--st-normal)' }} /></div>
                    </td>
                    <td style={{ width: 46 }} className="text-ink fw-semibold">42%</td>
                  </tr>
                  <tr>
                    <td className="t-title">Cafeteria</td>
                    <td><span className="badge-sb badge-almost_full">Almost full</span></td>
                    <td><div className="fillbar"><span style={{ width: '83%', background: 'var(--st-almost)' }} /></div></td>
                    <td className="text-ink fw-semibold">83%</td>
                  </tr>
                  <tr>
                    <td className="t-title">Library</td>
                    <td><span className="badge-sb badge-full">Full</span></td>
                    <td><div className="fillbar"><span style={{ width: '100%', background: 'var(--st-full)' }} /></div></td>
                    <td className="text-ink fw-semibold">100%</td>
                  </tr>
                  <tr>
                    <td className="t-title">Parking Lot</td>
                    <td><span className="badge-sb badge-normal">Normal</span></td>
                    <td><div className="fillbar"><span style={{ width: '17%', background: 'var(--st-normal)' }} /></div></td>
                    <td className="text-ink fw-semibold">17%</td>
                  </tr>
                </tbody>
              </table>
              <div className="panel-body py-2 mini muted" style={{ borderTop: '1px solid var(--line)' }}>
                <i className="bi bi-bell me-1" />SMS alert sent — “Library bin is FULL, please collect”
              </div>
            </div>
            <p className="mini muted text-center mt-2 mb-0">A look inside the monitoring dashboard</p>
          </Reveal>
        </div>
      </section>

      {/* ── What the platform does — 3-up hairline features ───── */}
      <section className="site-section">
        <div className="inner">
          <div className="section-head">
            <div className="eyebrow">The platform</div>
            <h2>Monitoring that pays for itself</h2>
            <p>
              Collection crews stop driving to half-empty bins and start responding to real ones.
              <a href="/features" className="more-link ms-1">All features →</a>
            </p>
          </div>
          <div className="mini-feats">
            {MINI_FEATURES.map(([icon, t, d], i) => (
              <Reveal key={t} delay={i * 90} className="fi">
                <i className={`bi ${icon}`} />
                <h3>{t}</h3>
                <p>{d}</p>
                <Link to="/features" className="mini fw-semibold" style={{ color: 'var(--accent)' }}>Learn more →</Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works preview — asymmetric split ───────────── */}
      <section className="site-section tinted">
        <div className="inner">
          <div className="split rev">
            <div className="s-copy">
              <div className="eyebrow">How it works</div>
              <h2>From sensor to alert in three moves</h2>
              <p>
                The bin measures itself, reports over the internet, and the platform does the rest —
                status tracking, thresholds, alerts, maps and maintenance records.
              </p>
              {MINI_STEPS.map(([t, d], i) => (
                <div key={t} className="d-flex gap-3 mb-3">
                  <span className="stat-num" style={{ fontFamily: 'var(--mono)', color: 'var(--accent)', fontWeight: 600, fontSize: '.85rem', width: 26, flexShrink: 0 }}>0{i + 1}</span>
                  <div>
                    <div className="fw-semibold text-ink" style={{ fontSize: '.93rem' }}>{t}</div>
                    <div className="muted" style={{ fontSize: '.86rem', lineHeight: 1.6 }}>{d}</div>
                  </div>
                </div>
              ))}
              <Link to="/how-it-works" className="btn btn-sb-outline mt-2">See the full journey →</Link>
            </div>
            <div>
              {/* pipeline strip */}
              <Reveal>
                <div className="panel p-3">
                  <div className="pipeline" style={{ overflow: 'visible', flexWrap: 'wrap', rowGap: 12 }}>
                    <div className="pipe-node" style={{ minWidth: 96 }}><i className="bi bi-trash" /><span className="t">Bin</span></div>
                    <div className="pipe-arrow"><i className="bi bi-arrow-right" /></div>
                    <div className="pipe-node" style={{ minWidth: 96 }}><i className="bi bi-cpu" /><span className="t">ESP32</span></div>
                    <div className="pipe-arrow"><i className="bi bi-arrow-right" /></div>
                    <div className="pipe-node" style={{ minWidth: 96 }}><i className="bi bi-cloud-arrow-up" /><span className="t">API</span></div>
                    <div className="pipe-arrow"><i className="bi bi-arrow-right" /></div>
                    <div className="pipe-node" style={{ minWidth: 96 }}><i className="bi bi-bell" /><span className="t">Alerts</span></div>
                  </div>
                  <div className="mini muted mt-2">
                    <span className="mono">POST /api/devices/ingest</span> — one endpoint every device talks to.
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────── */}
      <section className="cta-band">
        <div className="inner">
          <div>
            <div className="eyebrow">Ready when you are</div>
            <h2>Start monitoring your bins today</h2>
            <p>Register free, add a bin, and watch live data arrive — or explore the demo first.</p>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            <Link to="/register" className="btn btn-invert px-4 py-2">Create an account</Link>
            <Link to="/demo" className="btn btn-ghost-dark px-4 py-2">Explore the demo</Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
