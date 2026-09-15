import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Stat, StatusBadge, TimeAgo } from '../components/Widgets';

export default function Sensors() {
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

  if (bins.length === 0) {
    return (
      <div className="page">
        <div className="page-head"><div><h1>Sensor Monitoring</h1></div></div>
        <div className="panel"><div className="empty">
          <i className="bi bi-cpu" /><h5>No bins to monitor</h5>
          <p>Register a bin and connect a device to see live sensor telemetry.</p>
          <Link to="/dustbins/add" className="btn btn-sb-accent px-4">Register a bin</Link>
        </div></div>
      </div>
    );
  }

  return (
    <div className="page wide">
      <div className="page-head">
        <div>
          <h1>Sensor Monitoring</h1>
          <p className="sub">Latest telemetry reported by each device · refreshes every 30 s</p>
        </div>
        <div className="d-flex">
          <Stat value={summary.total} label="Devices" />
          <div className="divider-v mx-4" />
          <Stat value={summary.motion_recent} label="Motion in last reading" />
          <div className="divider-v mx-4" />
          <Stat value={summary.low_battery} label="Low battery (≤20%)" />
        </div>
      </div>

      <div className="panel">
        <div className="panel-body tight">
          <div className="table-responsive">
            <table className="table-sb">
              <thead>
                <tr>
                  <th>Bin</th><th>Fill</th><th>Distance</th><th>Motion</th><th>Lid</th><th>Temp</th><th>Battery</th><th>Signal</th><th>Source</th><th>Reported</th>
                </tr>
              </thead>
              <tbody>
                {bins.map((b) => {
                  const r = b.latest;
                  return (
                    <tr key={b.id}>
                      <td>
                        <Link to={`/dustbins/${b.id}`} className="t-title text-decoration-none">{b.name}</Link>
                        <div className="mini muted"><StatusBadge status={b.status} /></div>
                      </td>
                      <td className="fw-semibold text-ink">{r ? `${r.fill_level}%` : `${b.fill_level}%`}</td>
                      <td>{r && r.distance_cm != null ? `${Math.round(r.distance_cm)} cm` : '—'}</td>
                      <td>{r ? (Number(r.motion_detected) === 1 ? <span className="badge-sb badge-live">detected</span> : <span className="mini muted">none</span>) : '—'}</td>
                      <td>{r ? (Number(r.lid_opened) === 1 ? <span className="badge-sb badge-info">opened</span> : <span className="mini muted">closed</span>) : '—'}</td>
                      <td>{r && r.temperature_c != null ? `${r.temperature_c.toFixed(1)}°C` : '—'}</td>
                      <td className={b.battery_level != null && Number(b.battery_level) <= 20 ? 'sev-warning fw-semibold' : ''}>
                        {b.battery_level != null ? `${b.battery_level}%` : '—'}
                      </td>
                      <td>{r && r.signal_strength != null ? `${r.signal_strength} dBm` : '—'}</td>
                      <td className="mini muted">{r ? r.source : '—'}</td>
                      <td className="mini muted"><TimeAgo timestamp={r ? r.recorded_at : b.last_seen_at} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <p className="mini muted mt-3">
        <i className="bi bi-info-circle me-1" />
        Devices post telemetry to <code>POST /api/devices/ingest</code> with their device key — see the{' '}
        <a href="https://github.com/your-repo" onClick={(e) => e.preventDefault()} title="See docs/IOT_INTEGRATION.md in the project">integration guide</a> for the payload contract.
      </p>
    </div>
  );
}
