import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import BinMap from '../components/BinMap';
import { StatusBadge, FillBar, TimeAgo } from '../components/Widgets';
import { useAuth } from '../components/AuthContext';

export default function Dustbins() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [bins, setBins] = useState([]);
  const [view, setView] = useState('table');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.get('/dustbins')
      .then((d) => setBins(d.dustbins || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const remove = async (bin) => {
    if (!window.confirm(`Remove "${bin.name}"? Sensor history will be deleted.`)) return;
    await api.delete(`/dustbins/${bin.id}`);
    load();
  };

  const filtered = bins.filter((b) =>
    !q || b.name.toLowerCase().includes(q.toLowerCase()) || (b.location || '').toLowerCase().includes(q.toLowerCase())
  );

  if (loading) return <div className="page"><div className="d-flex justify-content-center py-5"><div className="spinner-border" /></div></div>;
  if (error) return <div className="page"><div className="alert alert-danger">{error}</div></div>;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>My Dustbins</h1>
          <p className="sub">{bins.length} registered bins</p>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <div className="chips">
            <button className={`chip ${view === 'table' ? 'on' : ''}`} onClick={() => setView('table')}>Table</button>
            <button className={`chip ${view === 'map' ? 'on' : ''}`} onClick={() => setView('map')}>Map</button>
          </div>
          <Link to="/dustbins/add" className="btn btn-sb-primary">Register bin</Link>
        </div>
      </div>

      {bins.length === 0 ? (
        <div className="panel">
          <div className="empty">
            <i className="bi bi-trash" />
            <h5>No bins yet</h5>
            <p>Register your first Smart Dustbin to start monitoring.</p>
            <Link to="/dustbins/add" className="btn btn-sb-accent px-4">Register a bin</Link>
          </div>
        </div>
      ) : (
        <>
          <div className="d-flex mb-3" style={{ maxWidth: 320 }}>
            <input className="form-control form-control-sm" placeholder="Search name or location…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>

          {view === 'table' ? (
            <div className="panel">
              <div className="panel-body tight">
                <div className="table-responsive">
                  <table className="table-sb">
                    <thead>
                      <tr>
                        <th>Bin</th><th>Status</th><th style={{ width: 190 }}>Fill</th><th>Battery</th><th>Last report</th><th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((b) => (
                        <tr key={b.id}>
                          <td>
                            <Link to={`/dustbins/${b.id}`} className="t-title text-decoration-none">{b.name}</Link>
                            <div className="mini muted">{b.location || '—'} {Number(b.is_demo) === 1 && <span className="badge-sb badge-demo ms-1">demo</span>}</div>
                          </td>
                          <td><StatusBadge status={b.status} /></td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <span style={{ width: 30 }} className="fw-semibold text-ink">{b.fill_level}%</span>
                              <FillBar level={b.fill_level} status={b.status} />
                            </div>
                          </td>
                          <td className={b.battery_level != null && Number(b.battery_level) <= 20 ? 'sev-warning fw-semibold' : ''}>
                            {b.battery_level != null ? `${b.battery_level}%` : '—'}
                          </td>
                          <td className="mini muted"><TimeAgo timestamp={b.last_seen_at} /></td>
                          <td className="text-end text-nowrap">
                            <Link to={`/dustbins/${b.id}/edit`} className="btn btn-sb-ghost btn-sm" title="Edit"><i className="bi bi-pencil" /></Link>
                            {!isAdmin && <button className="btn btn-sb-ghost btn-sm" style={{ color: 'var(--st-full)' }} onClick={() => remove(b)} title="Remove"><i className="bi bi-trash3" /></button>}
                          </td>
                        </tr>
                      ))}
                      {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-4 muted">No bins match your search.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="panel">
              <div className="row g-0">
                <div className="col-lg-8"><BinMap bins={filtered} selectedId={selected?.id} onBinSelect={setSelected} fitAll height="520px" /></div>
                <div className="col-lg-4">
                  <div className="map-side" style={{ maxHeight: 520 }}>
                    {filtered.map((b) => (
                      <Link key={b.id} to={`/dustbins/${b.id}`} className={`map-bin-row text-decoration-none ${selected?.id === b.id ? 'on' : ''}`}>
                        <span className="n">{b.name} <StatusBadge status={b.status} /></span>
                        <span className="mini muted">{b.fill_level}% full · <TimeAgo timestamp={b.last_seen_at} /></span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
