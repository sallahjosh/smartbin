import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './components/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Public site
import Landing from './pages/Landing';
import HowItWorks from './pages/HowItWorks';
import Features from './pages/Features';
import Benefits from './pages/Benefits';
import LiveDemo from './pages/LiveDemo';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';

// User platform
import Dashboard from './pages/Dashboard';
import Dustbins from './pages/Dustbins';
import DustbinView from './pages/DustbinView';
import DustbinAdd from './pages/DustbinAdd';
import DustbinEdit from './pages/DustbinEdit';
import MapView from './pages/MapView';
import Sensors from './pages/Sensors';
import Alerts from './pages/Alerts';
import Maintenance from './pages/Maintenance';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';

// Admin platform
import AdminHome from './pages/AdminHome';
import AdminDustbins from './pages/AdminDustbins';
import Users from './pages/Users';
import Activity from './pages/Activity';
import AdminSettings from './pages/AdminSettings';
import AdminDevices from './pages/AdminDevices';

export default function App() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border" role="status" />
      </div>
    );
  }

  const platform = (el) => <ProtectedRoute><Layout>{el}</Layout></ProtectedRoute>;
  const admin = (el) => <ProtectedRoute adminOnly><Layout>{el}</Layout></ProtectedRoute>;

  return (
    <div className="page-fade" key={location.pathname}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/features" element={<Features />} />
        <Route path="/benefits" element={<Benefits />} />
        <Route path="/demo" element={<LiveDemo />} />
        <Route path="/login" element={user ? <Redirect /> : <Login />} />
        <Route path="/register" element={user ? <Redirect /> : <Register />} />

        {/* User platform */}
        <Route path="/dashboard" element={platform(<Dashboard />)} />
        <Route path="/dustbins" element={platform(<Dustbins />)} />
        <Route path="/dustbins/add" element={platform(<DustbinAdd />)} />
        <Route path="/dustbins/:id" element={platform(<DustbinView />)} />
        <Route path="/dustbins/:id/edit" element={platform(<DustbinEdit />)} />
        <Route path="/map" element={platform(<MapView />)} />
        <Route path="/sensors" element={platform(<Sensors />)} />
        <Route path="/alerts" element={platform(<Alerts />)} />
        <Route path="/maintenance" element={platform(<Maintenance />)} />
        <Route path="/analytics" element={platform(<Analytics />)} />
        <Route path="/profile" element={platform(<Profile />)} />

        {/* Admin platform */}
        <Route path="/admin" element={admin(<AdminHome />)} />
        <Route path="/admin/dustbins" element={admin(<AdminDustbins />)} />
        <Route path="/admin/users" element={admin(<Users />)} />
        <Route path="/admin/devices" element={admin(<AdminDevices />)} />
        <Route path="/admin/activity" element={admin(<Activity />)} />
        <Route path="/admin/settings" element={admin(<AdminSettings />)} />
        {/* Fleet map reuses the user MapView — the API auto-widens the scope for admins */}
        <Route path="/admin/map" element={admin(<MapView />)} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

function Redirect() {
  return <Navigate to="/dashboard" replace />;
}
