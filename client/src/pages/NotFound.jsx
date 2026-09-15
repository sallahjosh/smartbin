import { Link } from 'react-router-dom';
import PublicLayout from '../components/PublicLayout';

export default function NotFound() {
  return (
    <PublicLayout>
      <section className="site-section">
        <div className="inner text-center" style={{ padding: '60px 0' }}>
          <div className="mono" style={{ fontSize: '.8rem', color: 'var(--ink-4)' }}>404</div>
          <h1 className="mt-2 mb-3" style={{ fontSize: '1.6rem' }}>This page doesn't exist</h1>
          <p className="muted mb-4" style={{ maxWidth: '44ch', margin: '0 auto 24px' }}>
            The link may be old or mistyped. The platform itself is fine.
          </p>
          <div className="d-flex gap-2 justify-content-center">
            <Link to="/" className="btn btn-sb-outline">Home</Link>
            <Link to="/dashboard" className="btn btn-sb-primary">Dashboard</Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
