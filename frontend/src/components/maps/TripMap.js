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
  secondaryPaths = [], // New prop for comparison mode
  columns = ['latitude', 'longitude', 'operating_state'],
  visibleRange,
  showDataPoints = true,
  multiRoute = false
}) {
  const mapRef = useRef();
  const latCol = columns[0];
  const lonCol = columns[1];

  // Combine all paths for context and bounds
  const allPaths = useMemo(() => [primaryPath, ...secondaryPaths].filter(Boolean), [primaryPath, secondaryPaths]);

  // Get the full path for context (lighter color)
  const fullPaths = useMemo(() => {
    return allPaths.map(path => 
      path
        .map(r => [r?.[latCol], r?.[lonCol]])
        .filter(([lat, lon]) => 
          typeof lat === 'number' && 
          typeof lon === 'number' && 
          lat !== 0 && 
          lon !== 0
        )
    ).filter(p => p.length > 0);
  }, [allPaths, latCol, lonCol]);

  // Get the sliced paths that match the visible range
  const slicedPaths = useMemo(() => {
    const min = Math.max(0, visibleRange?.min ?? 0);
    const max = visibleRange?.max ?? 0;
    
    return allPaths.map(path => {
        const pMax = Math.min(path.length - 1, max);
        if (pMax < min) return [];
        return path.slice(min, pMax + 1);
    }).filter(p => p.length > 0);
  }, [allPaths, visibleRange]);

  // Calculate bounds based on all current visible paths
  const bounds = useMemo(() => {
    const pathsToUse = slicedPaths.length > 0 ? slicedPaths : allPaths;
    
    const allPoints = pathsToUse.flatMap(path => 
      path
        .map(r => [r?.[latCol], r?.[lonCol]])
        .filter(([lat, lon]) => 
          typeof lat === 'number' && 
          typeof lon === 'number' && 
          lat !== 0 && 
          lon !== 0
        )
    );
    
    if (!allPoints.length) return [[44.97, -93.26], [44.98, -93.27]];
    
    const lats = allPoints.map(p => p[0]);
    const lons = allPoints.map(p => p[1]);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    
    // Add slight padding to bounds
    const latPadding = Math.max((maxLat - minLat) * 0.1, 0.001);
    const lonPadding = Math.max((maxLon - minLon) * 0.1, 0.001);
    
    return [
      [minLat - latPadding, minLon - lonPadding],
      [maxLat + latPadding, maxLon + lonPadding]
    ];
  }, [slicedPaths, allPaths, latCol, lonCol]);

  // Create segments for the visible portions with operating state colors
  const visibleSegments = useMemo(() => {
    const allSegs = [];
    
    slicedPaths.forEach((path, pathIdx) => {
        let current = { color: STATE_COLORS.default, points: [] };
        
        path.forEach(row => {
          const stateColor = STATE_COLORS[row?.operating_state] || STATE_COLORS.default;
          const lat = row?.[latCol];
          const lon = row?.[lonCol];
          const valid = typeof lat === 'number' && typeof lon === 'number' && lat !== 0 && lon !== 0;
          
          if (!valid) return;
          
          if (stateColor !== current.color && current.points.length > 0) {
            allSegs.push(current);
            current = { color: stateColor, points: [current.points[current.points.length - 1]] };
          }
          
          current.color = stateColor;
          current.points.push([lat, lon]);
        });
        
        if (current.points.length > 1) allSegs.push(current);
    });
    
    return allSegs;
  }, [slicedPaths, latCol, lonCol]);

  // Create data point markers (sample them if too many)
  const dataPointMarkers = useMemo(() => {
    if (!showDataPoints || slicedPaths.length === 0) return [];
    
    const maxTotalMarkers = 100;
    const allMarkers = [];
    
    slicedPaths.forEach((path, pathIdx) => {
        const step = Math.max(1, Math.floor(path.length / (maxTotalMarkers / slicedPaths.length)));
        
        path.forEach((row, index) => {
            if (index % step !== 0) return;
            
            const lat = row?.[latCol];
            const lon = row?.[lonCol];
            
            if (typeof lat === 'number' && typeof lon === 'number' && lat !== 0 && lon !== 0) {
                allMarkers.push({
                    position: [lat, lon],
                    key: `marker-${pathIdx}-${index}`,
                    state: row?.operating_state
                });
            }
        });
    });
    
    return allMarkers;
  }, [slicedPaths, showDataPoints, latCol, lonCol]);

  const shouldUpdateBounds = slicedPaths.length > 0;

  return (
    <div className="w-full h-[60vh] rounded-lg overflow-hidden bg-gray-900 relative">
      <MapContainer 
        bounds={bounds} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        touchZoom={true}
        dragging={true}
      >
        <MapController bounds={bounds} shouldUpdateBounds={shouldUpdateBounds} />
        
        {/* Dark tile layer */}
        <TileLayer 
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
        />
        
        {/* Full paths context (lighter/dimmed) */}
        {fullPaths.map((path, idx) => (
          <Polyline 
            key={`full-${idx}`}
            positions={path} 
            color="#4B5563" 
            weight={idx === 0 ? 3 : 1} 
            opacity={0.3}
          />
        ))}
        
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
            radius={2}
            fillColor="#FFFFFF"
            color="#1F2937"
            weight={1}
            fillOpacity={0.8}
          />
        ))}
      </MapContainer>
      
      {/* Map overlay info */}
      <div className="absolute top-2 left-12 bg-gray-800 bg-opacity-90 text-white text-xs px-2 py-1 rounded z-[1000]">
        {slicedPaths.length > 0 ? (
          <>Viewing: {slicedPaths.reduce((acc, p) => acc + p.length, 0)} data points across {slicedPaths.length} trips</>
        ) : (
          <>Full trips: {allPaths.reduce((acc, p) => acc + p.length, 0)} points</>
        )}
      </div>
    </div>
  );
}