import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../components/AuthContext';
import { TimeAgo } from '../components/Widgets';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState(null);
  const [activity, setActivity] = useState([]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone_number: user.phone_number || '',
        organization: user.organization || '',
      });
    }
  }, [user]);

  useEffect(() => {
    api.get('/users/me/activity').then((d) => setActivity(d.activity || [])).catch(() => {});
  }, []);

  if (!form) return <div className="page"><div className="d-flex justify-content-center py-5"><div className="spinner-border" /></div></div>;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const d = await api.put('/auth/me', form);
      setUser(d.user);
      setNotice('Profile saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <div className="page-head">
        <div>
          <h1>Profile</h1>
          <p className="sub">{user.email} · joined {String(user.created_at || '').slice(0, 10)}</p>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="panel">
            <div className="panel-head"><h3 className="h-title">Account details</h3></div>
            <div className="panel-body">
              {notice && <div className="alert alert-success py-2">{notice}</div>}
              {error && <div className="alert alert-danger py-2">{error}</div>}
              <form onSubmit={submit}>
                <div className="row">
                  <div className="col-6 mb-3">
                    <label className="form-label-sb">First name</label>
                    <input className="form-control" value={form.first_name} onChange={set('first_name')} required />
                  </div>
                  <div className="col-6 mb-3">
                    <label className="form-label-sb">Last name</label>
                    <input className="form-control" value={form.last_name} onChange={set('last_name')} required />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label-sb">Phone number <span className="fw-normal muted">(for SMS alerts)</span></label>
                  <input className="form-control" value={form.phone_number} onChange={set('phone_number')} placeholder="+233 55 000 0000" />
                  <div className="form-hint">Alerts are texted here when SMS is enabled by the administrator.</div>
                </div>
                <div className="mb-4">
                  <label className="form-label-sb">Organisation</label>
                  <input className="form-control" value={form.organization} onChange={set('organization')} />
                </div>
                <button className="btn btn-sb-primary" disabled={busy}>
                  {busy ? <span className="spinner-border spinner-border-sm me-2" /> : null} Save profile
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="panel h-100">
            <div className="panel-head"><h3 className="h-title">My recent activity</h3></div>
            <div className="panel-body tight">
              {activity.length === 0 ? (
                <div className="mini muted p-2">Nothing logged yet.</div>
              ) : (
                activity.slice(0, 12).map((a, i) => (
                  <div key={i} className="alert-row">
                    <span className="a-ico info"><i className="bi bi-clock-history" /></span>
                    <div className="flex-grow-1">
                      <div className="a-title" style={{ textTransform: 'capitalize' }}>{a.action.replace(/_/g, ' ')}</div>
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
