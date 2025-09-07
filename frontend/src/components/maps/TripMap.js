// --- VERSION 1.0.0 ---
// - Enhanced TripMap with zoom synchronization to chart
// - Shows data point markers that correspond to chart view
// - Automatically updates bounds based on visible range

import React, { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from 'react-leaflet';
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

function MapController({ bounds, shouldUpdateBounds }) {
  const map = useMap();
  
  useEffect(() => {
    if (bounds && bounds.length === 2 && bounds[0][0] !== Infinity && shouldUpdateBounds) {
      // Add padding and smooth transition
      map.fitBounds(bounds, { 
        padding: [20, 20],
        animate: true,
        duration: 0.5
      });
    }
  }, [bounds, map, shouldUpdateBounds]);
  
  return null;
}

export default function TripMap({
  primaryPath,
  columns = ['latitude', 'longitude', 'operating_state'],
  visibleRange,
  showDataPoints = true,
  multiRoute = false
}) {
  const mapRef = useRef();
  const latCol = columns[0];
  const lonCol = columns[1];

  // Get the full path for context (lighter color)
  const fullPath = useMemo(() => {
    if (!Array.isArray(primaryPath)) return [];
    
    return primaryPath
      .map(r => [r?.[latCol], r?.[lonCol]])
      .filter(([lat, lon]) => 
        typeof lat === 'number' && 
        typeof lon === 'number' && 
        lat !== 0 && 
        lon !== 0
      );
  }, [primaryPath, latCol, lonCol]);

  // Get the sliced path that matches the visible range
  const slicedPath = useMemo(() => {
    if (!Array.isArray(primaryPath)) return [];
    const min = Math.max(0, visibleRange?.min ?? 0);
    const max = Math.min(primaryPath.length - 1, visibleRange?.max ?? 0);
    return primaryPath.slice(min, max + 1);
  }, [primaryPath, visibleRange]);

  // Calculate bounds based on the current visible range
  const bounds = useMemo(() => {
    const pathToUse = slicedPath.length > 0 ? slicedPath : primaryPath || [];
    
    const points = pathToUse
      .map(r => [r?.[latCol], r?.[lonCol]])
      .filter(([lat, lon]) => 
        typeof lat === 'number' && 
        typeof lon === 'number' && 
        lat !== 0 && 
        lon !== 0
      );
    
    if (!points.length) return [[44.97, -93.26], [44.98, -93.27]];
    
    const lats = points.map(p => p[0]);
    const lons = points.map(p => p[1]);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    
    // Add slight padding to bounds
    const latPadding = (maxLat - minLat) * 0.1;
    const lonPadding = (maxLon - minLon) * 0.1;
    
    return [
      [minLat - latPadding, minLon - lonPadding],
      [maxLat + latPadding, maxLon + lonPadding]
    ];
  }, [slicedPath, primaryPath, latCol, lonCol]);

  // Create segments for the visible portion with operating state colors
  const visibleSegments = useMemo(() => {
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

  // Create data point markers (sample them if too many)
  const dataPointMarkers = useMemo(() => {
    if (!showDataPoints || slicedPath.length === 0) return [];
    
    const maxMarkers = 50; // Limit markers for performance
    const step = Math.max(1, Math.floor(slicedPath.length / maxMarkers));
    
    return slicedPath
      .filter((_, index) => index % step === 0)
      .map((row, index) => {
        const lat = row?.[latCol];
        const lon = row?.[lonCol];
        
        if (typeof lat !== 'number' || typeof lon !== 'number' || lat === 0 || lon === 0) {
          return null;
        }
        
        return {
          position: [lat, lon],
          key: `marker-${index}`,
          state: row?.operating_state
        };
      })
      .filter(Boolean);
  }, [slicedPath, showDataPoints, latCol, lonCol]);

  const shouldUpdateBounds = slicedPath.length > 0;

  return (
    <div className="w-full h-[60vh] rounded-lg overflow-hidden bg-gray-900 relative">
      <MapContainer 
        bounds={bounds} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        dragging={false}
        boxZoom={false}
        keyboard={false}
      >
        <MapController bounds={bounds} shouldUpdateBounds={shouldUpdateBounds} />
        
        {/* Dark tile layer */}
        <TileLayer 
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
        />
        
        {/* Full path context (lighter/dimmed) */}
        {fullPath.length > 1 && (
          <Polyline 
            positions={fullPath} 
            color="#4B5563" 
            weight={2} 
            opacity={0.5}
          />
        )}
        
        {/* Highlighted visible segments */}
        {visibleSegments.map((seg, idx) => (
          <Polyline 
            key={`segment-${idx}`} 
            positions={seg.points} 
            color={seg.color} 
            weight={4}
            opacity={0.9}
          />
        ))}
        
        {/* Data point markers */}
        {dataPointMarkers.map((marker) => (
          <CircleMarker
            key={marker.key}
            center={marker.position}
            radius={3}
            fillColor="#FFFFFF"
            color="#1F2937"
            weight={1}
            fillOpacity={0.8}
          />
        ))}
      </MapContainer>
      
      {/* Map overlay info */}
      <div className="absolute top-2 left-2 bg-gray-800 bg-opacity-90 text-white text-xs px-2 py-1 rounded">
        {slicedPath.length > 0 ? (
          <>Viewing: {slicedPath.length} data points</>
        ) : (
          <>Full trip: {primaryPath?.length || 0} points</>
        )}
      </div>
    </div>
  );
}