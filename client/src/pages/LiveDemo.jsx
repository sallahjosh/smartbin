import { Link } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import PublicLayout from '../components/PublicLayout';
import BinMap, { STATUS_COLORS } from '../components/BinMap';
import { StatusBadge, FillBar, Stat, DotStat, DemoBadge, TimeAgo } from '../components/Widgets';
import { FillTrendChart } from '../components/Charts';
import { Reveal } from '../components/Motion';

export default function LiveDemo() {
  const [bins, setBins] = useState([]);
  const [stats, setStats] = useState(null);
  const [selected, setSelected] = useState(null);
  const [readings, setReadings] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(null);

  const load = useCallback(async () => {
    try {
      const d = await api.get('/public/demo');
      setBins(d.bins || []);
      setStats(d.stats || null);
      setLastRefresh(new Date());
    } catch { /* public demo — stay quiet */ }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!selected) { setReadings([]); return; }
    let alive = true;
    api.get(`/public/demo/readings/${selected.id}`)
      .then((d) => { if (alive) setReadings(d.readings || []); })
      .catch(() => {});
    return () => { alive = false; };
  }, [selected]);

  const online = bins.filter((b) => b.status !== 'offline').length;
  const chartReadings = readings.slice(-48);

  return (
    <PublicLayout>
      <section className="page-hero" style={{ paddingBottom: 36 }}>
        <div className="inner">
          <div className="eyebrow">Live demonstration</div>
          <h1>The platform, running on a <span style={{ color: 'var(--accent)' }}>simulated network</span></h1>
          <p className="lede">
            Nine demo bins advance through the real event pipeline — fill levels rise, thresholds
            cross, alerts fire. This is exactly what your fleet looks like when hardware is attached.
          </p>
          <div className="d-flex align-items-center gap-2 mt-3 flex-wrap">
            <DemoBadge />
            <span className="badge-sb badge-live"><i className="bi bi-arrow-repeat" /> auto-refresh 15 s</span>
            {lastRefresh && <span className="mini muted">updated {lastRefresh.toLocaleTimeString()}</span>}
          </div>
        </div>
      </section>

      <section className="site-section" style={{ padding: '40px 22px 70px' }}>
        <div className="inner">
          {/* KPI strip */}
          <Reveal>
            <div className="panel mb-4">
              <div className="stat-strip">
                <Stat value={stats?.total ?? '—'} label="Demo bins" />
                <Stat value={online} label="Online" hint="reporting or maintenance" />
                <DotStat value={stats?.almost_full ?? 0} label="Almost full" status="almost_full" />
                <DotStat value={stats?.full ?? 0} label="Full" status="full" />
                <DotStat value={stats?.maintenance ?? 0} label="Maintenance" status="maintenance" />
                <DotStat value={stats?.offline ?? 0} label="Offline" status="offline" />
              </div>
            </div>
          </Reveal>

          <div className="row g-4">
            {/* Map + list */}
            <div className="col-lg-7">
              <div className="panel h-100">
                <div className="panel-head">
                  <div>
                    <h3 className="h-title">Network map</h3>
                    <p className="h-sub">Pin colour = status · click a pin or a row to inspect</p>
                  </div>
                </div>
                <div className="row g-0">
                  <div className="col-12 col-xl-8">
                    <BinMap bins={bins} selectedId={selected?.id} onBinSelect={setSelected} fitAll height="430px" />
                  </div>
                  <div className="col-12 col-xl-4">
                    <div className="map-side" style={{ maxHeight: 430 }}>
                      {bins.map((b) => (
                        <button key={b.id} className={`map-bin-row ${selected?.id === b.id ? 'on' : ''}`} onClick={() => setSelected(b)}>
                          <span className="n">
                            {b.name}
                            <span className="dot" style={{ background: STATUS_COLORS[b.status] }} />
                          </span>
                          <span className="mini muted d-flex justify-content-between">
                            <span>{b.fill_level}% full · {b.battery_level != null ? `${b.battery_level}%` : '—'} batt</span>
                            <TimeAgo timestamp={b.last_seen_at} />
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Inspector */}
            <div className="col-lg-5">
              <div className="panel h-100">
                <div className="panel-head">
                  <h3 className="h-title">{selected ? selected.name : 'Bin inspector'}</h3>
                  {selected && <StatusBadge status={selected.status} demo />}
                </div>
                {!selected ? (
                  <div className="empty">
                    <i className="bi bi-cursor" />
                    <h5>Select a bin</h5>
                    <p className="mb-0">Click a pin on the map or a row in the list to inspect its live state.</p>
                  </div>
                ) : (
                  <div className="panel-body">
                    <dl className="kv mb-3">
                      <dt>Location</dt><dd>{selected.location || '—'}</dd>
                      <dt>Coordinates</dt>
                      <dd className="mono">
                        {selected.latitude != null ? `${Number(selected.latitude).toFixed(5)}, ${Number(selected.longitude).toFixed(5)}` : '—'}
                      </dd>
                      <dt>Fill level</dt><dd>{selected.fill_level}%</dd>
                      <dt>Battery</dt><dd>{selected.battery_level != null ? `${selected.battery_level}%` : '—'}</dd>
                      <dt>Temperature</dt><dd>{selected.temperature_c != null ? `${selected.temperature_c.toFixed(1)}°C` : '—'}</dd>
                      <dt>Last report</dt><dd><TimeAgo timestamp={selected.last_seen_at} /></dd>
                    </dl>
                    <div className="fillbar mb-1" style={{ height: 8 }}>
                      <span style={{ width: `${selected.fill_level}%`, background: STATUS_COLORS[selected.status] }} />
                    </div>
                    <div className="mini muted mb-4">{selected.fill_level}% of capacity</div>

                    {chartReadings.length > 2 && (
                      <>
                        <div className="section-title">Fill history — last {chartReadings.length} readings</div>
                        <FillTrendChart
                          labels={chartReadings.map((r) => String(r.recorded_at).slice(11, 16))}
                          data={chartReadings.map((r) => r.fill_level)}
                          height={170}
                        />
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bin table */}
          <Reveal>
            <div className="panel mt-4">
              <div className="panel-head">
                <h3 className="h-title">All demo bins</h3>
                <span className="mini muted">advanced by the platform simulator every 30 s</span>
              </div>
              <div className="panel-body tight">
                <div className="table-responsive">
                  <table className="table-sb">
                    <thead>
                      <tr>
                        <th>Bin</th><th>Status</th><th style={{ width: 190 }}>Fill level</th><th>Battery</th><th>Last report</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bins.map((b) => (
                        <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(b)}>
                          <td className="t-title">{b.name}</td>
                          <td><StatusBadge status={b.status} demo /></td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <span style={{ width: 26 }} className="fw-semibold text-ink">{b.fill_level}%</span>
                              <FillBar level={b.fill_level} status={b.status} />
                            </div>
                          </td>
                          <td>{b.battery_level != null ? `${b.battery_level}%` : '—'}</td>
                          <td className="mini muted"><TimeAgo timestamp={b.last_seen_at} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </Reveal>

          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-4">
            <p className="mini muted mb-0" style={{ maxWidth: '62ch' }}>
              <i className="bi bi-info-circle me-1" />
              All data here is <strong>simulated</strong> for demonstration — real deployments replace it with
              readings from physical ESP32/Arduino devices posting to the ingest API.
            </p>
            <Link to="/register" className="btn btn-sb-primary">Register free →</Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
