import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function DustbinAdd() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', location: '', latitude: '', longitude: '', capacity_liters: 120, notes: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const payload = {
        ...form,
        latitude: form.latitude === '' ? null : Number(form.latitude),
        longitude: form.longitude === '' ? null : Number(form.longitude),
      };
      const d = await api.post('/dustbins', payload);
      setCreated(d.dustbin);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const copyKey = async () => {
    try { await navigator.clipboard.writeText(created.device_key); } catch { /* clipboard unavailable */ }
  };

  if (created) {
    return (
      <div className="page" style={{ maxWidth: 620 }}>
        <div className="panel">
          <div className="panel-head">
            <h3 className="h-title">Bin registered</h3>
            <span className="badge-sb badge-empty">ready</span>
          </div>
          <div className="panel-body">
            <p className="muted" style={{ fontSize: '.9rem' }}>
              <strong className="text-ink">{form.name}</strong> is registered. This is the device key your
              ESP32/Arduino will use to authenticate — copy it now, it is shown in full only this once in this panel
              (you can reveal it again from the bin's detail page).
            </p>
            <div className="d-flex gap-2 mb-3">
              <input className="form-control mono" readOnly value={created.device_key} onFocus={(e) => e.target.select()} />
              <button className="btn btn-sb-outline" onClick={copyKey}><i className="bi bi-clipboard me-1" /> Copy</button>
            </div>
            <p className="form-hint mb-4">
              Firmware posts telemetry to <code>POST /api/devices/ingest</code> with header{' '}
              <code>X-Device-Key: {created.device_key.slice(0, 6)}…</code> — see <code>docs/IOT_INTEGRATION.md</code>.
            </p>
            <div className="d-flex gap-2">
              <Link to={`/dustbins/${created.id}`} className="btn btn-sb-primary">Open bin page</Link>
              <Link to="/dustbins/add" className="btn btn-sb-outline">Register another</Link>
              <button className="btn btn-sb-ghost" onClick={() => navigate('/dashboard')}>Done</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: 620 }}>
      <div className="breadcrumb-sb"><Link to="/dustbins">My Dustbins</Link> <span className="mx-1">/</span> Register</div>
      <div className="page-head">
        <div>
          <h1>Register a dustbin</h1>
          <p className="sub">Give it a name and location — a device key is generated automatically.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-body">
          {error && <div className="alert alert-danger py-2">{error}</div>}
          <form onSubmit={submit}>
            <div className="mb-3">
              <label className="form-label-sb">Bin name *</label>
              <input className="form-control" value={form.name} onChange={set('name')} required placeholder="e.g. Main Entrance" autoFocus />
            </div>
            <div className="mb-3">
              <label className="form-label-sb">Location description</label>
              <input className="form-control" value={form.location} onChange={set('location')} placeholder="e.g. North gate, beside the guard post" />
            </div>
            <div className="row">
              <div className="col-6 mb-3">
                <label className="form-label-sb">Latitude</label>
                <input className="form-control" type="number" step="any" value={form.latitude} onChange={set('latitude')} placeholder="6.5244" />
                <div className="form-hint">Optional — the device GPS can update it later.</div>
              </div>
              <div className="col-6 mb-3">
                <label className="form-label-sb">Longitude</label>
                <input className="form-control" type="number" step="any" value={form.longitude} onChange={set('longitude')} placeholder="3.3792" />
              </div>
            </div>
            <div className="row">
              <div className="col-6 mb-4">
                <label className="form-label-sb">Capacity (litres)</label>
                <input className="form-control" type="number" min="10" value={form.capacity_liters} onChange={set('capacity_liters')} />
              </div>
              <div className="col-6 mb-4">
                <label className="form-label-sb">Notes</label>
                <input className="form-control" value={form.notes} onChange={set('notes')} placeholder="Anything useful" />
              </div>
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-sb-primary px-4" disabled={busy}>
                {busy ? <span className="spinner-border spinner-border-sm me-2" /> : null} Register bin
              </button>
              <Link to="/dustbins" className="btn btn-sb-ghost">Cancel</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
