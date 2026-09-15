import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const d = await login(email, password);
      navigate(location.state?.from?.pathname || (d.user?.role === 'admin' ? '/dashboard' : '/dashboard'), { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <Link to="/" className="auth-brand">
          <span className="brand-mark"><i className="bi bi-trash-fill" /></span>
          SmartBin<span style={{ color: 'var(--accent)' }}>Cloud</span>
        </Link>

        <div className="panel">
          <div className="panel-body">
            <h1 className="mb-1" style={{ fontSize: '1.15rem' }}>Welcome back</h1>
            <p className="muted mb-4" style={{ fontSize: '.875rem' }}>Log in to your waste monitoring dashboard.</p>

            {error && <div className="alert alert-danger py-2">{error}</div>}

            <form onSubmit={submit}>
              <div className="mb-3">
                <label className="form-label-sb" htmlFor="email">Email</label>
                <input id="email" type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus autoComplete="email" />
              </div>
              <div className="mb-4">
                <label className="form-label-sb" htmlFor="password">Password</label>
                <input id="password" type="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
              </div>
              <button className="btn btn-sb-primary w-100 py-2" disabled={busy}>
                {busy ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                Log in
              </button>
            </form>
          </div>
        </div>

        <p className="text-center mt-3 mb-0" style={{ fontSize: '.86rem' }}>
          No account? <Link to="/register">Create one</Link> · <Link to="/">Back to site</Link>
        </p>
      </div>
    </div>
  );
}
