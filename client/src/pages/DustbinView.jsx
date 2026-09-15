import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../components/AuthContext';
import { StatusBadge, FillBar, TimeAgo, Stat } from '../components/Widgets';
import { FillTrendChart } from '../components/Charts';
import BinMap, { STATUS_COLORS } from '../components/BinMap';

export default function DustbinView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [bin, setBin] = useState(null);
  const [reading, setReading] = useState(null);
  const [readings, setReadings] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [issue, setIssue] = useState({ issue: '', severity: 'medium', description: '' });
  const [reporting, setReporting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [d, r, m, a] = await Promise.all([
        api.get(`/dustbins/${id}`),
        api.get(`/dustbins/${id}/readings?limit=120`),
        api.get(`/dustbins/${id}/maintenance`),
        api.get(`/dashboard/alerts?limit=200`),
      ]);
      setBin(d.dustbin);
      setReading(d.latest_reading);
      setReadings(r.readings || []);
      setMaintenance(m.records || []);
      setAlerts((a.alerts || []).filter((x) => Number(x.dustbin_id) === Number(id)).slice(0, 8));
    } catch (e) {
      setError(e.message);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const removeBin = async () => {
    if (!window.confirm(`Remove "${bin.name}"? All history will be deleted.`)) return;
    await api.delete(`/dustbins/${bin.id}`);
    navigate('/dustbins');
  };

  const regenerateKey = async () => {
    if (!window.confirm('Generate a new device key? The old key stops working immediately — update the device firmware.')) return;
    const d = await api.post(`/dustbins/${bin.id}/regenerate-key`);
    setBin((b) => ({ ...b, device_key: d.device_key }));
  };

  const reportIssue = async (e) => {
    e.preventDefault();
    setReporting(true);
    try {
      await api.post(`/dustbins/${bin.id}/maintenance`, issue);
      setIssue({ issue: '', severity: 'medium', description: '' });
      await load();
    } finally {
      setReporting(false);
    }
  };

  const copyKey = async () => {
    try { await navigator.clipboard.writeText(bin.device_key || ''); } catch { /* clipboard unavailable */ }
  };

  if (error) return <div className="page"><div className="alert alert-danger">{error}</div></div>;
  if (!bin) return <div className="page"><div className="d-flex justify-content-center py-5"><div className="spinner-border" /></div></div>;

  const chart = readings.slice(-120);

  return (
    <div className="page wide">
      <div className="breadcrumb-sb">
        <Link to="/dustbins">My Dustbins</Link> <span className="mx-1">/</span> {bin.name}
      </div>

      <div className="page-head">
        <div>
          <h1 className="d-flex align-items-center gap-2">
            {bin.name}
            <StatusBadge status={bin.status} demo={Number(bin.is_demo) === 1} />
          </h1>
          <p className="sub">
            {bin.location || 'No location set'}
            {bin.latitude != null && <> · <span className="mono">{Number(bin.latitude).toFixed(5)}, {Number(bin.longitude).toFixed(5)}</span></>}
          </p>
        </div>
        <div className="d-flex gap-2">
          <Link to={`/dustbins/${bin.id}/edit`} className="btn btn-sb-outline">Edit</Link>
          {!isAdmin && <button className="btn btn-sb-danger" onClick={removeBin}>Remove</button>}
        </div>
      </div>

      {/* Current state strip */}
      <div className="panel mb-4">
        <div className="panel-body">
          <div className="row g-4 align-items-center">
            <div className="col-md-4">
              <div className="l mb-2">Fill level</div>
              <div className="d-flex align-items-center gap-3">
                <span className="stat-num" style={{ fontSize: '1.9rem', fontWeight: 680, color: 'var(--ink)' }}>{bin.fill_level}%</span>
                <div style={{ flex: 1, maxWidth: 150 }}><FillBar level={bin.fill_level} status={bin.status} /></div>
              </div>
              <div className="hint mini muted mt-1">{reading ? `reported ${timeShort(reading.recorded_at)} (${reading.source})` : 'no readings yet'}</div>
            </div>
            <div className="col-md-8">
              <div className="row g-3">
                <div className="col-6 col-lg-3"><Stat value={bin.battery_level != null ? `${bin.battery_level}%` : '—'} label="Battery" /></div>
                <div className="col-6 col-lg-3"><Stat value={reading && reading.temperature_c != null ? `${reading.temperature_c.toFixed(1)}°C` : '—'} label="Temperature" /></div>
                <div className="col-6 col-lg-3"><Stat value={<TimeAgo timestamp={bin.last_seen_at} />} label="Last report" /></div>
                <div className="col-6 col-lg-3"><Stat value={maintenance.filter((m) => m.status !== 'resolved').length} label="Open issues" /></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Fill history */}
        <div className="col-lg-7">
          <div className="panel h-100">
            <div className="panel-head">
              <div>
                <h3 className="h-title">Fill-level history</h3>
                <p className="h-sub">Last {chart.length} readings{chart.length > 0 && ` · ${String(chart[0].recorded_at).slice(0, 16)} → ${String(chart[chart.length - 1].recorded_at).slice(0, 16)}`}</p>
              </div>
              <Link to="/analytics" className="btn btn-sb-ghost btn-sm">Fleet trends →</Link>
            </div>
            <div className="panel-body">
              {chart.length > 1 ? (
                <FillTrendChart
                  labels={chart.map((r) => String(r.recorded_at).slice(5, 16).replace('T', ' '))}
                  data={chart.map((r) => r.fill_level)}
                  height={250}
                />
              ) : (
                <div className="empty py-4">
                  <i className="bi bi-activity" />
                  <h5>Waiting for data</h5>
                  <p className="mb-0">The chart fills in as the device (or simulator) reports readings.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Latest payload */}
        <div className="col-lg-5">
          <div className="panel h-100">
            <div className="panel-head"><h3 className="h-title">Latest sensor payload</h3></div>
            <div className="panel-body">
              {reading ? (
                <dl className="kv mb-0">
                  <dt>Fill level</dt><dd>{reading.fill_level}%</dd>
                  <dt>Distance</dt><dd>{reading.distance_cm != null ? `${Math.round(reading.distance_cm)} cm` : '—'}</dd>
                  <dt>Motion</dt><dd>{Number(reading.motion_detected) === 1 ? 'Detected' : 'None'}</dd>
                  <dt>Lid</dt><dd>{Number(reading.lid_opened) === 1 ? 'Opened' : 'Closed'}</dd>
                  <dt>Temperature</dt><dd>{reading.temperature_c != null ? `${reading.temperature_c.toFixed(1)}°C` : '—'}</dd>
                  <dt>Battery</dt><dd>{reading.battery_level != null ? `${reading.battery_level}%` : '—'}</dd>
                  <dt>Signal</dt><dd>{reading.signal_strength != null ? `${reading.signal_strength} dBm` : '—'}</dd>
                  <dt>Recorded</dt><dd>{String(reading.recorded_at).replace('T', ' ').slice(0, 19)}</dd>
                  <dt>Source</dt><dd>{reading.source}</dd>
                </dl>
              ) : (
                <div className="mini muted">
                  No telemetry yet. Devices post to <code>POST /api/devices/ingest</code> with the key below.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Location map */}
        <div className="col-lg-7">
          <div className="panel">
            <div className="panel-head">
              <h3 className="h-title">Location</h3>
              {bin.latitude == null && <span className="mini muted">No GPS reported yet</span>}
            </div>
            <div className="panel-body tight">
              <BinMap bins={[bin]} selectedId={bin.id} zoom={16} height="280px" />
            </div>
          </div>
        </div>

        {/* Device provisioning */}
        <div className="col-lg-5">
          <div className="panel h-100">
            <div className="panel-head"><h3 className="h-title">Device provisioning</h3></div>
            <div className="panel-body">
              <label className="form-label-sb">Device key</label>
              <div className="d-flex gap-2 mb-2">
                <input className="form-control mono" readOnly value={showKey ? bin.device_key || '' : '••••••••••••••••••••••••••••••••'} />
                <button className="btn btn-sb-outline" onClick={() => setShowKey((s) => !s)} title={showKey ? 'Hide' : 'Show'}>
                  <i className={`bi ${showKey ? 'bi-eye-slash' : 'bi-eye'}`} />
                </button>
                <button className="btn btn-sb-outline" onClick={copyKey} title="Copy"><i className="bi bi-clipboard" /></button>
              </div>
              <p className="form-hint mb-3">
                Send it as the <code>X-Device-Key</code> header when posting telemetry. Regenerating invalidates the old key.
              </p>
              <button className="btn btn-sb-outline btn-sm" onClick={regenerateKey}><i className="bi bi-arrow-repeat me-1" /> Regenerate key</button>
            </div>
          </div>
        </div>

        {/* Maintenance */}
        <div className="col-lg-7">
          <div className="panel h-100">
            <div className="panel-head">
              <h3 className="h-title">Maintenance</h3>
              <span className="mini muted">{maintenance.length} record{maintenance.length === 1 ? '' : 's'}</span>
            </div>
            <div className="panel-body">
              {maintenance.length > 0 && (
                <table className="table-sb mb-4">
                  <thead><tr><th>Issue</th><th>Severity</th><th>Status</th><th>Reported</th></tr></thead>
                  <tbody>
                    {maintenance.map((m) => (
                      <tr key={m.id}>
                        <td className="t-title">{m.issue}</td>
                        <td><span className={`mini fw-semibold sev-${m.severity === 'critical' || m.severity === 'high' ? 'critical' : m.severity === 'medium' ? 'warning' : 'info'}`}>{m.severity}</span></td>
                        <td><span className={`badge-sb ${m.status === 'resolved' ? 'badge-empty' : m.status === 'in_progress' ? 'badge-almost_full' : 'badge-full'}`}>{m.status.replace('_', ' ')}</span></td>
                        <td className="mini muted"><TimeAgo timestamp={m.created_at} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <form onSubmit={reportIssue} className="row g-2 align-items-end">
                <div className="col-12"><div className="section-title mb-0">Report a problem</div></div>
                <div className="col-md-5">
                  <input className="form-control form-control-sm" placeholder="Issue (e.g. lid jammed)" value={issue.issue} onChange={(e) => setIssue((s) => ({ ...s, issue: e.target.value }))} required />
                </div>
                <div className="col-md-3">
                  <select className="form-select form-select-sm" value={issue.severity} onChange={(e) => setIssue((s) => ({ ...s, severity: e.target.value }))}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <button className="btn btn-sb-primary btn-sm w-100" disabled={reporting}>
                    {reporting ? <span className="spinner-border spinner-border-sm me-1" /> : null} Report issue
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Alerts for this bin */}
        <div className="col-lg-5">
          <div className="panel h-100">
            <div className="panel-head">
              <h3 className="h-title">Recent alerts</h3>
              <Link to="/alerts" className="btn btn-sb-ghost btn-sm">All alerts →</Link>
            </div>
            <div className="panel-body tight">
              {alerts.length === 0 ? (
                <div className="mini muted p-2">No alerts for this bin.</div>
              ) : (
                alerts.map((a) => (
                  <div key={a.id} className="alert-row">
                    <span className="a-ico info"><i className={`bi ${a.type === 'full' ? 'bi-trash-fill' : a.type === 'maintenance' ? 'bi-tools' : 'bi-bell'}`} /></span>
                    <div className="flex-grow-1">
                      <div className="a-title">{a.title}</div>
                      <div className="a-msg">{a.message}</div>
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

function timeShort(ts) {
  return String(ts).replace('T', ' ').slice(5, 16);
}
