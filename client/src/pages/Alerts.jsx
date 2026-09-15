import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { TimeAgo, AlertIcon } from '../components/Widgets';

const FILTERS = ['all', 'full', 'almost_full', 'maintenance', 'offline', 'low_battery', 'online'];

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const d = await api.get('/dashboard/alerts?limit=150');
      setAlerts(d.alerts || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  const markRead = async (ids) => {
    await api.post('/dashboard/alerts/read', ids ? { ids } : {});
    load();
  };

  const filtered = filter === 'all' ? alerts : alerts.filter((a) => a.type === filter);
  const unread = alerts.filter((a) => !a.is_read).length;

  if (loading) return <div className="page"><div className="d-flex justify-content-center py-5"><div className="spinner-border" /></div></div>;

  return (
    <div className="page" style={{ maxWidth: 880 }}>
      <div className="page-head">
        <div>
          <h1>Alerts &amp; Notifications</h1>
          <p className="sub">{unread} unread · {alerts.length} recent</p>
        </div>
        {unread > 0 && (
          <button className="btn btn-sb-outline" onClick={() => markRead()}><i className="bi bi-check2-all me-1" /> Mark all read</button>
        )}
      </div>

      <div className="chips mb-3">
        {FILTERS.map((f) => (
          <button key={f} className={`chip ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="panel">
          <div className="empty">
            <i className="bi bi-bell" />
            <h5>Nothing here</h5>
            <p className="mb-0">Alerts appear when bins fill up, need maintenance or go offline.</p>
          </div>
        </div>
      ) : (
        <div className="panel">
          <div className="panel-body tight">
            {filtered.map((a) => (
              <div key={a.id} className={`alert-row ${a.is_read ? '' : 'unread'}`}>
                <AlertIcon type={a.type} severity={a.severity} />
                <div className="flex-grow-1">
                  <div className="a-title">
                    {a.title}
                    {a.bin_name && <span className="fw-normal muted"> — <Link to={`/dustbins/${a.dustbin_id}`}>{a.bin_name}</Link></span>}
                    <span className={`mini fw-semibold ms-2 sev-${a.severity}`}>{a.severity}</span>
                  </div>
                  <div className="a-msg">{a.message}</div>
                </div>
                <div className="text-end">
                  <div className="a-time"><TimeAgo timestamp={a.created_at} /></div>
                  {!a.is_read && (
                    <button className="btn btn-sb-ghost btn-sm py-0 mt-1 mark-one" onClick={() => markRead([a.id])}>
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
