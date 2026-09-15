import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { StatusBadge, FillBar, TimeAgo, Stat, DotStat } from '../components/Widgets';

export default function AdminDustbins() {
  const [bins, setBins] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    Promise.all([api.get('/dustbins?all=1'), api.get('/users')])
      .then(([b, u]) => {
        setBins(b.dustbins || []);
        setStats(b.stats);
        setUsers(u.users || []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const assignOwner = async (binId, ownerId) => {
    const bin = bins.find((b) => b.id === binId);
    await api.put(`/dustbins/${binId}`, { name: bin.name, owner_id: ownerId ? Number(ownerId) : null });
    load();
  };

  const removeBin = async (bin) => {
    if (!window.confirm(`Delete "${bin.name}" permanently?`)) return;
    await api.delete(`/dustbins/${bin.id}`);
    load();
  };

  const filtered = bins
    .filter((b) => filter === 'all' || b.status === filter)
    .filter((b) => !q || b.name.toLowerCase().includes(q.toLowerCase()) || (b.owner_email || '').toLowerCase().includes(q.toLowerCase()));

  if (loading) return <div className="page"><div className="d-flex justify-content-center py-5"><div className="spinner-border" /></div></div>;

  return (
    <div className="page wide">
      <div className="page-head">
        <div>
          <h1>All Dustbins</h1>
          <p className="sub">{bins.length} bins platform-wide · {bins.filter((b) => !b.owner_id).length} unassigned</p>
        </div>
        <div className="d-flex gap-2 align-items-center" style={{ maxWidth: 300 }}>
          <input className="form-control form-control-sm" placeholder="Search bin or owner…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="panel mb-4">
        <div className="stat-strip">
          <Stat value={stats?.total ?? bins.length} label="Total bins" />
          <DotStat value={stats?.full ?? 0} label="Full now" status="full" />
          <DotStat value={stats?.almost_full ?? 0} label="Almost full" status="almost_full" />
          <Stat value={stats?.maintenance ?? 0} label="Maintenance" />
          <DotStat value={stats?.offline ?? 0} label="Offline" status="offline" />
          <Stat value={bins.filter((b) => !b.owner_id).length} label="Unassigned" />
        </div>
      </div>

      <div className="chips mb-3">
        {['all', 'full', 'almost_full', 'normal', 'empty', 'maintenance', 'offline'].map((s) => (
          <button key={s} className={`chip ${filter === s ? 'on' : ''}`} onClick={() => setFilter(s)}>
            {s === 'all' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="panel">
        <div className="panel-body tight">
          <div className="table-responsive">
            <table className="table-sb">
              <thead>
                <tr>
                  <th>Bin</th><th>Status</th><th style={{ width: 170 }}>Fill</th><th>Battery</th><th>Owner</th><th>Last report</th><th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <Link to={`/dustbins/${b.id}`} className="t-title text-decoration-none">{b.name}</Link>
                      <div className="mini muted">
                        {b.location || '—'}
                        {Number(b.is_demo) === 1 && <> <span className="badge-sb badge-demo ms-1">demo</span></>}
                      </div>
                    </td>
                    <td><StatusBadge status={b.status} /></td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <span style={{ width: 30 }} className="fw-semibold text-ink">{b.fill_level}%</span>
                        <FillBar level={b.fill_level} status={b.status} />
                      </div>
                    </td>
                    <td>{b.battery_level != null ? `${b.battery_level}%` : '—'}</td>
                    <td>
                      <select
                        className="form-select form-select-sm"
                        value={b.owner_id || ''}
                        onChange={(e) => assignOwner(b.id, e.target.value)}
                        style={{ minWidth: 150 }}
                      >
                        <option value="">— Unassigned —</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>{u.email}</option>
                        ))}
                      </select>
                    </td>
                    <td className="mini muted"><TimeAgo timestamp={b.last_seen_at} /></td>
                    <td className="text-end text-nowrap">
                      <Link to={`/dustbins/${b.id}/edit`} className="btn btn-sb-ghost btn-sm" title="Edit"><i className="bi bi-pencil" /></Link>
                      <button className="btn btn-sb-ghost btn-sm" style={{ color: 'var(--st-full)' }} onClick={() => removeBin(b)} title="Delete"><i className="bi bi-trash3" /></button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-4 muted">No bins match.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
