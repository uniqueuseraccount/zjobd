// --- VERSION 1.0.0 ---
// - 2.5D Elevation/PID Visualization Map
// - Uses color gradients to represent a primary PID (e.g. Altitude, Speed)
// - Uses line weight to represent a secondary PID (e.g. Load)

import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import tinycolor from 'tinycolor2';

export default function ElevationMap({ 
    data = [], 
    visibleRange = { min: 0, max: 0 },
    colorPid = 'altitude',
    weightPid = 'calculated_load_value',
    minColor = '#3b82f6', // Blue
    maxColor = '#ef4444'  // Red
}) {
    const slicedData = useMemo(() => {
        if (!data || data.length === 0) return [];
        return data.slice(visibleRange.min, visibleRange.max + 1);
    }, [data, visibleRange]);

    const segments = useMemo(() => {
        if (slicedData.length < 2) return [];

        // Find min/max for normalization
        const colorValues = slicedData.map(d => d[colorPid]).filter(v => typeof v === 'number');
        const weightValues = slicedData.map(d => d[weightPid]).filter(v => typeof v === 'number');
        
        const minC = colorValues.length > 0 ? Math.min(...colorValues) : 0;
        const maxC = colorValues.length > 0 ? Math.max(...colorValues) : 1;
        const minW = weightValues.length > 0 ? Math.min(...weightValues) : 0;
        const maxW = weightValues.length > 0 ? Math.max(...weightValues) : 1;

        const results = [];
        for (let i = 0; i < slicedData.length - 1; i++) {
            const p1 = slicedData[i];
            const p2 = slicedData[i+1];
            
            if (p1.latitude && p1.longitude && p2.latitude && p2.longitude) {
                const valC = (p1[colorPid] || 0);
                const ratioC = maxC === minC ? 0 : (valC - minC) / (maxC - minC);
                const color = tinycolor.mix(minColor, maxColor, ratioC * 100).toHexString();
                
                const valW = (p1[weightPid] || 0);
                const ratioW = maxW === minW ? 0 : (valW - minW) / (maxW - minW);
                const weight = 3 + (ratioW * 8); // Scale weight from 3 to 11

                results.append({
                    positions: [[p1.latitude, p1.longitude], [p2.latitude, p2.longitude]],
                    color,
                    weight,
                    valC,
                    valW
                });
            }
        }
        return results;
    }, [slicedData, colorPid, weightPid, minColor, maxColor]);

    // Center map on data
    const center = useMemo(() => {
        if (slicedData.length === 0) return [44.97, -93.26];
        const mid = slicedData[Math.floor(slicedData.length / 2)];
        return [mid.latitude, mid.longitude];
    }, [slicedData]);

    if (slicedData.length === 0) return <div className="h-full flex items-center justify-center text-gray-500 bg-gray-900">No GPS data in range</div>;

    return (
        <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png" attribution='&copy; CartoDB' />
            {segments.map((seg, idx) => (
                <Polyline 
                    key={idx}
                    positions={seg.positions}
                    pathOptions={{ color: seg.color, weight: seg.weight, opacity: 0.8 }}
                >
                    <Popup>
                        <div className="text-xs">
                            <div><span className="font-bold uppercase">{colorPid}:</span> {seg.valC.toFixed(2)}</div>
                            <div><span className="font-bold uppercase">{weightPid}:</span> {seg.valW.toFixed(2)}</div>
                        </div>
                    </Popup>
                </Polyline>
            ))}
        </MapContainer>
    );
}
