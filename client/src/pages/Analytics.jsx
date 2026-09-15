import { useEffect, useState } from 'react';
import { api } from '../api';
import { FillTrendChart, VolumeBars, RangeChart } from '../components/Charts';
import { AlertIcon, TimeAgo, Stat } from '../components/Widgets';

const RANGES = [7, 14, 30];

export default function Analytics() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setData(null);
    api.get(`/dashboard/history?days=${days}`).then(setData).catch((e) => setError(e.message));
  }, [days]);

  if (error) return <div className="page"><div className="alert alert-danger">{error}</div></div>;

  return (
    <div className="page wide">
      <div className="page-head">
        <div>
          <h1>History &amp; Trends</h1>
          <p className="sub">Fill-level history, sensor volume and alert events across your bins</p>
        </div>
        <div className="chips">
          {RANGES.map((r) => (
            <button key={r} className={`chip ${days === r ? 'on' : ''}`} onClick={() => setDays(r)}>{r} days</button>
          ))}
        </div>
      </div>

      {!data ? (
        <div className="d-flex justify-content-center py-5"><div className="spinner-border" /></div>
      ) : (
        <>
          <div className="panel mb-4">
            <div className="stat-strip">
              <Stat value={data.lid_openings} label="Lid openings" hint={`last ${data.days} days`} />
              <Stat value={data.volume.reduce((s, v) => s + Number(v.count), 0)} label="Sensor readings" hint={`last ${data.days} days`} />
              <Stat value={data.recent_events.length} label="Alert events" hint="shown below" />
            </div>
          </div>

          <div className="row g-4">
            <div className="col-lg-7">
              <div className="panel h-100">
                <div className="panel-head">
                  <div>
                    <h3 className="h-title">Fill-level range</h3>
                    <p className="h-sub">Daily min / avg / max across your bins</p>
                  </div>
                </div>
                <div className="panel-body">
                  {data.trend.length > 1 ? (
                    <RangeChart
                      labels={data.trend.map((t) => t.day.slice(5))}
                      min={data.trend.map((t) => Number(t.min_fill))}
                      avg={data.trend.map((t) => Number(t.avg_fill))}
                      max={data.trend.map((t) => Number(t.max_fill))}
                    />
                  ) : (
                    <div className="empty py-4"><p className="mb-0">Not enough history yet in this range.</p></div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-lg-5">
              <div className="panel h-100">
                <div className="panel-head"><h3 className="h-title">Sensor volume</h3></div>
                <div className="panel-body">
                  {data.volume.length > 0 ? (
                    <VolumeBars labels={data.volume.map((v) => v.day.slice(5))} data={data.volume.map((v) => Number(v.count))} />
                  ) : (
                    <div className="empty py-4"><p className="mb-0">No readings recorded in this range.</p></div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="panel h-100">
                <div className="panel-head">
                  <h3 className="h-title">Events by type</h3>
                </div>
                <div className="panel-body">
                  {data.event_counts.length === 0 ? (
                    <div className="mini muted">No events in this range.</div>
                  ) : (
                    <table className="table-sb">
                      <tbody>
                        {data.event_counts.map((e) => (
                          <tr key={e.type}>
                            <td style={{ width: 46 }}><AlertIcon type={e.type} severity="info" /></td>
                            <td className="t-title" style={{ textTransform: 'capitalize' }}>{e.type.replace('_', ' ')}</td>
                            <td className="text-end fw-semibold text-ink">{e.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="panel h-100">
                <div className="panel-head"><h3 className="h-title">Recent events</h3></div>
                <div className="panel-body tight">
                  {data.recent_events.length === 0 ? (
                    <div className="mini muted p-2">No events in this range.</div>
                  ) : (
                    data.recent_events.map((e) => (
                      <div key={e.id} className="alert-row">
                        <AlertIcon type={e.type} severity={e.severity} />
                        <div className="flex-grow-1">
                          <div className="a-title">{e.title}{e.bin_name && <span className="fw-normal muted"> — {e.bin_name}</span>}</div>
                          <div className="a-msg">{e.message}</div>
                        </div>
                        <span className="a-time"><TimeAgo timestamp={e.created_at} /></span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
