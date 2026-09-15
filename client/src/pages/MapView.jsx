import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import BinMap, { STATUS_COLORS } from '../components/BinMap';
import { StatusBadge, TimeAgo } from '../components/Widgets';
import { useAuth } from '../components/AuthContext';

export default function MapView() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [bins, setBins] = useState([]);
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    // Admins get the fleet (all bins); users get their own.
    const url = isAdmin ? '/dustbins?all=1' : '/dustbins';
    api.get(url).then((d) => setBins(d.dustbins || [])).finally(() => setLoading(false));
  }, [isAdmin]);

  useEffect(load, [load]);
  useEffect(() => { const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const filtered = statusFilter === 'all' ? bins : bins.filter((b) => b.status === statusFilter);

  if (loading) return <div className="page"><div className="d-flex justify-content-center py-5"><div className="spinner-border" /></div></div>;

  return (
    <div className="page wide">
      <div className="page-head">
        <div>
          <h1>Live Map</h1>
          <p className="sub">{filtered.length} of {bins.length} bins shown · positions update as devices report GPS</p>
        </div>
        <div className="chips">
          {['all', 'full', 'almost_full', 'normal', 'empty', 'maintenance', 'offline'].map((s) => (
            <button key={s} className={`chip ${statusFilter === s ? 'on' : ''}`} onClick={() => setStatusFilter(s)}>
              {s === 'all' ? 'All' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="row g-0">
          <div className="col-lg-9">
            <BinMap bins={filtered} selectedId={selected?.id} onBinSelect={setSelected} fitAll height="600px" />
          </div>
          <div className="col-lg-3">
            <div className="map-side" style={{ maxHeight: 600 }}>
              {filtered.length === 0 && <div className="p-4 text-center muted" style={{ fontSize: '.85rem' }}>No bins match this filter.</div>}
              {filtered.map((b) => (
                <button key={b.id} className={`map-bin-row ${selected?.id === b.id ? 'on' : ''}`} onClick={() => setSelected(b)}>
                  <span className="n">
                    {b.name}
                    <span className="dot" style={{ background: STATUS_COLORS[b.status] }} />
                  </span>
                  <span className="mini muted d-flex justify-content-between">
                    <span>{b.fill_level}% · {b.battery_level != null ? `${b.battery_level}%` : '—'}</span>
                    <TimeAgo timestamp={b.last_seen_at} />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {selected && (
        <div className="panel mt-4">
          <div className="panel-head">
            <div>
              <h3 className="h-title">{selected.name}</h3>
              <p className="h-sub">{selected.location || 'No location description'}</p>
            </div>
            <div className="d-flex gap-2 align-items-center">
              <StatusBadge status={selected.status} demo={Number(selected.is_demo) === 1} />
              <Link to={`/dustbins/${selected.id}`} className="btn btn-sb-outline btn-sm">Open bin →</Link>
            </div>
          </div>
          <div className="panel-body">
            <div className="row g-4">
              <div className="col-md-3"><dl className="kv mb-0"><dt>Fill level</dt><dd>{selected.fill_level}%</dd></dl></div>
              <div className="col-md-3"><dl className="kv mb-0"><dt>Battery</dt><dd>{selected.battery_level != null ? `${selected.battery_level}%` : '—'}</dd></dl></div>
              <div className="col-md-3"><dl className="kv mb-0"><dt>Last report</dt><dd><TimeAgo timestamp={selected.last_seen_at} /></dd></dl></div>
              <div className="col-md-3">
                <dl className="kv mb-0">
                  <dt>Coordinates</dt>
                  <dd className="mono">{selected.latitude != null ? `${Number(selected.latitude).toFixed(5)}, ${Number(selected.longitude).toFixed(5)}` : 'none reported'}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
