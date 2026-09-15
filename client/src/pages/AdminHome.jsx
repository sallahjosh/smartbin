import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Stat, DotStat, TimeAgo, AlertIcon } from '../components/Widgets';
import { StatusDoughnut, FillTrendChart } from '../components/Charts';

export default function AdminHome() {
  const [dash, setDash] = useState(null);
  const [users, setUsers] = useState(null);
  const [activity, setActivity] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/dashboard'),
      api.get('/users/stats'),
      api.get('/users/activity'),
    ])
      .then(([d, u, a]) => { setDash(d); setUsers(u.stats); setActivity((a.activity || []).slice(0, 10)); })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="page"><div className="alert alert-danger">{error}</div></div>;
  if (!dash || !users) return <div className="page"><div className="d-flex justify-content-center py-5"><div className="spinner-border" /></div></div>;

  const { stats, recent_alerts, trend, open_maintenance } = dash;

  return (
    <div className="page wide">
      <div className="page-head">
        <div>
          <h1>Admin Overview</h1>
          <p className="sub">Platform-wide status across all customers and devices</p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/admin/dustbins" className="btn btn-sb-outline">All dustbins</Link>
          <Link to="/admin/settings" className="btn btn-sb-primary">Settings</Link>
        </div>
      </div>

      <div className="panel mb-4">
        <div className="stat-strip">
          <Stat value={stats.total} label="Total bins" hint={`${stats.total - stats.offline} online`} />
          <DotStat value={stats.full} label="Full now" status="full" />
          <DotStat value={stats.almost_full} label="Almost full" status="almost_full" />
          <Stat value={open_maintenance} label="Maintenance" hint="open issues" />
          <DotStat value={stats.offline} label="Offline" status="offline" />
          <Stat value={users.total} label="Users" hint={`${users.active} active · ${users.admins} admin`} />
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="panel h-100">
            <div className="panel-head">
              <div>
                <h3 className="h-title">Fleet fill level — last 24 h</h3>
                <p className="h-sub">All customers' bins, hourly average</p>
              </div>
              <Link to="/admin/activity" className="btn btn-sb-ghost btn-sm">System activity →</Link>
            </div>
            <div className="panel-body">
              {trend.length > 1 ? (
                <FillTrendChart labels={trend.map((t) => t.hour.slice(11))} data={trend.map((t) => Number(t.avg_fill))} />
              ) : (
                <div className="empty py-4"><p className="mb-0">Not enough readings in the last 24 h.</p></div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="panel h-100">
            <div className="panel-head">
              <h3 className="h-title">Fleet status</h3>
              <Link to="/admin/map" className="btn btn-sb-ghost btn-sm">Fleet map →</Link>
            </div>
            <div className="panel-body d-flex justify-content-center">
              <StatusDoughnut counts={{ empty: stats.empty, normal: stats.normal, almost_full: stats.almost_full, full: stats.full, maintenance: stats.maintenance, offline: stats.offline }} />
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="panel h-100">
            <div className="panel-head">
              <h3 className="h-title">Recent system alerts</h3>
              <Link to="/alerts" className="btn btn-sb-ghost btn-sm">All alerts →</Link>
            </div>
            <div className="panel-body tight">
              {recent_alerts.length === 0 ? (
                <div className="mini muted p-2">No alerts recorded.</div>
              ) : (
                recent_alerts.slice(0, 7).map((a) => (
                  <div key={a.id} className="alert-row">
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

        <div className="col-lg-6">
          <div className="panel h-100">
            <div className="panel-head">
              <h3 className="h-title">Recent user activity</h3>
              <Link to="/admin/activity" className="btn btn-sb-ghost btn-sm">Full log →</Link>
            </div>
            <div className="panel-body tight">
              {activity.length === 0 ? (
                <div className="mini muted p-2">No activity logged.</div>
              ) : (
                activity.map((a, i) => (
                  <div key={i} className="alert-row">
                    <span className="a-ico info"><i className="bi bi-person" /></span>
                    <div className="flex-grow-1">
                      <div className="a-title" style={{ textTransform: 'capitalize' }}>{(a.action || '').replace(/_/g, ' ')}{a.user_email && <span className="fw-normal muted"> — {a.user_email}</span>}</div>
                      {a.detail && <div className="a-msg">{a.detail}</div>}
                    </div>
                    <span className="a-time"><TimeAgo timestamp={a.created_at} /></span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
