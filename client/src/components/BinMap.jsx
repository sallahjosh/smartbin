import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';

/** Status metadata — single source of truth for the whole app. */
export const STATUS_LABELS = {
  empty: 'Empty',
  normal: 'Normal',
  almost_full: 'Almost Full',
  full: 'Full',
  maintenance: 'Maintenance',
  offline: 'Offline',
};

export const STATUS_COLORS = {
  empty: '#15803d',
  normal: '#1d6fc4',
  almost_full: '#b45309',
  full: '#c02c2c',
  maintenance: '#6d3fc0',
  offline: '#77808a',
};

const PIN_CLASS = {
  empty: 'bin-pin--empty',
  normal: 'bin-pin--normal',
  almost_full: 'bin-pin--almost_full',
  full: 'bin-pin--full',
  maintenance: 'bin-pin--maintenance',
  offline: 'bin-pin--offline',
};

function binIcon(bin, selected) {
  const colorClass = PIN_CLASS[bin.status] || 'bin-pin--offline';
  return L.divIcon({
    className: 'sb-bin-marker',
    html: `<div class="bin-pin ${colorClass} ${selected ? 'selected' : ''}"><i class="bi bi-trash"></i></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -26],
  });
}

/** Keeps the map view in sync with prop changes. */
function ViewUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom ?? map.getZoom());
  }, [center, zoom, map]);
  return null;
}

function fitBounds(bins) {
  const pts = bins.filter((b) => b.latitude != null && b.longitude != null)
    .map((b) => [Number(b.latitude), Number(b.longitude)]);
  return pts.length > 1 ? L.latLngBounds(pts) : null;
}

/** Fits the map to all markers once. */
function FitAll({ bins }) {
  const map = useMap();
  useEffect(() => {
    const b = fitBounds(bins);
    if (b) map.fitBounds(b.pad(0.25));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bins.length]);
  return null;
}

/**
 * Live bin map with status-coloured pins and popups.
 *
 * Props:
 *   bins        — bin objects with latitude/longitude
 *   center      — [lat, lng] fallback view
 *   zoom        — default 15
 *   selectedId  — highlighted bin
 *   onBinSelect — (bin) => void when a marker is clicked
 *   fitAll      — fit view to all pins on first load
 *   height      — css height (default 460px)
 */
export default function BinMap({
  bins = [],
  center,
  zoom = 15,
  selectedId = null,
  onBinSelect,
  fitAll = false,
  height = '460px',
}) {
  const positioned = bins.filter((b) => b.latitude != null && b.longitude != null);
  const effectiveCenter = center || (positioned[0] ? [Number(positioned[0].latitude), Number(positioned[0].longitude)] : [6.5244, 3.3792]);

  if (positioned.length === 0) {
    return (
      <div className="map-frame d-flex align-items-center justify-content-center" style={{ height }}>
        <div className="text-center muted">
          <i className="bi bi-geo-alt" style={{ fontSize: 24, display: 'block', marginBottom: 6 }} />
          No bins with GPS coordinates yet.
          <div className="mini">Add latitude/longitude when registering a bin, or let the device report GPS.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="map-frame">
      <MapContainer
        center={effectiveCenter}
        zoom={zoom}
        style={{ height, width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ViewUpdater center={effectiveCenter} zoom={zoom} />
        {fitAll && <FitAll bins={positioned} />}
        {positioned.map((bin) => (
          <Marker
            key={bin.id}
            position={[Number(bin.latitude), Number(bin.longitude)]}
            icon={binIcon(bin, bin.id === Number(selectedId))}
            eventHandlers={onBinSelect ? { click: () => onBinSelect(bin) } : undefined}
          >
            <Popup>
              <div style={{ minWidth: 175 }}>
                <strong>{bin.name}</strong>
                {bin.location ? <div className="muted" style={{ fontSize: '.78rem' }}>{bin.location}</div> : null}
                <div style={{ margin: '6px 0' }}>
                  <span className={`badge-sb badge-${bin.status}`}>{STATUS_LABELS[bin.status] || bin.status}</span>
                </div>
                <div style={{ fontSize: '.8rem' }}>
                  Fill: <strong>{bin.fill_level}%</strong>
                  {bin.battery_level != null ? <> · Battery: <strong>{bin.battery_level}%</strong></> : null}
                </div>
                {bin.last_seen_at ? (
                  <div className="muted" style={{ fontSize: '.72rem', marginTop: 3 }}>
                    Last update: {String(bin.last_seen_at).replace('T', ' ').slice(0, 16)}
                  </div>
                ) : null}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
