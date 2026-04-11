// --- VERSION 1.1.0 ---
// - Added sidebar for log selection and fit-based filtering
// - Integrated FitScoringService results for "Best Fits" visualization
// - Added density vs. match-quality view toggling

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';

function MapController({ bounds }) {
    const map = useMap();
    useEffect(() => {
        if (bounds) map.fitBounds(bounds, { padding: [50, 50] });
    }, [bounds, map]);
    return null;
}

export default function MapHeatmap() {
    const [allSegments, setAllSegments] = useState([]);
    const [allLogs, setAllLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [targetLogId, setTargetLogId] = useState(null);
    const [comparableMatches, setComparableMatches] = useState([]);
    const [viewMode, setViewMode] = useState('density'); // 'density' or 'fits'

    // Fetch initial data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [heatmapRes, logsRes] = await Promise.all([
                    axios.get('/api/map/heatmap'),
                    axios.get('/api/logs')
                ]);
                setAllSegments(heatmapRes.data);
                setAllLogs(logsRes.data);
            } catch (err) {
                console.error("Error loading heatmap data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Handle log selection for Fit Scoring
    const handleSelectTarget = useCallback(async (logId) => {
        setTargetLogId(logId);
        setViewMode('fits');
        try {
            const res = await axios.get(`/api/logs/${logId}/comparable`);
            setComparableMatches(res.data);
        } catch (err) {
            console.error("Error fetching comparable matches:", err);
        }
    }, []);

    // Calculate GeoJSON features based on mode
    const geoJsonData = useMemo(() => {
        if (allSegments.length === 0) return null;

        let features = [];
        if (viewMode === 'density') {
            features = allSegments.map(seg => ({
                type: "Feature",
                properties: { name: seg.name, type: 'density' },
                geometry: seg.geometry
            }));
        } else {
            // Match quality view: Filter segments to target log + comparable logs
            const matchIds = comparableMatches.map(m => m.log_id);
            const scores = Object.fromEntries(comparableMatches.map(m => [m.log_id, m.score]));
            
            features = allSegments
                .filter(seg => seg.log_id === targetLogId || matchIds.includes(seg.log_id))
                .map(seg => {
                    const score = seg.log_id === targetLogId ? 100 : (scores[seg.log_id] || 0);
                    return {
                        type: "Feature",
                        properties: { 
                            name: seg.name, 
                            type: 'fit', 
                            score,
                            isTarget: seg.log_id === targetLogId
                        },
                        geometry: seg.geometry
                    };
                });
        }

        return { type: "FeatureCollection", features };
    }, [allSegments, viewMode, targetLogId, comparableMatches]);

    const getStyle = (feature) => {
        if (feature.properties.type === 'density') {
            return { color: "#ff4d4d", weight: 2, opacity: 0.15 };
        }
        
        // Fit mode styling: Target log is bold cyan, matches are gradient
        if (feature.properties.isTarget) {
            return { color: "#22d3ee", weight: 5, opacity: 0.9 };
        }
        
        const score = feature.properties.score || 0;
        const opacity = Math.max(0.1, score / 100);
        return { 
            color: score > 80 ? "#34d399" : score > 50 ? "#facc15" : "#94a3b8",
            weight: 3, 
            opacity 
        };
    };

    if (loading) return <div className="p-8 text-center text-gray-400">Loading Map Intelligence...</div>;

    return (
        <div className="flex h-[calc(100vh-120px)] gap-4">
            {/* Sidebar */}
            <div className="w-80 bg-gray-800 rounded-lg border border-gray-700 p-4 flex flex-col space-y-4 overflow-hidden">
                <div className="flex flex-col space-y-2">
                    <h3 className="text-lg font-bold text-white">Heatmap Tools</h3>
                    <div className="flex p-1 bg-gray-900 rounded-md">
                        <button 
                            onClick={() => setViewMode('density')}
                            className={`flex-1 py-1 text-xs rounded transition-colors ${viewMode === 'density' ? 'bg-gray-700 text-cyan-400 shadow' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            Global Density
                        </button>
                        <button 
                            onClick={() => setViewMode('fits')}
                            disabled={!targetLogId}
                            className={`flex-1 py-1 text-xs rounded transition-colors ${viewMode === 'fits' ? 'bg-gray-700 text-cyan-400 shadow' : 'text-gray-500 hover:text-gray-300 disabled:opacity-30'}`}
                        >
                            Best Fits
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                    <h4 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">Select Reference Log</h4>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {allLogs.map(log => (
                            <div 
                                key={log.log_id}
                                onClick={() => handleSelectTarget(log.log_id)}
                                className={`p-3 rounded border cursor-pointer transition-all ${targetLogId === log.log_id ? 'bg-cyan-900/30 border-cyan-500 shadow-lg shadow-cyan-500/10' : 'bg-gray-900/50 border-gray-700 hover:border-gray-500'}`}
                            >
                                <div className="text-sm font-mono text-cyan-100 truncate">{log.file_name}</div>
                                <div className="text-xs text-gray-500 mt-1">{new Date(log.start_time).toLocaleDateString()}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {viewMode === 'fits' && targetLogId && (
                    <div className="pt-4 border-t border-gray-700">
                        <h4 className="text-sm font-semibold text-green-400 mb-2">Top Matches</h4>
                        <div className="space-y-2">
                            {comparableMatches.slice(0, 3).map(match => (
                                <div key={match.log_id} className="text-xs flex justify-between items-center bg-gray-900/30 p-2 rounded">
                                    <span className="text-gray-300 truncate w-40">Log {match.log_id}</span>
                                    <span className="font-bold text-cyan-400">{match.score}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Map Container */}
            <div className="flex-1 bg-gray-900 rounded-lg overflow-hidden border border-gray-700 relative">
                <MapContainer 
                    center={[44.9778, -93.2650]} 
                    zoom={11} 
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        attribution='&copy; CartoDB'
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
                    />
                    
                    {geoJsonData && (
                        <GeoJSON 
                            key={`${viewMode}-${targetLogId}`}
                            data={geoJsonData} 
                            style={getStyle} 
                            onEachFeature={(feature, layer) => {
                                if (feature.properties?.name) {
                                    const popupContent = `
                                        <div class="text-gray-900 p-1">
                                            <div class="font-bold border-b border-gray-200 mb-1">${feature.properties.name}</div>
                                            ${feature.properties.type === 'fit' ? `<div class="text-cyan-600 font-bold">Fit Score: ${feature.properties.score}%</div>` : ''}
                                        </div>
                                    `;
                                    layer.bindPopup(popupContent);
                                }
                            }}
                        />
                    )}
                </MapContainer>
                
                {/* Floating Map Legend */}
                <div className="absolute bottom-4 right-4 bg-gray-800/90 border border-gray-700 rounded p-3 z-[1000] text-xs space-y-2 shadow-2xl">
                    <div className="font-bold text-gray-300 mb-1">Visualization</div>
                    {viewMode === 'density' ? (
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-1 bg-red-500 opacity-50"></div>
                            <span className="text-gray-400">Track Density</span>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-1 bg-cyan-400"></div>
                                <span className="text-gray-400">Target Segment</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-1 bg-green-400"></div>
                                <span className="text-gray-400">High Match (>80%)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-1 bg-yellow-400"></div>
                                <span className="text-gray-400">Moderate Match</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
