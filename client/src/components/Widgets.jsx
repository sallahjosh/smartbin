import { STATUS_LABELS, STATUS_COLORS } from './BinMap';

/** Coloured status pill (Empty / Normal / Almost Full / Full / …). */
export function StatusBadge({ status, demo = false }) {
  const label = STATUS_LABELS[status] || status;
  return (
    <span className={`badge-sb badge-${status}`}>
      {demo && <i className="bi bi-magic" />}
      {label}
    </span>
  );
}

/** Slim fill bar with status colour. */
export function FillBar({ level, status }) {
  const color = STATUS_COLORS[status] || '#94a3b3';
  return (
    <div className="fillbar" title={`${level}% full`}>
      <span style={{ width: `${Math.min(100, Math.max(0, level))}%`, background: color }} />
    </div>
  );
}

/** KPI figure — plain number + label, no icon tile. */
export function Stat({ value, label, hint, color }) {
  return (
    <div className="stat">
      <div className="v" style={color ? { color } : undefined}>{value}</div>
      <div className="l">{label}</div>
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

/** Stat with a status-coloured dot before the label. */
export function DotStat({ value, label, status }) {
  return (
    <div className="stat">
      <div className="v">{value}</div>
      <div className="l"><span className="dot" style={{ background: STATUS_COLORS[status] || '#94a3b3' }} />{label}</div>
    </div>
  );
}

/** "SIMULATED DATA" pill for demo UIs. */
export function DemoBadge() {
  return (
    <span className="badge-sb badge-demo" title="This dashboard runs on realistic simulated data — not live hardware.">
      <i className="bi bi-cpu" /> Simulated data
    </span>
  );
}

/** Alert severity icon block used in alert feed rows. */
export function AlertIcon({ type, severity }) {
  const icons = {
    full: 'bi-trash-fill',
    almost_full: 'bi-exclamation-triangle',
    maintenance: 'bi-tools',
    offline: 'bi-wifi-off',
    online: 'bi-arrow-repeat',
    low_battery: 'bi-battery-low',
    device_error: 'bi-bug',
    system: 'bi-info-circle',
  };
  const cls = severity === 'critical' ? 'critical' : severity === 'warning' ? 'warning' : 'info';
  return (
    <span className={`a-ico ${cls}`}>
      <i className={`bi ${icons[type] || 'bi-bell'}`} />
    </span>
  );
}

/** Tiny relative "x min ago" style label. */
export function TimeAgo({ timestamp }) {
  if (!timestamp) return <span>never</span>;
  const iso = String(timestamp).includes('T') ? timestamp : String(timestamp).replace(' ', 'T') + 'Z';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  let out;
  if (mins < 1) out = 'just now';
  else if (mins < 60) out = `${mins} min ago`;
  else if (mins < 1440) out = `${Math.floor(mins / 60)} h ago`;
  else out = `${Math.floor(mins / 1440)} d ago`;
  return <span title={String(timestamp).replace('T', ' ').slice(0, 19)}>{out}</span>;
}
