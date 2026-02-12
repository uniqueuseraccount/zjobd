// --- VERSION 0.9.1 ---
// - Displays TripMap as background with overlaid chart synced to visibleRange.
// - Click left/right halves to pan window.
// - Anchors y-scale to most variable PID in current window.

import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Polyline } from 'react-leaflet';
import { getAverageHeading } from '../../utils/mapUtils';
import { sampleData } from '../../utils/samplingUtils';

const CHART_COLORS = ['#FF4D4D', '#00E676', '#38BDF8', '#F59E0B', '#A78BFA'];

function offsetPoint([lat, lon], headingDeg, magnitude) {
  const headingRad = (headingDeg * Math.PI) / 180;
  const dx = Math.cos(headingRad + Math.PI / 2) * magnitude;
  const dy = Math.sin(headingRad + Math.PI / 2) * magnitude;
  const latOffset = dy / 111111; // meters to degrees
  const lonOffset = dx / (111111 * Math.cos((lat * Math.PI) / 180));
  return [lat + latOffset, lon + lonOffset];
}

export default function CombinedChartMap({
  log,
  selectedPIDs = [],
  chartColors = CHART_COLORS,
  visibleRange = { min: 0, max: 0 },
  mapColumns = ['latitude', 'longitude', 'operating_state']
}) {
  const dataRef = log?.data || [];
  const latCol = mapColumns[0];
  const lonCol = mapColumns[1];

  const windowData = useMemo(() => {
    const min = Math.max(0, visibleRange?.min ?? 0);
    const max = Math.min(dataRef.length - 1, visibleRange?.max ?? 0);
    return dataRef.slice(min, max + 1);
  }, [dataRef, visibleRange]);

  const baseTrack = useMemo(() => {
    return windowData
      .map((row) => {
        const lat = row?.[latCol];
        const lon = row?.[lonCol];
        return typeof lat === 'number' && typeof lon === 'number' ? [lat, lon] : null;
      })
      .filter(Boolean);
  }, [windowData, latCol, lonCol]);

  const heading = useMemo(() => getAverageHeading(windowData, latCol, lonCol), [windowData, latCol, lonCol]);

  const pidCurves = useMemo(() => {
    const curves = [];

    selectedPIDs.forEach((pid, idx) => {
      if (!pid || pid === 'none') return;

      const values = windowData.map((row) => row?.[pid]);
      const sampled = sampleData(values, baseTrack.length);
      const maxVal = Math.max(...sampled.filter((v) => typeof v === 'number'));
      const scale = 10 / (maxVal || 1); // scale to ~10 meters

      const curve = baseTrack.map((pt, i) => {
        const offset = typeof sampled[i] === 'number' ? sampled[i] * scale : 0;
        return offsetPoint(pt, heading, offset);
      });

      curves.push({ color: chartColors[idx] || '#38BDF8', points: curve });
    });

    return curves;
  }, [selectedPIDs, baseTrack, windowData, heading, chartColors]);

  const bounds = useMemo(() => {
    if (!baseTrack.length) return [[44.97, -93.26], [44.98, -93.27]];
    const lats = baseTrack.map((p) => p[0]);
    const lons = baseTrack.map((p) => p[1]);
    return [[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]];
  }, [baseTrack]);

  return (
    <div className="w-full h-[60vh] rounded-lg overflow-hidden bg-gray-900">
      <MapContainer bounds={bounds} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png" />
        <Polyline positions={baseTrack} color="#6B7280" weight={3} />
        {pidCurves.map((curve, idx) => (
          <Polyline key={idx} positions={curve.points} color={curve.color} weight={4} />
        ))}
      </MapContainer>
    </div>
  );
}
