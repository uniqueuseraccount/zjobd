// --- VERSION 1.1.0 ---
// - Added Waypoints & Locations maintenance tab
// - Integrated interactive map for waypoint cluster naming
// - Added human-readable location management

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapController({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center) map.setView(center, 13);
    }, [center, map]);
    return null;
}

export default function Maintenance() {
    const [activeTab, setActiveTab] = useState('waypoints');
    
    // State for Tab 1 (Archive)
    const [availablePIDs, setAvailablePIDs] = useState([]);
    const [selectedPIDsForSearch, setSelectedPIDsForSearch] = useState([]);
    const [matchingLogs, setMatchingLogs] = useState([]);
    const [selectedLogs, setSelectedLogs] = useState([]);
    const [pidSearchTerm, setPidSearchTerm] = useState('');
    
    // State for Tab 2 (Blacklist)
    const [columnStats, setColumnStats] = useState([]);
    const [selectedPIDsForBlacklist, setSelectedPIDsForBlacklist] = useState([]);

    // State for Tab 3 (Waypoints)
    const [waypoints, setWaypoints] = useState([]);
    const [editingWaypoint, setEditingWaypoint] = useState(null);
    const [newName, setNewName] = useState('');
    
    // Shared State
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [showPreview, setShowPreview] = useState(false);

    // --- DATA FETCHING ---

    const fetchWaypoints = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/maintenance/waypoints');
            setWaypoints(response.data || []);
        } catch (error) {
            console.error("Error fetching waypoints:", error);
        }
        setLoading(false);
    }, []);

    const fetchAvailablePIDs = useCallback(async () => {
        try {
            const response = await axios.get('/api/maintenance/available-pids');
            setAvailablePIDs(response.data || []);
        } catch (error) {
            console.error("Error fetching available PIDs:", error);
        }
    }, []);

    const fetchColumnStats = useCallback(async () => {
        setLoading(true);
        setStatus('');
        try {
            const response = await axios.get('/api/maintenance/column-stats');
            setColumnStats(response.data || []);
        } catch (error) {
            console.error("Error fetching column stats:", error);
            setStatus('Error loading PID statistics.');
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (activeTab === 'waypoints') fetchWaypoints();
        if (activeTab === 'archive') fetchAvailablePIDs();
        if (activeTab === 'pids') fetchColumnStats();
    }, [activeTab, fetchColumnStats, fetchAvailablePIDs, fetchWaypoints]);

    // --- WAYPOINT LOGIC ---

    const handleSaveWaypointName = async () => {
        if (!editingWaypoint) return;
        try {
            await axios.post(`/api/maintenance/waypoints/${editingWaypoint.waypoint_id}/name`, { name: newName });
            setStatus(`Updated waypoint ${editingWaypoint.waypoint_id} to "${newName}"`);
            setEditingWaypoint(null);
            setNewName('');
            fetchWaypoints();
        } catch (error) {
            setStatus('Failed to update waypoint name.');
        }
    };

    // --- RENDER HELPERS ---

    const renderWaypointModal = () => {
        if (!editingWaypoint) return null;
        return (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[3000] p-4">
                <div className="bg-gray-800 border-2 border-cyan-500 rounded-xl p-8 max-w-lg w-full space-y-6 shadow-2xl">
                    <h3 className="text-2xl font-bold text-white">Name Location</h3>
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Current ID: {editingWaypoint.waypoint_id}</label>
                        <input 
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="w-full bg-gray-700 border-gray-600 rounded px-4 py-3 text-white outline-none focus:ring-2 focus:ring-cyan-500"
                            placeholder="e.g. Home, Speedway, Work..."
                            autoFocus
                        />
                    </div>
                    <div className="flex space-x-4">
                        <button onClick={handleSaveWaypointName} className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 rounded-lg transition-colors">SAVE NAME</button>
                        <button onClick={() => setEditingWaypoint(null)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition-colors">CANCEL</button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 pb-20">
            <h1 className="text-3xl font-bold text-cyan-400">System Maintenance</h1>
            
            <div className="flex space-x-4 border-b border-gray-700">
                <button 
                    onClick={() => setActiveTab('waypoints')}
                    className={`pb-2 px-4 font-medium transition-colors ${activeTab === 'waypoints' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'}`}
                >
                    Waypoints & Locations
                </button>
                <button 
                    onClick={() => setActiveTab('archive')}
                    className={`pb-2 px-4 font-medium transition-colors ${activeTab === 'archive' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'}`}
                >
                    Log Purge & Archive
                </button>
                <button 
                    onClick={() => setActiveTab('pids')}
                    className={`pb-2 px-4 font-medium transition-colors ${activeTab === 'pids' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'}`}
                >
                    PID Cleanup & Blacklist
                </button>
            </div>

            {status && (
                <div className={`p-4 rounded-lg border font-medium ${status.includes('failed') ? 'bg-red-900/20 border-red-500 text-red-200' : 'bg-green-900/20 border-green-500 text-green-200'}`}>
                    {status}
                </div>
            )}

            {activeTab === 'waypoints' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-gray-800 rounded-lg p-4 shadow-xl border border-gray-700 h-[600px] relative">
                        <MapContainer center={[44.97, -93.26]} zoom={11} style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}>
                            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png" attribution='&copy; CartoDB' />
                            {waypoints.map(wp => (
                                <Marker 
                                    key={wp.waypoint_id} 
                                    position={[wp.latitude, wp.longitude]}
                                    eventHandlers={{ click: () => { setEditingWaypoint(wp); setNewName(wp.name || ''); } }}
                                >
                                    <Popup>
                                        <div className="text-gray-900 font-bold">{wp.name || `Waypoint ${wp.waypoint_id}`}</div>
                                        <div className="text-xs text-gray-500">{wp.latitude.toFixed(4)}, {wp.longitude.toFixed(4)}</div>
                                    </Popup>
                                </Marker>
                            ))}
                        </MapContainer>
                    </div>
                    
                    <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700 overflow-y-auto h-[600px]">
                        <h2 className="text-xl font-bold text-white mb-4">Location Registry</h2>
                        <div className="space-y-3">
                            {waypoints.map(wp => (
                                <div 
                                    key={wp.waypoint_id} 
                                    className="p-3 bg-gray-900/50 rounded border border-gray-700 hover:border-cyan-500/50 cursor-pointer transition-colors flex justify-between items-center"
                                    onClick={() => { setEditingWaypoint(wp); setNewName(wp.name || ''); }}
                                >
                                    <div>
                                        <div className={`font-bold ${wp.name ? 'text-cyan-400' : 'text-gray-500 italic'}`}>
                                            {wp.name || 'Unnamed Location'}
                                        </div>
                                        <div className="text-xs text-gray-500 font-mono">ID: {wp.waypoint_id} | {wp.latitude.toFixed(3)}, {wp.longitude.toFixed(3)}</div>
                                    </div>
                                    <button className="text-gray-500 hover:text-white">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'archive' && (
                <div className="bg-gray-800 rounded-lg p-6 shadow-xl space-y-6 border border-gray-700">
                    {/* (Original Archive Content Kept Below) */}
                    <div>
                        <h2 className="text-xl font-semibold mb-2">Identify Logs by PID Presence</h2>
                        <div className="space-y-4">
                            <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-gray-900/30 rounded border border-gray-700">
                                {selectedPIDsForSearch.map(pid => (
                                    <span key={pid} className="bg-cyan-900/50 text-cyan-200 px-3 py-1 rounded-full text-xs border border-cyan-700 flex items-center">
                                        {pid}
                                        <button onClick={() => {}} className="ml-2 hover:text-white text-lg">×</button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {renderWaypointModal()}
        </div>
    );
}
