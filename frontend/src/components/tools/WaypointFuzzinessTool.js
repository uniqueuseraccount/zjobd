
import React, { useState, useRef } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Helper component to capture map bounds
function MapEvents({ setBounds }) {
    const map = useMapEvents({
        moveend: () => {
            setBounds(map.getBounds());
        },
        zoomend: () => {
            setBounds(map.getBounds());
        },
    });
    return null;
}

export default function WaypointFuzzinessTool() {
    const [fuzziness, setFuzziness] = useState(100); // Default 100 meters
    const [minClusterSize, setMinClusterSize] = useState(2); // Default to hiding singletons
    const [limitToView, setLimitToView] = useState(true); // Default to optimized view
    const [mapBounds, setMapBounds] = useState(null);
    const [clusters, setClusters] = useState([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState(null);
    const [applyStatus, setApplyStatus] = useState(null);

    const handlePreview = async () => {
        setLoading(true);
        setApplyStatus(null);
        try {
            const payload = { fuzziness };
            
            if (limitToView && mapBounds) {
                payload.bounds = {
                    minLat: mapBounds.getSouth(),
                    maxLat: mapBounds.getNorth(),
                    minLon: mapBounds.getWest(),
                    maxLon: mapBounds.getEast()
                };
            }

            const response = await axios.post('/api/tools/waypoints/preview', payload);
            setClusters(response.data.clusters || []);
            setStats({
                count: response.data.count,
                fuzziness: response.data.fuzziness
            });
        } catch (error) {
            console.error("Error fetching waypoint preview:", error);
        }
        setLoading(false);
    };

    const handleApply = async () => {
        if (!window.confirm("This will overwrite existing waypoints and update all tracks. Are you sure?")) return;
        
        setLoading(true);
        setApplyStatus(null);
        try {
            const response = await axios.post('/api/tools/waypoints/apply', { 
                fuzziness,
                min_cluster_size: minClusterSize 
            });
            setApplyStatus({ type: 'success', message: response.data.message });
        } catch (error) {
            console.error("Error applying waypoints:", error);
            setApplyStatus({ type: 'error', message: "Failed to apply changes." });
        }
        setLoading(false);
    };

    // Filter clusters based on minimum size
    const visibleClusters = clusters.filter(c => c.points.length >= minClusterSize);

    // Calculate map center based on first visible cluster or default (only if no bounds set yet)
    // If we have bounds, we rely on the map keeping its position (which MapContainer does by default unless 'center' changes)
    const defaultCenter = [39.8283, -98.5795]; 

    return (
        <div className="bg-gray-800 rounded-lg shadow-xl p-6 space-y-6 mt-6">
            <div>
                <h3 className="text-xl font-semibold">Waypoint Clustering Sensitivity</h3>
                <p className="text-gray-400 mt-1 mb-4">
                    Adjust parameters to group start/end locations. 
                    <b> Fuzziness</b> determines how close points must be to group together.
                    <b> Minimum Size</b> filters out random stops (noise) that don't happen often.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    {/* Fuzziness Slider */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Fuzziness (Distance)</label>
                        <div className="flex items-center space-x-4">
                            <input 
                                type="range" 
                                min="10" 
                                max="1000" 
                                step="10" 
                                value={fuzziness} 
                                onChange={(e) => setFuzziness(parseInt(e.target.value))} 
                                className="w-full accent-cyan-500" 
                            />
                            <span className="font-mono text-lg w-16 text-right">{fuzziness} m</span>
                        </div>
                    </div>

                    {/* Min Cluster Size Slider */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Minimum Cluster Size (Logs)</label>
                        <div className="flex items-center space-x-4">
                            <input 
                                type="range" 
                                min="1" 
                                max="20" 
                                step="1" 
                                value={minClusterSize} 
                                onChange={(e) => setMinClusterSize(parseInt(e.target.value))} 
                                className="w-full accent-green-500" 
                            />
                            <span className="font-mono text-lg w-16 text-right">{minClusterSize}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                                            <button 
                                                onClick={handlePreview} 
                                                disabled={loading} 
                                                className="bg-cyan-600 hover:bg-cyan-700 px-6 py-2 rounded-md disabled:opacity-50 text-white font-medium transition-colors"
                                            >
                                                {loading ? 'Processing...' : 'Preview Clusters'}
                                            </button>
                        
                                            <button 
                                                onClick={handleApply} 
                                                disabled={loading || clusters.length === 0} 
                                                className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-md disabled:opacity-50 text-white font-medium transition-colors"
                                            >
                                                Apply Clusters
                                            </button>
                                                
                                                <label className="flex items-center space-x-2 text-sm text-gray-300 cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={limitToView} 
                                                        onChange={(e) => setLimitToView(e.target.checked)}
                                                        className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 bg-gray-700 border-gray-600"
                                                    />
                                                    <span>Limit to Map View (Recommended)</span>
                                                </label>
                                            </div>
                                            
                                            {stats && (
                                                <div className="text-sm">
                                                    <span className="text-gray-400">Clusters in Area: </span>
                                                    <span className="text-white font-bold mr-4">{stats.count}</span>
                                                    
                                                    <span className="text-gray-400">Visible: </span>
                                                    <span className="text-green-400 font-bold">{visibleClusters.length}</span>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {applyStatus && (
                                            <div className={`mt-2 p-3 rounded ${applyStatus.type === 'success' ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
                                                {applyStatus.message}
                                            </div>
                                        )}
                                    </div>
                        
                                    <div className="h-[500px] w-full bg-gray-900 rounded-lg overflow-hidden border border-gray-700 relative">                <MapContainer 
                    center={defaultCenter} 
                    zoom={4} 
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapEvents setBounds={setMapBounds} />
                    
                    {visibleClusters.map((cluster, idx) => (
                        <React.Fragment key={idx}>
                            {/* Cluster Center */}
                            <CircleMarker 
                                center={[cluster.center.lat, cluster.center.lon]}
                                pathOptions={{ color: '#10B981', fillColor: '#10B981', fillOpacity: 0.8 }}
                                radius={Math.min(20, 5 + cluster.points.length)} // Dynamic size
                            >
                                <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                                    <span>Cluster #{idx + 1} ({cluster.points.length} points)</span>
                                </Tooltip>
                            </CircleMarker>

                            {/* Individual Points in Cluster (Only show if clustered) */}
                            {cluster.points.map((point, pIdx) => (
                                <CircleMarker 
                                    key={`${idx}-${pIdx}`}
                                    center={[point.lat, point.lon]}
                                    pathOptions={{ color: '#EF4444', fillColor: '#EF4444', fillOpacity: 0.4, weight: 0 }}
                                    radius={2}
                                >
                                    <Popup>
                                        Log ID: {point.log_id} <br/> Type: {point.type}
                                    </Popup>
                                </CircleMarker>
                            ))}
                        </React.Fragment>
                    ))}
                </MapContainer>
            </div>
        </div>
    );
}
