
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

    // Calculate map center based on first visible cluster or default
    const mapCenter = useMemo(() => {
        if (visibleClusters.length > 0) {
            return [visibleClusters[0].center.lat, visibleClusters[0].center.lon];
        }
        return [39.8283, -98.5795]; // US Center default
    }, [visibleClusters]);

    return (
        <div className="bg-gray-800 rounded-lg shadow-xl p-6 space-y-6 mt-6">
            <div>
                <h3 className="text-xl font-semibold text-cyan-400">Waypoint Clustering Sensitivity</h3>
                <p className="text-gray-400 mt-1 mb-4">
                    Adjust parameters to group start/end locations. 
                    <b className="text-gray-300"> Fuzziness</b> determines how close points must be to group together.
                    <b className="text-gray-300"> Minimum Size</b> filters out random stops (noise) that don't happen often.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Fuzziness Slider */}
                    <div className="bg-gray-700/30 p-4 rounded-lg">
                        <label className="block text-sm text-gray-400 mb-2 font-medium">Fuzziness (Distance)</label>
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
                            <span className="font-mono text-lg w-20 text-right text-cyan-400">{fuzziness} m</span>
                        </div>
                    </div>

                    {/* Min Cluster Size Slider */}
                    <div className="bg-gray-700/30 p-4 rounded-lg">
                        <label className="block text-sm text-gray-400 mb-2 font-medium">Minimum Cluster Size (Logs)</label>
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
                            <span className="font-mono text-lg w-12 text-right text-green-400">{minClusterSize}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center space-x-3">
                        <button 
                            onClick={handlePreview} 
                            disabled={loading} 
                            className="bg-cyan-600 hover:bg-cyan-700 px-6 py-2 rounded-md disabled:opacity-50 text-white font-medium transition-colors shadow-lg"
                        >
                            {loading ? 'Processing...' : 'Preview Clusters'}
                        </button>
    
                        <button 
                            onClick={handleApply} 
                            disabled={loading || clusters.length === 0} 
                            className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-md disabled:opacity-50 text-white font-medium transition-colors shadow-lg"
                        >
                            Apply Clusters
                        </button>
                            
                        <label className="flex items-center space-x-2 text-sm text-gray-300 cursor-pointer ml-2">
                            <input 
                                type="checkbox" 
                                checked={limitToView} 
                                onChange={(e) => setLimitToView(e.target.checked)}
                                className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 bg-gray-700 border-gray-600"
                            />
                            <span>Limit to Map View</span>
                        </label>
                    </div>
                    
                    {stats && (
                        <div className="text-sm bg-gray-900/50 px-3 py-1 rounded-full border border-gray-700">
                            <span className="text-gray-400">Found: </span>
                            <span className="text-white font-bold mr-4">{stats.count}</span>
                            
                            <span className="text-gray-400">Visible: </span>
                            <span className="text-green-400 font-bold">{visibleClusters.length}</span>
                        </div>
                    )}
                </div>
                
                {applyStatus && (
                    <div className={`mt-4 p-3 rounded-md border ${
                        applyStatus.type === 'success' 
                            ? 'bg-green-900/20 border-green-500 text-green-200' 
                            : 'bg-red-900/20 border-red-500 text-red-200'
                    }`}>
                        {applyStatus.message}
                    </div>
                )}
            </div>

            <div className="h-[500px] w-full bg-gray-900 rounded-lg overflow-hidden border border-gray-700 relative shadow-inner">
                <MapContainer 
                    center={mapCenter} 
                    zoom={visibleClusters.length > 0 ? 12 : 4} 
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
                                radius={Math.min(20, 5 + cluster.points.length)}
                            >
                                <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                                    <span>Location {idx + 1} ({cluster.points.length} points)</span>
                                </Tooltip>
                            </CircleMarker>

                            {/* Individual Points in Cluster */}
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
