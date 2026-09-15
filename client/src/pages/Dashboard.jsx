import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Stat, DotStat, StatusBadge, FillBar, TimeAgo, AlertIcon } from '../components/Widgets';
import { FillTrendChart, StatusDoughnut } from '../components/Charts';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [bins, setBins] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/dashboard'), api.get('/dustbins')])
      .then(([d, b]) => { setData(d); setBins((b.dustbins || []).slice(0, 6)); })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="page"><div className="alert alert-danger">{error}</div></div>;
  if (!data) {
    return <div className="page"><div className="d-flex justify-content-center py-5"><div className="spinner-border" /></div></div>;
  }

  const { stats, recent_alerts, trend, open_maintenance } = data;

  if (stats.total === 0) {
    return (
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Overview</h1>
            <p className="sub">Welcome, {data.user_first_name || 'there'} — let's get your first bin connected.</p>
          </div>
        </div>
        <div className="panel">
          <div className="empty">
            <i className="bi bi-trash" />
            <h5>No dustbins registered yet</h5>
            <p>Register a bin to start monitoring fill levels, battery and location in real time.</p>
            <Link to="/dustbins/add" className="btn btn-sb-accent px-4">Register your first bin</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Overview</h1>
          <p className="sub">
            {stats.total} bins · {stats.online} online · avg fill {stats.avg_fill}%
          </p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/dustbins/add" className="btn btn-sb-primary">Register bin</Link>
          <Link to="/map" className="btn btn-sb-outline">Live map</Link>
        </div>
      </div>

      {/* KPI strip — one panel, hairline columns */}
      <div className="panel mb-4">
        <div className="stat-strip">
          <Stat value={stats.total} label="Total bins" />
          <Stat value={stats.online} label="Active" hint="not offline" />
          <DotStat value={stats.full} label="Full" status="full" />
          <DotStat value={stats.almost_full} label="Almost full" status="almost_full" />
          <Stat value={open_maintenance} label="Maintenance" hint="open issues" />
          <DotStat value={stats.offline} label="Offline" status="offline" />
        </div>
      </div>

      <div className="row g-4">
        {/* Trend */}
        <div className="col-lg-7">
          <div className="panel h-100">
            <div className="panel-head">
              <div>
                <h3 className="h-title">Fill level — last 24 h</h3>
                <p className="h-sub">Average across your bins, per hour</p>
              </div>
              <Link to="/analytics" className="btn btn-sb-ghost btn-sm">History &amp; trends →</Link>
            </div>
            <div className="panel-body">
              {trend.length > 1 ? (
                <FillTrendChart labels={trend.map((t) => t.hour.slice(11))} data={trend.map((t) => Number(t.avg_fill))} />
              ) : (
                <div className="empty py-4"><p className="mb-0">Not enough readings yet — data appears as devices report.</p></div>
              )}
            </div>
          </div>
        </div>

        {/* Status distribution */}
        <div className="col-lg-5">
          <div className="panel h-100">
            <div className="panel-head">
              <h3 className="h-title">Fleet status</h3>
              <Link to="/dustbins" className="btn btn-sb-ghost btn-sm">All bins →</Link>
            </div>
            <div className="panel-body d-flex justify-content-center">
              <StatusDoughnut counts={{ empty: stats.empty, normal: stats.normal, almost_full: stats.almost_full, full: stats.full, maintenance: stats.maintenance, offline: stats.offline }} />
            </div>
          </div>
        </div>

        {/* Recent alerts */}
        <div className="col-lg-7">
          <div className="panel">
            <div className="panel-head">
              <h3 className="h-title">Recent alerts</h3>
              <Link to="/alerts" className="btn btn-sb-ghost btn-sm">View all →</Link>
            </div>
            <div className="panel-body tight">
              {recent_alerts.length === 0 ? (
                <div className="p-4 text-center muted" style={{ fontSize: '.86rem' }}>No alerts — all bins are behaving.</div>
              ) : (
                recent_alerts.map((a) => (
                  <div key={a.id} className={`alert-row ${a.is_read ? '' : 'unread'}`}>
                    <AlertIcon type={a.type} severity={a.severity} />
                    <div className="flex-grow-1">
                      <div className="a-title">{a.title}{a.bin_name && <span className="fw-normal muted"> — {a.bin_name}</span>}</div>
                      <div className="a-msg">{a.message}</div>
                    </div>
                    <span className="a-time"><TimeAgo timestamp={a.created_at} /></span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Attention list */}
        <div className="col-lg-5">
          <div className="panel">
            <div className="panel-head">
              <h3 className="h-title">Needs attention</h3>
            </div>
            <div className="panel-body tight">
              {bins
                .filter((b) => ['full', 'almost_full', 'maintenance', 'offline'].includes(b.status))
                .slice(0, 6)
                .map((b) => (
                  <Link key={b.id} to={`/dustbins/${b.id}`} className="alert-row text-decoration-none">
                    <span className="a-ico info"><i className="bi bi-trash" /></span>
                    <span className="flex-grow-1">
                      <span className="a-title d-block">{b.name}</span>
                      <span className="a-msg d-block">{b.location || 'No location set'}</span>
                      <span className="d-block mt-1" style={{ maxWidth: 220 }}><FillBar level={b.fill_level} status={b.status} /></span>
                    </span>
                    <StatusBadge status={b.status} demo={Number(b.is_demo) === 1} />
                  </Link>
                ))}
              {bins.filter((b) => ['full', 'almost_full', 'maintenance', 'offline'].includes(b.status)).length === 0 && (
                <div className="p-4 text-center muted" style={{ fontSize: '.86rem' }}>
                  <i className="bi bi-check-lg me-1" />Nothing needs attention right now.
                </div>
              )}
            </div>
          </div>

          {/* Quick actions — plain links, no card grid */}
          <div className="mt-4">
            <div className="section-title">Quick actions</div>
            <div className="d-flex flex-wrap gap-2">
              <Link to="/dustbins/add" className="btn btn-sb-outline btn-sm"><i className="bi bi-plus-lg me-1" />Register bin</Link>
              <Link to="/sensors" className="btn btn-sb-outline btn-sm"><i className="bi bi-cpu me-1" />Sensor data</Link>
              <Link to="/maintenance" className="btn btn-sb-outline btn-sm"><i className="bi bi-tools me-1" />Maintenance queue</Link>
              <Link to="/profile" className="btn btn-sb-outline btn-sm"><i className="bi bi-person me-1" />Profile &amp; SMS number</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
