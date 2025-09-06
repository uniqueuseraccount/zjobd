// --- VERSION 0.9.3 ---
// - Renders Leaflet map with colored segments by operating state.
// - Supports multiRoute mode and visibleRange slicing.

import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const STATE_COLORS = {
  "Closed Loop (Idle)": "#34D399",
  "Closed Loop (City)": "#60A5FA",
  "Closed Loop (Highway)": "#38BDF8",
  "Open Loop (WOT Accel)": "#F87171",
  "Open Loop (Decel Fuel Cut)": "#FBBF24",
  "Open Loop (Cold Start)": "#A78BFA",
  "default": "#38BDF8"
};

function MapController({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length === 2 && bounds[0][0] !== Infinity) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
}

export default function TripMap({
  primaryPath,
  columns = ['latitude', 'longitude', 'operating_state'],
  visibleRange
}) {
  const latCol = columns[0];
  const lonCol = columns[1];

  const slicedPath = useMemo(() => {
    if (!Array.isArray(primaryPath)) return [];
    const min = Math.max(0, visibleRange?.min ?? 0);
    const max = Math.min(primaryPath.length - 1, visibleRange?.max ?? 0);
    return primaryPath.slice(min, max + 1);
  }, [primaryPath, visibleRange]);

  const bounds = useMemo(() => {
    const points = slicedPath
      .map(r => [r?.[latCol], r?.[lonCol]])
      .filter(([lat, lon]) => typeof lat === 'number' && typeof lon === 'number' && lat !== 0 && lon !== 0);
    if (!points.length) return [[44.97, -93.26], [44.98, -93.27]];
    const lats = points.map(p => p[0]);
    const lons = points.map(p => p[1]);
    return [[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]];
  }, [slicedPath, latCol, lonCol]);

  const segments = useMemo(() => {
    const segs = [];
    let current = { color: STATE_COLORS.default, points: [] };
    slicedPath.forEach(row => {
      const stateColor = STATE_COLORS[row?.operating_state] || STATE_COLORS.default;
      const lat = row?.[latCol];
      const lon = row?.[lonCol];
      const valid = typeof lat === 'number' && typeof lon === 'number' && lat !== 0 && lon !== 0;
      if (!valid) return;
      if (stateColor !== current.color && current.points.length > 0) {
        segs.push(current);
        current = { color: stateColor, points: [current.points[current.points.length - 1]] };
      }
      current.color = stateColor;
      current.points.push([lat, lon]);
    });
    if (current.points.length > 1) segs.push(current);
    return segs;
  }, [slicedPath, latCol, lonCol]);

  return (
    <div style={{ height: '60vh', width: '100%' }}>
      <MapContainer
        bounds={bounds}
        style={{ height: '100%', width: '100%', backgroundColor: '#1F2937', borderRadius: '0.5rem' }}
      >
        <MapController bounds={bounds} />
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        {segments.map((seg, idx) => (
          <Polyline key={idx} positions={seg.points} color={seg.color} weight={5} />
        ))}
      </MapContainer>
    </div>
  );
}
