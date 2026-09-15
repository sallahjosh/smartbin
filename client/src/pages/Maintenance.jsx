import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Stat, TimeAgo } from '../components/Widgets';
import { useAuth } from '../components/AuthContext';

const STATUS_BADGE = { open: 'badge-full', in_progress: 'badge-almost_full', resolved: 'badge-empty' };

export default function Maintenance() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.get('/dashboard/maintenance').then(setData).catch((e) => setError(e.message));
  }, []);

  useEffect(load, [load]);

  const setStatus = async (binId, recordId, status) => {
    await api.put(`/dustbins/${binId}/maintenance/${recordId}`, { status });
    load();
  };

  if (error) return <div className="page"><div className="alert alert-danger">{error}</div></div>;
  if (!data) return <div className="page"><div className="d-flex justify-content-center py-5"><div className="spinner-border" /></div></div>;

  const { records, stats } = data;

  return (
    <div className="page" style={{ maxWidth: 980 }}>
      <div className="page-head">
        <div>
          <h1>Maintenance</h1>
          <p className="sub">Reported problems and their resolution workflow{isAdmin ? ' — across all customers' : ''}</p>
        </div>
      </div>

      <div className="panel mb-4">
        <div className="stat-strip">
          <Stat value={stats.open} label="Open" />
          <Stat value={stats.in_progress} label="In progress" />
          <Stat value={stats.resolved} label="Resolved" />
          <Stat value={records.length} label="Total records" />
        </div>
      </div>

      {records.length === 0 ? (
        <div className="panel">
          <div className="empty">
            <i className="bi bi-tools" />
            <h5>No maintenance records</h5>
            <p className="mb-0">Report an issue from any bin's detail page and it will appear here.</p>
          </div>
        </div>
      ) : (
        <div className="panel">
          <div className="panel-body tight">
            <div className="table-responsive">
              <table className="table-sb">
                <thead>
                  <tr>
                    <th>Bin</th><th>Issue</th><th>Severity</th><th>Status</th><th>Reported</th><th>Resolved</th>
                    {isAdmin && <th className="text-end">Workflow</th>}
                  </tr>
                </thead>
                <tbody>
                  {records.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <Link to={`/dustbins/${m.dustbin_id}`} className="t-title text-decoration-none">{m.bin_name}</Link>
                        <div className="mini muted">{m.bin_location || '—'}</div>
                      </td>
                      <td style={{ maxWidth: 300 }}>
                        <div className="text-ink" style={{ fontWeight: 560 }}>{m.issue}</div>
                        {m.description && <div className="mini muted">{m.description}</div>}
                      </td>
                      <td><span className={`mini fw-semibold sev-${m.severity === 'critical' || m.severity === 'high' ? 'critical' : m.severity === 'medium' ? 'warning' : 'info'}`}>{m.severity}</span></td>
                      <td><span className={`badge-sb ${STATUS_BADGE[m.status]}`}>{m.status.replace('_', ' ')}</span></td>
                      <td className="mini muted"><TimeAgo timestamp={m.created_at} /></td>
                      <td className="mini muted">
                        {m.resolved_at ? <><TimeAgo timestamp={m.resolved_at} />{m.resolved_by_email && <> by {m.resolved_by_email}</>}</> : '—'}
                      </td>
                      {isAdmin && (
                        <td className="text-end text-nowrap">
                          {m.status !== 'in_progress' && m.status !== 'resolved' && (
                            <button className="btn btn-sb-ghost btn-sm" onClick={() => setStatus(m.dustbin_id, m.id, 'in_progress')}>Start</button>
                          )}
                          {m.status !== 'resolved' && (
                            <button className="btn btn-sb-ghost btn-sm" style={{ color: 'var(--accent)' }} onClick={() => setStatus(m.dustbin_id, m.id, 'resolved')}>Resolve</button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
