import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { STATUS_LABELS, STATUS_COLORS } from './BinMap';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

const GRID = { color: '#eef1f3' };
const TICK = { color: '#6b7a89', font: { size: 10.5 } };

const base = {
  responsive: true,
  maintainAspectRatio: false,
};

/** Fill-level trend line. labels: strings, data: percentages. */
export function FillTrendChart({ labels, data, label = 'Avg fill (%)', height = 240, min = 0, max = 100 }) {
  return (
    <div style={{ height }}>
      <Line
        data={{
          labels,
          datasets: [
            {
              label,
              data,
              borderColor: '#0e7c48',
              backgroundColor: 'rgba(14,124,72,.07)',
              fill: true,
              tension: 0.3,
              pointRadius: 2,
              pointHoverRadius: 4,
              borderWidth: 1.8,
            },
          ],
        }}
        options={{
          ...base,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { ...TICK, maxTicksLimit: 10 } },
            y: { min, max, grid: GRID, ticks: { ...TICK, stepSize: max > 100 ? undefined : 25 } },
          },
        }}
      />
    </div>
  );
}

/** Status distribution doughnut. counts: { empty: n, normal: n, ... }. */
export function StatusDoughnut({ counts, height = 230 }) {
  const order = ['empty', 'normal', 'almost_full', 'full', 'maintenance', 'offline'];
  const present = order.filter((s) => (counts[s] || 0) > 0);
  return (
    <div style={{ height }}>
      <Doughnut
        data={{
          labels: present.map((s) => STATUS_LABELS[s]),
          datasets: [{ data: present.map((s) => counts[s]), backgroundColor: present.map((s) => STATUS_COLORS[s]), borderWidth: 0, hoverOffset: 4 }],
        }}
        options={{
          ...base,
          cutout: '64%',
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 9, boxHeight: 9, font: { size: 10.5 }, color: '#3d4c5c', padding: 12 } } },
        }}
      />
    </div>
  );
}

/** Readings-per-day volume bars. */
export function VolumeBars({ labels, data, height = 200 }) {
  return (
    <div style={{ height }}>
      <Bar
        data={{
          labels,
          datasets: [{ label: 'Readings', data, backgroundColor: 'rgba(29,111,196,.45)', borderRadius: 3, maxBarThickness: 26 }],
        }}
        options={{
          ...base,
          plugins: { legend: { display: false } },
          scales: { x: { grid: { display: false }, ticks: { ...TICK, maxTicksLimit: 10 } }, y: { grid: GRID, ticks: TICK, beginAtZero: true } },
        }}
      />
    </div>
  );
}

/** Small multi-series line for min/avg/max fill. */
export function RangeChart({ labels, min, avg, max, height = 240 }) {
  return (
    <div style={{ height }}>
      <Line
        data={{
          labels,
          datasets: [
            { label: 'Max', data: max, borderColor: '#c02c2c', backgroundColor: 'transparent', borderWidth: 1, borderDash: [4, 3], pointRadius: 0, tension: 0.3 },
            { label: 'Avg', data: avg, borderColor: '#0e7c48', backgroundColor: 'rgba(14,124,72,.06)', borderWidth: 1.8, pointRadius: 2, fill: true, tension: 0.3 },
            { label: 'Min', data: min, borderColor: '#77808a', backgroundColor: 'transparent', borderWidth: 1, borderDash: [4, 3], pointRadius: 0, tension: 0.3 },
          ],
        }}
        options={{
          ...base,
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 14, font: { size: 10.5 }, color: '#3d4c5c' } } },
          scales: {
            x: { grid: { display: false }, ticks: { ...TICK, maxTicksLimit: 10 } },
            y: { min: 0, max: 100, grid: GRID, ticks: { ...TICK, stepSize: 25 } },
          },
        }}
      />
    </div>
  );
}
