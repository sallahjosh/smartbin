import { useEffect, useState } from 'react';
import { api } from '../api';
import { TimeAgo } from '../components/Widgets';

const ACTIONS = ['all', 'login', 'logout', 'bin_create', 'bin_update', 'bin_delete', 'maintenance_report', 'settings_update', 'user_'];

export default function Activity() {
  const [activity, setActivity] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users/activity').then((d) => setActivity(d.activity || [])).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page"><div className="d-flex justify-content-center py-5"><div className="spinner-border" /></div></div>;

  const filtered = activity.filter((a) => {
    if (filter === 'all') return true;
    if (filter === 'user_') return (a.action || '').startsWith('user_');
    return a.action === filter;
  });

  return (
    <div className="page wide">
      <div className="page-head">
        <div>
          <h1>System Activity</h1>
          <p className="sub">Audit trail of user and admin actions · last {activity.length} entries</p>
        </div>
        <div className="chips">
          {ACTIONS.map((a) => (
            <button key={a} className={`chip ${filter === a ? 'on' : ''}`} onClick={() => setFilter(a)}>
              {a === 'all' ? 'All' : a.replace(/_/g, ' ').replace(' $', '')}
            </button>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-body tight">
          {filtered.length === 0 ? (
            <div className="mini muted p-3">No matching activity.</div>
          ) : (
            <div className="table-responsive">
              <table className="table-sb">
                <thead>
                  <tr><th>When</th><th>User</th><th>Action</th><th>Detail</th></tr>
                </thead>
                <tbody>
                  {filtered.map((a, i) => (
                    <tr key={i}>
                      <td className="mini muted text-nowrap"><TimeAgo timestamp={a.created_at} /></td>
                      <td>{a.user_email || <span className="muted">system</span>}</td>
                      <td><span className="badge-sb badge-info" style={{ textTransform: 'capitalize' }}>{(a.action || '').replace(/_/g, ' ')}</span></td>
                      <td>{a.detail || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
