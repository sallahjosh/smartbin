import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: '', last_name: '', username: '', email: '',
    phone_number: '', organization: '', password: '', confirm: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
    setBusy(true);
    try {
      const { confirm, ...payload } = form;
      await register(payload);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card" style={{ maxWidth: 460 }}>
        <Link to="/" className="auth-brand">
          <span className="brand-mark"><i className="bi bi-trash-fill" /></span>
          SmartBin<span style={{ color: 'var(--accent)' }}>Cloud</span>
        </Link>

        <div className="panel">
          <div className="panel-body">
            <h1 className="mb-1" style={{ fontSize: '1.15rem' }}>Create your account</h1>
            <p className="muted mb-4" style={{ fontSize: '.875rem' }}>Monitor your dustbins from one dashboard — free to start.</p>

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
                <label className="form-label-sb">Username</label>
                <input className="form-control" value={form.username} onChange={set('username')} required minLength={3} />
              </div>
              <div className="mb-3">
                <label className="form-label-sb">Email</label>
                <input type="email" className="form-control" value={form.email} onChange={set('email')} required autoComplete="email" />
              </div>
              <div className="row">
                <div className="col-6 mb-3">
                  <label className="form-label-sb">Phone <span className="fw-normal muted">(for SMS)</span></label>
                  <input className="form-control" value={form.phone_number} onChange={set('phone_number')} placeholder="+233…" />
                </div>
                <div className="col-6 mb-3">
                  <label className="form-label-sb">Organisation</label>
                  <input className="form-control" value={form.organization} onChange={set('organization')} />
                </div>
              </div>
              <div className="row">
                <div className="col-6 mb-4">
                  <label className="form-label-sb">Password</label>
                  <input type="password" className="form-control" value={form.password} onChange={set('password')} required minLength={8} autoComplete="new-password" />
                </div>
                <div className="col-6 mb-4">
                  <label className="form-label-sb">Confirm</label>
                  <input type="password" className="form-control" value={form.confirm} onChange={set('confirm')} required autoComplete="new-password" />
                </div>
              </div>
              <button className="btn btn-sb-primary w-100 py-2" disabled={busy}>
                {busy ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                Create account
              </button>
            </form>
          </div>
        </div>

        <p className="text-center mt-3 mb-0" style={{ fontSize: '.86rem' }}>
          Already registered? <Link to="/login">Log in</Link> · <Link to="/">Back to site</Link>
        </p>
      </div>
    </div>
  );
}
