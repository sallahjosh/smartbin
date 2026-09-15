import { NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../api';

function Brand() {
  return (
    <Link to="/" className="sidebar-brand">
      <span className="brand-mark"><i className="bi bi-trash-fill" /></span>
      <span className="brand-text">SmartBin<span style={{ color: 'var(--accent)' }}>Cloud</span></span>
    </Link>
  );
}

function SideLink({ to, icon, label, badge = 0, end = false, onNav }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNav}
      className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}
      title={label}
    >
      <i className={`bi ${icon}`} />
      <span className="txt flex-grow-1">{label}</span>
      {badge > 0 && <span className="count">{badge > 99 ? '99+' : badge}</span>}
    </NavLink>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const isAdmin = user?.role === 'admin';

  // Close the mobile drawer on navigation
  useEffect(() => { setOpen(false); }, [location.pathname]);

  useEffect(() => {
    let alive = true;
    const load = () =>
      api.get('/dashboard/unread-count')
        .then((d) => { if (alive) setUnread(d.count || 0); })
        .catch(() => {});
    load();
    const t = setInterval(load, 20000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Friendly crumb: named routes preferred; numeric ids collapse to their parent section.
  const SEGMENTS = {
    dashboard: 'Overview', dustbins: 'My Dustbins', add: 'Register bin', edit: 'Edit bin',
    map: 'Live Map', sensors: 'Sensors', alerts: 'Alerts', maintenance: 'Maintenance',
    analytics: 'History & Trends', profile: 'Profile',
    admin: 'Admin', users: 'Users', devices: 'Devices', activity: 'System Activity', settings: 'Settings',
  };
  const parts = location.pathname.split('/').filter(Boolean);
  let crumb = SEGMENTS[parts[parts.length - 1]] || parts[parts.length - 1]?.replace(/-/g, ' ') || '';
  if (/^\d+$/.test(parts[parts.length - 1] || '')) {
    crumb = SEGMENTS[parts[parts.length - 2]] === 'My Dustbins' ? 'Bin detail' : crumb;
  }

  return (
    <div className={`app-shell ${open ? 'sidebar-open' : ''}`}>
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <Brand />

        <nav className="side-nav">
          <div className="side-group">
            <SideLink to="/dashboard" icon="bi-speedometer2" label="Overview" end onNav={() => setOpen(false)} />
            <SideLink to="/dustbins" icon="bi-trash" label="My Dustbins" onNav={() => setOpen(false)} />
            <SideLink to="/map" icon="bi-geo-alt" label="Live Map" onNav={() => setOpen(false)} />
            <SideLink to="/sensors" icon="bi-cpu" label="Sensors" onNav={() => setOpen(false)} />
            <SideLink to="/alerts" icon="bi-bell" label="Alerts" badge={unread} onNav={() => setOpen(false)} />
            <SideLink to="/maintenance" icon="bi-tools" label="Maintenance" onNav={() => setOpen(false)} />
            <SideLink to="/analytics" icon="bi-graph-up" label="History & Trends" onNav={() => setOpen(false)} />
          </div>

          {isAdmin && (
            <div className="side-group">
              <div className="side-group-label">Administration</div>
              <SideLink to="/admin" icon="bi-sliders" label="Admin Overview" onNav={() => setOpen(false)} />
              <SideLink to="/admin/dustbins" icon="bi-hdd-network" label="All Dustbins" onNav={() => setOpen(false)} />
              <SideLink to="/admin/users" icon="bi-people" label="Users" onNav={() => setOpen(false)} />
              <SideLink to="/admin/map" icon="bi-map" label="Fleet Map" onNav={() => setOpen(false)} />
              <SideLink to="/admin/devices" icon="bi-broadcast" label="Devices" onNav={() => setOpen(false)} />
              <SideLink to="/admin/activity" icon="bi-clock-history" label="System Activity" onNav={() => setOpen(false)} />
              <SideLink to="/admin/settings" icon="bi-gear" label="Settings" onNav={() => setOpen(false)} />
            </div>
          )}

          <div className="side-group">
            <SideLink to="/profile" icon="bi-person" label="Profile" onNav={() => setOpen(false)} />
          </div>
        </nav>

        <div className="sidebar-foot">
          <Link to="/profile" className="user-chip text-decoration-none">
            <span className="avatar">{(user?.first_name || user?.username || '?').charAt(0).toUpperCase()}</span>
            <span className="u-meta text-truncate">
              <span className="u-name d-block text-truncate">{user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username}</span>
              <span className="u-role d-block">{isAdmin ? 'Administrator' : 'User'}</span>
            </span>
          </Link>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="d-flex align-items-center gap-2">
            <button className="icon-btn d-lg-none" onClick={() => setOpen(true)} aria-label="Open menu">
              <i className="bi bi-list" style={{ fontSize: 20 }} />
            </button>
            <span className="crumb text-capitalize">{crumb}</span>
          </div>
          <div className="d-flex align-items-center gap-1">
            <Link to="/alerts" className="icon-btn" title="Alerts">
              <i className="bi bi-bell" style={{ fontSize: 16 }} />
              {unread > 0 && <span className="pip">{unread > 9 ? '9+' : unread}</span>}
            </Link>
            <button className="icon-btn" onClick={handleLogout} title="Log out">
              <i className="bi bi-box-arrow-right" style={{ fontSize: 16 }} />
            </button>
          </div>
        </header>

        <main className="flex-grow-1">
          {children}
        </main>
      </div>
    </div>
  );
}
