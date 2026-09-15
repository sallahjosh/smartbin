import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Stat, StatusBadge, TimeAgo, DemoBadge } from '../components/Widgets';

export default function AdminDevices() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.get('/dashboard/sensors').then(setData).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  if (error) return <div className="page"><div className="alert alert-danger">{error}</div></div>;
  if (!data) return <div className="page"><div className="d-flex justify-content-center py-5"><div className="spinner-border" /></div></div>;

  const { bins, summary } = data;
  const simulated = bins.filter((b) => Number(b.simulate) === 1).length;
  const offline = bins.filter((b) => b.status === 'offline').length;

  return (
    <div className="page wide">
      <div className="page-head">
        <div>
          <h1>Devices</h1>
          <p className="sub">Device health across every registered bin · refreshes every 30 s</p>
        </div>
        <DemoBadge />
      </div>

      <div className="panel mb-4">
        <div className="stat-strip">
          <Stat value={summary.total} label="Registered devices" />
          <Stat value={bins.length - offline} label="Reporting" />
          <Stat value={offline} label="Offline" />
          <Stat value={summary.low_battery} label="Low battery (≤20%)" />
          <Stat value={simulated} label="Simulated" hint="demo bins" />
        </div>
      </div>

      <div className="panel">
        <div className="panel-body tight">
          <div className="table-responsive">
            <table className="table-sb">
              <thead>
                <tr><th>Device / bin</th><th>Owner</th><th>Status</th><th>Battery</th><th>Temp</th><th>Source</th><th>Last report</th></tr>
              </thead>
              <tbody>
                {bins.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <Link to={`/dustbins/${b.id}`} className="t-title text-decoration-none">{b.name}</Link>
                      <div className="mini muted">{Number(b.simulate) === 1 ? 'simulated' : 'physical device'} · {b.location || 'no location'}</div>
                    </td>
                    <td className="mini muted">{b.owner_email || <span className="badge-sb badge-offline">unassigned</span>}</td>
                    <td><StatusBadge status={b.status} /></td>
                    <td className={b.battery_level != null && Number(b.battery_level) <= 20 ? 'sev-warning fw-semibold' : ''}>
                      {b.battery_level != null ? `${b.battery_level}%` : '—'}
                    </td>
                    <td>{b.latest && b.latest.temperature_c != null ? `${b.latest.temperature_c.toFixed(1)}°C` : '—'}</td>
                    <td className="mini muted">{b.latest ? b.latest.source : '—'}</td>
                    <td className="mini muted"><TimeAgo timestamp={b.last_seen_at} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <p className="mini muted mt-3">
        <i className="bi bi-info-circle me-1" />
        Device keys are managed per bin from each bin's detail page. Devices authenticate with the{' '}
        <code>X-Device-Key</code> header on <code>/api/devices/ingest</code>.
      </p>
    </div>
  );
}
