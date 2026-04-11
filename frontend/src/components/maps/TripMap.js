// --- VERSION 1.1.0 ---
// - Synchronized with Global TimeContext and PlaybackContext
// - Shows "Current Position" marker during log playback
// - Improved bounds handling for real-time tracking

import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useGlobalTime } from '../../context/TimeContext';
import { usePlayback } from '../../context/PlaybackContext';

// Helper to auto-fit map to bounds
function MapBoundsController({ points, currentPoint }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map(p => [p.latitude, p.longitude]));
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [points, map]);

  useEffect(() => {
    if (currentPoint && currentPoint.latitude && currentPoint.longitude) {
      // Optional: follow the vehicle if playing
      // map.panTo([currentPoint.latitude, currentPoint.longitude]);
    }
  }, [currentPoint, map]);

  return null;
}

export default function TripMap({ 
  primaryPath = [], 
  secondaryPaths = [], 
  showDataPoints = true 
}) {
  const { visibleRange } = useGlobalTime();
  const { currentFrame, isPlaying } = usePlayback();

  const slicedPrimary = useMemo(() => {
    if (primaryPath.length === 0) return [];
    return primaryPath.slice(visibleRange.min, visibleRange.max + 1);
  }, [primaryPath, visibleRange]);

  const playbackPoint = useMemo(() => {
    if (!isPlaying) return null;
    return primaryPath[currentFrame];
  }, [primaryPath, currentFrame, isPlaying]);

  const validPrimaryCoords = useMemo(() => 
    slicedPrimary.filter(p => p.latitude && p.longitude).map(p => [p.latitude, p.longitude]),
  [slicedPrimary]);

  if (primaryPath.length === 0) return (
    <div className="h-full w-full bg-gray-900 flex items-center justify-center text-gray-500 italic">
      No GPS data available
    </div>
  );

  return (
    <div className="h-full w-full relative rounded-lg overflow-hidden">
      <MapContainer 
        center={[44.97, -93.26]} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
        />
        
        <MapBoundsController points={slicedPrimary} currentPoint={playbackPoint} />

        {/* Primary Path */}
        <Polyline 
          positions={validPrimaryCoords}
          pathOptions={{ color: '#22d3ee', weight: 4, opacity: 0.8 }}
        />

        {/* Secondary Paths (e.g. for comparison) */}
        {secondaryPaths.map((path, idx) => {
          const coords = path.slice(visibleRange.min, visibleRange.max + 1)
            .filter(p => p.latitude && p.longitude)
            .map(p => [p.latitude, p.longitude]);
          return (
            <Polyline 
              key={idx}
              positions={coords}
              pathOptions={{ color: '#94a3b8', weight: 2, opacity: 0.4, dashArray: '5, 10' }}
            />
          );
        })}

        {/* Playback "Now" Marker */}
        {playbackPoint && playbackPoint.latitude && (
          <CircleMarker
            center={[playbackPoint.latitude, playbackPoint.longitude]}
            radius={8}
            pathOptions={{ 
              color: '#fff', 
              fillColor: '#22d3ee', 
              fillOpacity: 1, 
              weight: 3,
              className: 'animate-pulse' 
            }}
          />
        )}

        {/* Start/End Markers */}
        {validPrimaryCoords.length > 0 && (
          <>
            <CircleMarker 
              center={validPrimaryCoords[0]} 
              radius={5} 
              pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 1 }} 
            />
            <CircleMarker 
              center={validPrimaryCoords[validPrimaryCoords.length - 1]} 
              radius={5} 
              pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 1 }} 
            />
          </>
        )}
      </MapContainer>
    </div>
  );
}
