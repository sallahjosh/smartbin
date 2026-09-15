import { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/features', label: 'Features' },
  { to: '/demo', label: 'Live Demo' },
  { to: '/benefits', label: 'Benefits' },
];

function Brand() {
  return (
    <Link to="/" className="d-flex align-items-center gap-2 fw-bold text-ink" style={{ fontSize: '1.05rem', letterSpacing: '-0.02em' }}>
      <span className="brand-mark"><i className="bi bi-trash-fill" /></span>
      SmartBin<span style={{ color: 'var(--accent)' }}>Cloud</span>
    </Link>
  );
}

/**
 * Shared chrome for public marketing pages: sticky nav with active states,
 * mobile menu, and the site footer. Children render inside <main>.
 */
export default function PublicLayout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // close the mobile menu whenever the route changes
  if (menuOpen && location.pathname !== window.lastPath) {
    window.lastPath = location.pathname;
    setMenuOpen(false);
  }

  return (
    <div className="public-shell d-flex flex-column min-vh-100">
      <header className="site-header">
        <div className="inner">
          <Brand />
          <nav className="site-nav">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `nav-link-sb ${isActive ? 'active' : ''}`}>
                {l.label}
              </NavLink>
            ))}
            <span className="nav-cta-gap d-flex gap-2">
              <Link to="/login" className="btn btn-sb-ghost">Log in</Link>
              <Link to="/register" className="btn btn-sb-primary">Get started</Link>
            </span>
          </nav>
          <button
            className="icon-btn mobile-menu-btn d-lg-none"
            style={{ display: 'none' }}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            <i className={`bi ${menuOpen ? 'bi-x-lg' : 'bi-list'}`} style={{ fontSize: 20 }} />
          </button>
        </div>
      </header>

      {menuOpen && (
        <nav className="mobile-menu d-lg-none">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              {l.label}
            </NavLink>
          ))}
          <div className="d-flex gap-2 mt-4">
            <Link to="/login" className="btn btn-sb-outline flex-fill">Log in</Link>
            <Link to="/register" className="btn btn-sb-primary flex-fill">Get started</Link>
          </div>
        </nav>
      )}

      <main className="flex-grow-1">
        {children}
      </main>

      <footer className="site-footer">
        <div className="inner">
          <div className="footer-grid">
            <div className="f-brand">
              <Brand />
              <p>
                Smart sensors, real-time monitoring and instant alerts for smarter waste collection —
                from a single bin to a city-wide fleet.
              </p>
            </div>
            <div>
              <h4>Product</h4>
              <Link to="/how-it-works">How it works</Link>
              <Link to="/features">Features</Link>
              <Link to="/demo">Live demo</Link>
              <Link to="/benefits">Benefits</Link>
            </div>
            <div>
              <h4>Platform</h4>
              <Link to="/login">Log in</Link>
              <Link to="/register">Create account</Link>
              <Link to="/demo">Try the demo</Link>
            </div>
            <div>
              <h4>Developers</h4>
              <a href="#device-api" title="See docs/IOT_INTEGRATION.md">Device API</a>
              <a href="#hardware" title="ESP32 example sketch included">Hardware guide</a>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} SmartBin Cloud — Smart Waste Management Platform</span>
            <span>Demo data is simulated · real devices use the ingest API</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
