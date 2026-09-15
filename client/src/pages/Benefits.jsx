import { Link } from 'react-router-dom';
import PublicLayout from '../components/PublicLayout';
import { Reveal, CountUp } from '../components/Motion';

const AUDIENCES = [
  ['bi-people', 'Communities & estates', 'Shared bins are the first thing residents complain about — and the easiest to fix with data. Give facility managers one live view instead of a WhatsApp group full of photos.',
    ['No more overflowing shared bins', 'Complaints answered with evidence', 'One dashboard for the whole estate']],
  ['bi-mortarboard', 'Schools & universities', 'Dozens of bins spread across campus usually mean nightly manual checks. Sensor data replaces the walk-round and shows which locations actually need more capacity.',
    ['Cut nightly inspection rounds', 'Right-size bin placement', 'Cleaner campus before events']],
  ['bi-buildings', 'Businesses & offices', 'Lobbies, kitchens and parking areas generate steady waste with unpredictable peaks. Monitored bins keep facilities presentable without over-servicing.',
    ['Presentable premises, always', 'Service only when needed', 'Hands-free lids for staff & visitors']],
  ['bi-bank', 'Municipalities', 'City-wide deployments get a single operational picture: which districts fill fastest, which routes waste time, and where maintenance is overdue.',
    ['Route crews by data, not habit', 'District-level fill analytics', 'Fewer overflow complaints']],
  ['bi-truck', 'Waste management companies', 'Collection is a fuel-and-labour business. Every avoided trip to a half-empty bin drops straight to the bottom line — and full-bin alerts make the necessary trips faster.',
    ['Fewer wasted collection trips', 'Dynamic route planning', 'SLA reporting from real data']],
  ['bi-hospital', 'Organizations & campuses', 'Multi-site organisations see every location in one platform — with per-site owners, per-site alerts, and central analytics for the facilities team.',
    ['Multi-site, one platform', 'Per-site alert routing', 'Central reporting for HQ']],
];

export default function Benefits() {
  return (
    <PublicLayout>
      <section className="page-hero">
        <div className="inner">
          <div className="eyebrow">Benefits</div>
          <h1>Less overflow. Fewer trips. <span style={{ color: 'var(--accent)' }}>Cleaner communities.</span></h1>
          <p className="lede">
            Smart waste management is not about gadgets — it is about collecting the right bins
            at the right time, and proving it with data.
          </p>
        </div>
      </section>

      {/* big-number strip */}
      <section className="site-section" style={{ paddingBottom: 46 }}>
        <div className="inner">
          <div className="bn-strip">
            <Reveal className="bn">
              <div className="v"><CountUp to={40} suffix="%" /></div>
              <div className="l">of collection trips are typically made to bins that aren't near full — sensor data eliminates most of them.</div>
            </Reveal>
            <Reveal className="bn" delay={80}>
              <div className="v"><CountUp to={100} suffix="%" /></div>
              <div className="l">of threshold crossings generate an alert, so overflowing bins become the exception, not the daily report.</div>
            </Reveal>
            <Reveal className="bn" delay={160}>
              <div className="v"><CountUp to={24} suffix="/7" /></div>
              <div className="l">visibility over every bin — fill level, battery, location and maintenance state, from anywhere.</div>
            </Reveal>
            <Reveal className="bn" delay={240}>
              <div className="v"><CountUp to={1} suffix=" place" /></div>
              <div className="l">to see it all: one dashboard for users, one admin view for the whole fleet.</div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* audiences */}
      <section className="site-section tinted" style={{ paddingTop: 54 }}>
        <div className="inner">
          <div className="section-head">
            <div className="eyebrow">Who it serves</div>
            <h2>Built for every kind of bin network</h2>
          </div>
          <div>
            {AUDIENCES.map(([icon, name, body, points], i) => (
              <Reveal key={name} className="aud-row" delay={Math.min(i * 50, 150)}>
                <div className="a-name"><i className={`bi ${icon}`} />{name}</div>
                <div className="a-body">
                  <p>{body}</p>
                  <div className="a-points">
                    {points.map((p) => <span key={p} className="pt">{p}</span>)}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* data-driven section */}
      <section className="site-section dark">
        <div className="inner">
          <div className="split">
            <div className="s-copy">
              <div className="eyebrow" style={{ color: '#7fd0a5' }}>Data-driven operations</div>
              <h2>Every collection becomes a decision</h2>
              <p>
                Fill-level trends reveal which bins are over- or under-sized, which locations peak at
                lunch, and which days waste crews drive for nothing.
              </p>
              <p>
                Over a term or a quarter, that history becomes the business case: fewer truck hours,
                cleaner sites, and a maintenance record that shows problems were fixed — not just reported.
              </p>
              <Link to="/demo" className="btn btn-invert mt-2">See the data live →</Link>
            </div>
            <div>
              <Reveal delay={120}>
                <div style={{ border: '1px solid #3a4854', borderRadius: 'var(--radius)', background: '#1d2a35', padding: '22px' }}>
                  <div className="mono" style={{ fontSize: '.68rem', color: '#8fa0ad', marginBottom: 16 }}>WEEKLY COLLECTION SUMMARY — SIMULATED</div>
                  {[
                    ['Bins emptied on alert', '58', 'vs 31 on fixed schedule'],
                    ['Trips avoided', '23', 'bins collected before peak'],
                    ['Overflow incidents', '0', 'down from 6 last month'],
                    ['Devices offline', '1', 'flagged & maintenance raised'],
                  ].map(([k, v, note]) => (
                    <div key={k} className="d-flex justify-content-between align-items-baseline py-2" style={{ borderBottom: '1px solid #2c3947' }}>
                      <span style={{ fontSize: '.86rem', color: '#c7d2da' }}>{k}</span>
                      <span className="text-end">
                        <span className="d-block fw-bold" style={{ color: '#7fd0a5', fontSize: '1.05rem' }}>{v}</span>
                        <span className="mini" style={{ color: '#8fa0ad' }}>{note}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-band">
        <div className="inner">
          <div>
            <h2>Cleaner spaces start with one bin</h2>
            <p>Register free and see your first live readings in minutes.</p>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            <Link to="/register" className="btn btn-invert px-4 py-2">Get started</Link>
            <Link to="/features" className="btn btn-ghost-dark px-4 py-2">Explore features</Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
