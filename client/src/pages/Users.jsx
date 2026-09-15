import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import { Stat, TimeAgo } from '../components/Widgets';
import { useAuth } from '../components/AuthContext';

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    Promise.all([api.get('/users'), api.get('/users/stats')])
      .then(([u, s]) => { setUsers(u.users || []); setStats(s.stats); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const toggleActive = async (u) => {
    await api.put(`/users/${u.id}/active`, { is_active: Number(u.is_active) === 1 ? 0 : 1 });
    load();
  };

  const changeRole = async (u, role) => {
    if (!window.confirm(`Change ${u.email}'s role to ${role}?`)) return;
    await api.put(`/users/${u.id}/role`, { role });
    load();
  };

  const remove = async (u) => {
    if (!window.confirm(`Delete ${u.email}? Their bins become unassigned.`)) return;
    await api.delete(`/users/${u.id}`);
    load();
  };

  if (loading) return <div className="page"><div className="d-flex justify-content-center py-5"><div className="spinner-border" /></div></div>;

  const filtered = users.filter((u) => !q || `${u.first_name} ${u.last_name} ${u.email} ${u.organization || ''}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="page wide">
      <div className="page-head">
        <div>
          <h1>Users</h1>
          <p className="sub">Registered accounts on the platform</p>
        </div>
        <div style={{ maxWidth: 280 }}>
          <input className="form-control form-control-sm" placeholder="Search users…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="panel mb-4">
        <div className="stat-strip">
          <Stat value={stats?.total ?? 0} label="Total" />
          <Stat value={stats?.active ?? 0} label="Active" />
          <Stat value={stats?.admins ?? 0} label="Admins" />
          <Stat value={stats?.disabled ?? 0} label="Disabled" />
        </div>
      </div>

      <div className="panel">
        <div className="panel-body tight">
          <div className="table-responsive">
            <table className="table-sb">
              <thead>
                <tr>
                  <th>User</th><th>Role</th><th>Bins</th><th>Joined</th><th>Last login</th><th>Status</th><th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const isMe = Number(u.id) === Number(me.id);
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="t-title">{u.first_name} {u.last_name}{isMe && <span className="mini muted"> (you)</span>}</div>
                        <div className="mini muted">{u.email}{u.organization ? ` · ${u.organization}` : ''}</div>
                      </td>
                      <td>
                        <span className={`badge-sb ${u.role === 'admin' ? 'badge-maintenance' : 'badge-normal'}`}>{u.role}</span>
                      </td>
                      <td>{u.bin_count}</td>
                      <td className="mini muted">{String(u.created_at || '').slice(0, 10)}</td>
                      <td className="mini muted"><TimeAgo timestamp={u.last_login_at} /></td>
                      <td>
                        <span className={`badge-sb ${Number(u.is_active) === 1 ? 'badge-empty' : 'badge-offline'}`}>
                          {Number(u.is_active) === 1 ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="text-end text-nowrap">
                        {!isMe && (
                          <>
                            <button className="btn btn-sb-ghost btn-sm" onClick={() => toggleActive(u)}>
                              {Number(u.is_active) === 1 ? 'Disable' : 'Enable'}
                            </button>
                            <select className="form-select form-select-sm d-inline-block w-auto mx-1" value="" onChange={(e) => e.target.value && changeRole(u, e.target.value)}>
                              <option value="">Role…</option>
                              <option value="user">Make user</option>
                              <option value="admin">Make admin</option>
                            </select>
                            <button className="btn btn-sb-ghost btn-sm" style={{ color: 'var(--st-full)' }} onClick={() => remove(u)} title="Delete">
                              <i className="bi bi-trash3" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
