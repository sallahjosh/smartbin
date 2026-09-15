import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../components/AuthContext';

export default function DustbinEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [form, setForm] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/dustbins/${id}`).then((d) => {
      setForm({
        name: d.dustbin.name || '',
        location: d.dustbin.location || '',
        latitude: d.dustbin.latitude ?? '',
        longitude: d.dustbin.longitude ?? '',
        capacity_liters: d.dustbin.capacity_liters || 120,
        notes: d.dustbin.notes || '',
        status: d.dustbin.status,
        simulate: Number(d.dustbin.simulate) === 1,
      });
    }).catch((e) => setError(e.message));

    if (isAdmin) api.get('/users').then((d) => setUsers(d.users || [])).catch(() => {});
  }, [id, isAdmin]);

  if (error) return <div className="page"><div className="alert alert-danger">{error}</div></div>;
  if (!form) return <div className="page"><div className="d-flex justify-content-center py-5"><div className="spinner-border" /></div></div>;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api.put(`/dustbins/${id}`, {
        ...form,
        latitude: form.latitude === '' ? null : Number(form.latitude),
        longitude: form.longitude === '' ? null : Number(form.longitude),
        capacity_liters: Number(form.capacity_liters) || 120,
      });
      navigate(`/dustbins/${id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="page" style={{ maxWidth: 620 }}>
      <div className="breadcrumb-sb"><Link to="/dustbins">My Dustbins</Link> <span className="mx-1">/</span> Edit</div>
      <div className="page-head">
        <div>
          <h1>Edit bin</h1>
          <p className="sub">Changes apply immediately.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-body">
          {error && <div className="alert alert-danger py-2">{error}</div>}
          <form onSubmit={submit}>
            <div className="mb-3">
              <label className="form-label-sb">Bin name *</label>
              <input className="form-control" value={form.name} onChange={set('name')} required />
            </div>
            <div className="mb-3">
              <label className="form-label-sb">Location description</label>
              <input className="form-control" value={form.location} onChange={set('location')} />
            </div>
            <div className="row">
              <div className="col-6 mb-3">
                <label className="form-label-sb">Latitude</label>
                <input className="form-control" type="number" step="any" value={form.latitude} onChange={set('latitude')} />
              </div>
              <div className="col-6 mb-3">
                <label className="form-label-sb">Longitude</label>
                <input className="form-control" type="number" step="any" value={form.longitude} onChange={set('longitude')} />
              </div>
            </div>
            <div className="row">
              <div className="col-6 mb-3">
                <label className="form-label-sb">Capacity (litres)</label>
                <input className="form-control" type="number" min="10" value={form.capacity_liters} onChange={set('capacity_liters')} />
              </div>
              <div className="col-6 mb-3">
                <label className="form-label-sb">Status</label>
                <select className="form-select" value={form.status} onChange={set('status')}>
                  <option value="empty">Empty</option>
                  <option value="normal">Normal</option>
                  <option value="almost_full">Almost full</option>
                  <option value="full">Full</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="offline">Offline</option>
                </select>
                <div className="form-hint">Use to reset after emptying — devices will overwrite on next report.</div>
              </div>
            </div>
            {isAdmin && (
              <div className="mb-3">
                <label className="form-label-sb">Owner</label>
                <select
                  className="form-select"
                  value=""
                  onChange={async (e) => {
                    if (!e.target.value) return;
                    await api.put(`/dustbins/${id}`, { name: form.name, owner_id: Number(e.target.value) });
                    window.location.reload();
                  }}
                >
                  <option value="">Change owner…</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}
                </select>
                <div className="form-hint">Admins can transfer a bin to another account.</div>
              </div>
            )}
            <div className="mb-3">
              <label className="form-label-sb">Notes</label>
              <textarea className="form-control" rows={2} value={form.notes} onChange={set('notes')} />
            </div>
            {isAdmin && (
              <div className="form-check mb-4">
                <input className="form-check-input" type="checkbox" id="sim" checked={form.simulate} onChange={(e) => setForm((f) => ({ ...f, simulate: e.target.checked }))} />
                <label className="form-check-label" htmlFor="sim" style={{ fontSize: '.86rem' }}>
                  Simulate this bin <span className="muted">(demo data — excluded from real fleet counts)</span>
                </label>
              </div>
            )}
            <div className="d-flex gap-2">
              <button className="btn btn-sb-primary px-4" disabled={busy}>
                {busy ? <span className="spinner-border spinner-border-sm me-2" /> : null} Save changes
              </button>
              <Link to={`/dustbins/${id}`} className="btn btn-sb-ghost">Cancel</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
