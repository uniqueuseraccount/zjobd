// --- VERSION 0.3.1.9.8 -ALPHA ---
// - Ensured default export of TripMap component.
// - Guards for columns/paths and stable bounds.
// - Fills parent container; supports multiRoute overlay.
//
// https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png
// https://tile.openstreetmap.bzh/ca/{z}/{x}/{y}.png

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, useMap, useMapEvents } from 'react-leaflet';
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

const COMPARISON_COLOR = "#22D3EE";
const CHART_COLORS = ['#38BDF8','#F59E0B','#4ADE80','#F472B6','#A78BFA','#2DD4BF','#FB7185','#FACC15','#818CF8','#FDE047'];

function MapController({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length === 2 && bounds[0][0] !== Infinity) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
}

function MapSync() {
  useMapEvents({ moveend: () => {}, zoomend: () => {} });
  return null;
}

export default function TripMap({
  primaryPath,
  comparisonPath,
  columns = ['latitude', 'longitude', 'operating_state'],
  visibleRange,
  multiRoute = false,
  onBoundsRangeChange = () => {}
}) {
  const latCol = Array.isArray(columns) ? columns.find(c => c.includes('lat')) || 'latitude' : 'latitude';
  const lonCol = Array.isArray(columns) ? columns.find(c => c.includes('lon')) || 'longitude' : 'longitude';

  const getPathSegments = (path) => {
    if (!Array.isArray(path)) return [];
    const segments = [];
    let current = { color: STATE_COLORS.default, points: [] };
    path.forEach(row => {
      const stateColor = STATE_COLORS[row?.operating_state] || STATE_COLORS.default;
      const lat = row?.[latCol]; const lon = row?.[lonCol];
      const valid = typeof lat === 'number' && typeof lon === 'number' && lat !== 0 && lon !== 0;
      if (!valid) return;
      if (stateColor !== current.color && current.points.length > 0) {
        segments.push(current);
        current = { color: stateColor, points: [current.points[current.points.length - 1]] };
      }
      current.color = stateColor;
      current.points.push([lat, lon]);
    });
    if (current.points.length > 1) segments.push(current);
    return segments;
  };

  const getBounds = () => {
    if (multiRoute && Array.isArray(primaryPath)) {
      const allPoints = primaryPath.flat().filter(p => p && typeof p[latCol] === 'number' && typeof p[lonCol] === 'number' && p[latCol] !== 0 && p[lonCol] !== 0);
      if (!allPoints.length) return [[44.97, -93.26], [44.98, -93.27]];
      const lats = allPoints.map(p => p[latCol]); const lons = allPoints.map(p => p[lonCol]);
      return [[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]];
    }
    const arr = Array.isArray(primaryPath) ? primaryPath : [];
    const min = Math.max(0, visibleRange?.min ?? 0);
    const max = Math.min((arr.length - 1), visibleRange?.max ?? 0);
    const slice = arr.slice(min, max + 1);
    const points = slice.map(r => [r?.[latCol], r?.[lonCol]]).filter(([lat, lon]) => typeof lat === 'number' && typeof lon === 'number' && lat !== 0 && lon !== 0);
    if (!points.length) return [[44.97, -93.26], [44.98, -93.27]];
    const lats = points.map(p => p[0]); const lons = points.map(p => p[1]);
    return [[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]];
  };

  const bounds = getBounds();
  const primarySegments = (multiRoute || !Array.isArray(primaryPath)) ? [] : getPathSegments(primaryPath);
  const comparisonSegments = Array.isArray(comparisonPath) ? getPathSegments(comparisonPath) : [];

  return (
    <MapContainer bounds={bounds} style={{ height: '100%', width: '100%', backgroundColor: '#1F2937', borderRadius: '0.5rem' }}>
      <MapController bounds={bounds} />
      <MapSync />
      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors &copy; CARTO" />
      {multiRoute ? (
        (Array.isArray(primaryPath) ? primaryPath : []).map((path, idx) => (
          <Polyline key={`multi-${idx}`} positions={path.map(p => [p?.[latCol], p?.[lonCol]])} color={CHART_COLORS[idx % CHART_COLORS.length]} />
        ))
      ) : (
        <>
          {comparisonSegments.map((seg, idx) => (
            <Polyline key={`comp-${idx}`} positions={seg.points} color={COMPARISON_COLOR} weight={5} opacity={0.6} dashArray="5, 10" />
          ))}
          {primarySegments.map((seg, idx) => (
            <Polyline key={`prim-${idx}`} positions={seg.points} color={seg.color} weight={5} />
          ))}
        </>
      )}
    </MapContainer>
  );
}
