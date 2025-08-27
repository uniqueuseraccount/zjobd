// In frontend/src/TripMap.js

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { generateRainbowColors } from './colorUtils';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const MapUpdater = ({ bounds }) => {
    const map = useMap();
    useEffect(() => {
        if (bounds && bounds.isValid()) {
            // Use flyToBounds for a smoother transition
            map.flyToBounds(bounds, { padding: [50, 50], duration: 0.5 });
        }
    }, [bounds, map]);
    return null;
};

const TripMap = ({ groupData, timeRange }) => {
    const { logs, all_data, all_columns } = groupData;
    if (!logs || logs.length === 0) return <div>No logs to display on map.</div>;
    
    const brightColors = generateRainbowColors(logs.length);
    let allVisiblePoints = [];
    const allPolylines = [];

    logs.forEach((log, index) => {
        const logId = log.log_id;
        const data = all_data[logId] || [];
        const columns = all_columns[logId] || [];
        
        if (data.length < 1) return;

        const latCol = columns.find(c => c.toLowerCase().includes('latitude'));
        const lonCol = columns.find(c => c.toLowerCase().includes('longitude'));
        if (!latCol || !lonCol) return;

        const startTime = data[0].timestamp;
        const fullPath = data
            .filter(d => d[latCol] != null && d[lonCol] != null && d[latCol] !== 0 && d[lonCol] !== 0)
            .map(d => ({ lat: d[latCol], lng: d[lonCol], elapsed: (d.timestamp - startTime) / 1000 }));
        
        if (fullPath.length === 0) return;

        // --- NEW: Split the path into visible and non-visible segments ---
        const visiblePath = fullPath
            .filter(p => p.elapsed >= timeRange.min && p.elapsed <= timeRange.max)
            .map(p => [p.lat, p.lng]);
        
        const darkColor = `hsl(${(index * (360 / logs.length)) % 360}, 85%, 20%)`; // Darker version

        // Add the dark, full path first so it's underneath
        allPolylines.push(
             <Polyline key={`${logId}-full`} positions={fullPath.map(p => [p.lat, p.lng])} pathOptions={{ color: darkColor, weight: 3, opacity: 0.5 }} />
        );

        // Add the bright, visible path on top
        if (visiblePath.length > 0) {
            allVisiblePoints = [...allVisiblePoints, ...visiblePath];
            allPolylines.push(
                <Polyline key={`${logId}-visible`} positions={visiblePath} pathOptions={{ color: brightColors[index], weight: 6, opacity: 1 }} />
            );
        }
    });

    if (allPolylines.length === 0) {
        return <div style={{ height: '400px', textAlign: 'center', padding: '20px', backgroundColor: '#f0f0f0' }}>No GPS data available.</div>;
    }

    // The bounds should be based on the visible points for zooming
    const bounds = allVisiblePoints.length > 1 ? L.latLngBounds(allVisiblePoints) : null;

    return (
        <MapContainer center={[45.0, -93.0]} zoom={8} style={{ height: '400px', width: '100%' }}>
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {allPolylines}
            <MapUpdater bounds={bounds} />
        </MapContainer>
    );
};

export default TripMap;