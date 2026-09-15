import { useEffect, useState } from 'react';
import { api } from '../api';

export default function AdminSettings() {
  const [settings, setSettings] = useState(null);
  const [system, setSystem] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/settings').then((d) => setSettings(d.settings)).catch((e) => setError(e.message));
    api.get('/system/info').then((d) => setSystem(d.system)).catch(() => {});
  }, []);

  if (!settings) return <div className="page"><div className="d-flex justify-content-center py-5"><div className="spinner-border" /></div></div>;

  const set = (k) => (e) => {
    const value = e.target.type === 'checkbox' ? (e.target.checked ? '1' : '0') : e.target.value;
    setSettings((s) => ({ ...s, [k]: value }));
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setNotice(''); setError('');
    try {
      await api.put('/settings', settings);
      setNotice('Settings saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const uptimeDays = system ? Math.floor(system.uptime_seconds / 86400) : null;
  const uptimeHours = system ? Math.floor((system.uptime_seconds % 86400) / 3600) : null;

  return (
    <div className="page" style={{ maxWidth: 860 }}>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p className="sub">Platform preferences and provider configuration</p>
        </div>
      </div>

      {notice && <div className="alert alert-success py-2">{notice}</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      <form onSubmit={save}>
        <div className="panel mb-4">
          <div className="panel-head"><h3 className="h-title">Notifications</h3></div>
          <div className="panel-body">
            <div className="form-check form-switch mb-3">
              <input className="form-check-input" type="checkbox" id="sms_enabled" checked={settings.sms_enabled === '1'} onChange={set('sms_enabled')} />
              <label className="form-check-label" htmlFor="sms_enabled" style={{ fontSize: '.9rem' }}>
                SMS alerts <span className="muted">— text bin owners on full / maintenance / offline events</span>
              </label>
            </div>
            <div className="form-check form-switch mb-3">
              <input className="form-check-input" type="checkbox" id="email_notifications" checked={settings.email_notifications === '1'} onChange={set('email_notifications')} />
              <label className="form-check-label" htmlFor="email_notifications" style={{ fontSize: '.9rem' }}>
                Email alerts <span className="muted">— requires an email provider (currently stubbed)</span>
              </label>
            </div>
            <div className="mb-2" style={{ maxWidth: 340 }}>
              <label className="form-label-sb">Alert digest address</label>
              <input className="form-control form-control-sm" value={settings.notification_email || ''} onChange={set('notification_email')} placeholder="ops@yourdomain.com" />
            </div>
          </div>
        </div>

        <div className="panel mb-4">
          <div className="panel-head"><h3 className="h-title">Devices &amp; simulation</h3></div>
          <div className="panel-body">
            <div className="form-check form-switch mb-3">
              <input className="form-check-input" type="checkbox" id="sim" checked={settings.simulation_enabled === '1'} onChange={set('simulation_enabled')} />
              <label className="form-check-label" htmlFor="sim" style={{ fontSize: '.9rem' }}>
                Demo simulator <span className="muted">— advance demo bins every 30 s through the real pipeline</span>
              </label>
            </div>
            <div style={{ maxWidth: 220 }}>
              <label className="form-label-sb">Offline after (minutes)</label>
              <input className="form-control form-control-sm" type="number" min="5" value={settings.offline_after_minutes || 30} onChange={set('offline_after_minutes')} />
              <div className="form-hint">Devices silent longer than this are flagged offline.</div>
            </div>
          </div>
        </div>

        <div className="d-flex gap-2 mb-4">
          <button className="btn btn-sb-primary px-4" disabled={busy}>
            {busy ? <span className="spinner-border spinner-border-sm me-2" /> : null} Save settings
          </button>
        </div>
      </form>

      {system && (
        <div className="panel mb-4">
          <div className="panel-head">
            <h3 className="h-title">System diagnostics</h3>
            <span className="badge-sb badge-live">database connected</span>
          </div>
          <div className="panel-body">
            <dl className="kv mb-0">
              <dt>API uptime</dt><dd>{uptimeDays}d {uptimeHours}h (Node {system.node_version})</dd>
              <dt>Bins</dt><dd>{system.bins.total} total · {system.bins.real} real · {system.bins.demo} demo</dd>
              <dt>Users</dt><dd>{system.users}</dd>
              <dt>Sensor readings</dt><dd>{system.readings.total.toLocaleString()} total · {system.readings.last_24h.toLocaleString()} last 24 h</dd>
              <dt>SMS provider</dt>
              <dd>
                {system.notification_providers.sms.name} —{' '}
                {system.notification_providers.sms.configured
                  ? <span className="badge-sb badge-empty">configured</span>
                  : <span className="badge-sb badge-offline">not configured — alerts are logged, not sent</span>}
              </dd>
              <dt>Email provider</dt>
              <dd>
                {system.notification_providers.email.name} —{' '}
                {system.notification_providers.email.configured
                  ? <span className="badge-sb badge-empty">configured</span>
                  : <span className="badge-sb badge-offline">stub — attempts logged only</span>}
              </dd>
            </dl>
          </div>
        </div>
      )}

      <p className="mini muted">
        <i className="bi bi-info-circle me-1" />
        SMS credentials are set via environment variables on the server (MNOTIFY_API_KEY etc.) — see <code>server/.env.example</code>.
        The platform never fakes an SMS send: unconfigured providers log every attempt as <code>skipped</code>.
      </p>
    </div>
  );
}
