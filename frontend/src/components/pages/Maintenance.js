import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';

export default function Maintenance() {
    const [activeTab, setActiveTab] = useState('archive');
    
    // State for Tab 1 (Archive)
    const [availablePIDs, setAvailablePIDs] = useState([]);
    const [selectedPIDsForSearch, setSelectedPIDsForSearch] = useState([]);
    const [matchingLogs, setMatchingLogs] = useState([]);
    const [selectedLogs, setSelectedLogs] = useState([]);
    const [pidSearchTerm, setPidSearchTerm] = useState('');
    
    // State for Tab 2 (Blacklist)
    const [columnStats, setColumnStats] = useState([]);
    const [selectedPIDsForBlacklist, setSelectedPIDsForBlacklist] = useState([]);
    
    // Shared State
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [showPreview, setShowPreview] = useState(false);

    // --- DATA FETCHING ---

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
            setStatus('Error loading PID statistics. Check backend connectivity.');
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchAvailablePIDs();
        if (activeTab === 'pids') {
            fetchColumnStats();
        }
    }, [activeTab, fetchColumnStats, fetchAvailablePIDs]);

    // --- TAB 1: ARCHIVE LOGIC ---

    const handleLogSearch = async () => {
        if (selectedPIDsForSearch.length === 0) {
            setStatus('Please select at least one PID to search for.');
            return;
        }
        setLoading(true);
        setStatus('');
        setMatchingLogs([]);
        setShowPreview(false);
        try {
            const response = await axios.post('/api/maintenance/search-by-columns', { 
                column_names: selectedPIDsForSearch 
            });
            setMatchingLogs(response.data || []);
            setSelectedLogs([]);
            if (!response.data || response.data.length === 0) setStatus('No logs found matching those columns.');
        } catch (error) {
            setStatus('Search failed. Check backend logs.');
        }
        setLoading(false);
    };

    const togglePidSearchSelection = (pid) => {
        setSelectedPIDsForSearch(prev => 
            prev.includes(pid) ? prev.filter(p => p !== pid) : [...prev, pid]
        );
    };

    const filteredAvailablePIDs = useMemo(() => {
        return availablePIDs.filter(pid => 
            pid.toLowerCase().includes(pidSearchTerm.toLowerCase()) && 
            !selectedPIDsForSearch.includes(pid)
        );
    }, [availablePIDs, pidSearchTerm, selectedPIDsForSearch]);

    const toggleLogSelection = (logId) => {
        setSelectedLogs(prev => 
            prev.includes(logId) ? prev.filter(id => id !== logId) : [...prev, logId]
        );
    };

    // Calculate summary for Archive Preview
    const archiveSummary = useMemo(() => {
        const logsToArchive = matchingLogs.filter(l => selectedLogs.includes(l.log_id));
        const totalRows = logsToArchive.reduce((acc, l) => acc + (l.total_rows || 0), 0);
        return { count: logsToArchive.length, totalRows };
    }, [matchingLogs, selectedLogs]);

    const executeArchive = async () => {
        setLoading(true);
        setStatus('Executing archive and database purge...');
        setShowPreview(false);
        try {
            const response = await axios.post('/api/maintenance/archive-logs', { log_ids: selectedLogs });
            if (response.data.success) {
                const successful = response.data.results.filter(r => r.db_deleted).length;
                setStatus(`Action Complete: Purged ${successful} logs from DB and moved to archive. Details logged to program_logs.`);
                setMatchingLogs([]);
                setSelectedLogs([]);
                fetchAvailablePIDs();
            }
        } catch (error) {
            setStatus('Archive operation failed.');
        }
        setLoading(false);
    };

    // --- TAB 2: BLACKLIST LOGIC ---

    const toggleBlacklistSelection = (pid) => {
        setSelectedPIDsForBlacklist(prev => 
            prev.includes(pid) ? prev.filter(p => p !== pid) : [...prev, pid]
        );
    };

    // Calculate summary for Blacklist Preview
    const blacklistSummary = useMemo(() => {
        const pidsToBlacklist = columnStats.filter(c => selectedPIDsForBlacklist.includes(c.column_name));
        const totalRowsAffected = pidsToBlacklist.reduce((acc, c) => acc + (c.total_rows || 0), 0);
        return { count: pidsToBlacklist.length, totalRows: totalRowsAffected };
    }, [columnStats, selectedPIDsForBlacklist]);

    const executeBlacklist = async () => {
        setLoading(true);
        setStatus('Blacklisting PIDs and dropping columns...');
        setShowPreview(false);
        try {
            const response = await axios.post('/api/maintenance/blacklist-pids', { pids: selectedPIDsForBlacklist });
            if (response.data.success) {
                setStatus(`Action Complete: ${selectedPIDsForBlacklist.length} PIDs blacklisted and dropped. Details logged to program_logs.`);
                setSelectedPIDsForBlacklist([]);
                fetchColumnStats();
                fetchAvailablePIDs();
            }
        } catch (error) {
            setStatus('Blacklisting operation failed.');
        }
        setLoading(false);
    };

    // --- RENDER HELPERS ---

    const renderPreviewModal = (type) => {
        const summary = type === 'archive' ? archiveSummary : blacklistSummary;
        const onConfirm = type === 'archive' ? executeArchive : executeBlacklist;
        
        return (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                <div className="bg-gray-800 border-2 border-red-500 rounded-xl p-8 max-w-lg w-full space-y-6 shadow-2xl">
                    <h3 className="text-2xl font-bold text-red-400 flex items-center">
                        ⚠️ MANDATORY PREVIEW & CONFIRMATION
                    </h3>
                    
                    <div className="bg-gray-900/50 p-4 rounded border border-gray-700 space-y-3 font-mono text-sm">
                        <p className="text-white underline font-bold">Planned Action: {type === 'archive' ? 'DELETE & ARCHIVE' : 'DROP & BLACKLIST'}</p>
                        {type === 'archive' ? (
                            <>
                                <p>Logs to be removed: <span className="text-cyan-400">{summary.count}</span></p>
                                <p>Data rows to be deleted: <span className="text-cyan-400">{summary.totalRows.toLocaleString()}</span></p>
                                <p>File action: Move to <span className="text-cyan-400">/archive/unused_logs/</span></p>
                            </>
                        ) : (
                            <>
                                <p>PIDs to be blacklisted: <span className="text-cyan-400">{summary.count}</span></p>
                                <p>Affected data points (approx): <span className="text-cyan-400">{summary.totalRows.toLocaleString()}</span></p>
                                <p>Schema action: <span className="text-red-400">DROP COLUMN from log_data</span></p>
                            </>
                        )}
                        <p className="text-yellow-500 pt-2 font-bold">Traceability: Every deletion will be recorded in program_logs/maintenance_*.log</p>
                    </div>

                    <div className="flex space-x-4">
                        <button 
                            onClick={onConfirm}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors"
                        >
                            CONFIRM & EXECUTE
                        </button>
                        <button 
                            onClick={() => setShowPreview(false)}
                            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition-colors"
                        >
                            CANCEL
                        </button>
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
                    onClick={() => { setActiveTab('archive'); setStatus(''); }}
                    className={`pb-2 px-4 font-medium transition-colors ${activeTab === 'archive' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'}`}
                >
                    Log Purge & Archive
                </button>
                <button 
                    onClick={() => { setActiveTab('pids'); setStatus(''); }}
                    className={`pb-2 px-4 font-medium transition-colors ${activeTab === 'pids' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'}`}
                >
                    PID Cleanup & Blacklist
                </button>
            </div>

            {status && (
                <div className={`p-4 rounded-lg border font-medium ${status.includes('failed') || status.includes('Error') ? 'bg-red-900/20 border-red-500 text-red-200' : 'bg-green-900/20 border-green-500 text-green-200'}`}>
                    {status}
                </div>
            )}

            {activeTab === 'archive' && (
                <div className="bg-gray-800 rounded-lg p-6 shadow-xl space-y-6 border border-gray-700">
                    <div>
                        <h2 className="text-xl font-semibold mb-2">Identify Logs by PID Presence</h2>
                        <p className="text-gray-400 text-sm mb-4">Find and archive logs from other vehicles by searching for PIDs your Jeep doesn't use.</p>
                        
                        <div className="space-y-4">
                            {/* Selected PIDs Tags */}
                            <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-gray-900/30 rounded border border-gray-700">
                                {selectedPIDsForSearch.map(pid => (
                                    <span key={pid} className="bg-cyan-900/50 text-cyan-200 px-3 py-1 rounded-full text-xs border border-cyan-700 flex items-center">
                                        {pid}
                                        <button onClick={() => togglePidSearchSelection(pid)} className="ml-2 hover:text-white text-lg">×</button>
                                    </span>
                                ))}
                                {selectedPIDsForSearch.length === 0 && <span className="text-gray-600 italic text-sm p-1">No PIDs selected...</span>}
                            </div>

                            <div className="flex space-x-4">
                                <div className="relative flex-1">
                                    <input 
                                        type="text" 
                                        value={pidSearchTerm}
                                        onChange={(e) => setPidSearchTerm(e.target.value)}
                                        onFocus={() => { if(!pidSearchTerm) setPidSearchTerm(' '); }}
                                        placeholder="Type to find PIDs (e.g. o2_s2b1)..."
                                        className="w-full bg-gray-700 border-gray-600 rounded px-4 py-2 text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                                    />
                                    {pidSearchTerm && (
                                        <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl max-h-60 overflow-y-auto">
                                            {filteredAvailablePIDs.map(pid => (
                                                <div 
                                                    key={pid} 
                                                    onClick={() => { togglePidSearchSelection(pid); setPidSearchTerm(''); }}
                                                    className="px-4 py-2 hover:bg-cyan-600/50 cursor-pointer text-sm border-b border-gray-700 last:border-0"
                                                >
                                                    {pid}
                                                </div>
                                            ))}
                                            {filteredAvailablePIDs.length === 0 && <div className="px-4 py-2 text-gray-500 italic">No matching PIDs found</div>}
                                        </div>
                                    )}
                                </div>
                                <button 
                                    onClick={handleLogSearch}
                                    disabled={loading || selectedPIDsForSearch.length === 0}
                                    className="bg-cyan-600 hover:bg-cyan-700 px-8 py-2 rounded-lg font-bold disabled:opacity-50 transition-all shadow-lg"
                                >
                                    {loading ? 'Searching...' : 'Search Matching Logs'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {matchingLogs.length > 0 && (
                        <div className="space-y-4 pt-6 border-t border-gray-700">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-bold text-yellow-400">{matchingLogs.length} Matching Logs Identified</h3>
                                    <p className="text-xs text-gray-400 italic">Select the logs you want to permanently purge from the system.</p>
                                </div>
                                <button 
                                    onClick={() => setShowPreview(true)}
                                    disabled={loading || selectedLogs.length === 0}
                                    className="bg-red-600 hover:bg-red-700 px-8 py-3 rounded-lg font-bold disabled:opacity-50 transition-all shadow-xl"
                                >
                                    Proceed to Archive ({selectedLogs.length})
                                </button>
                            </div>
                            <div className="max-h-[400px] overflow-y-auto border border-gray-700 rounded-lg bg-gray-900/30">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-900 sticky top-0 border-b border-gray-700">
                                        <tr>
                                            <th className="p-4 w-10">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-4 h-4"
                                                    checked={selectedLogs.length === matchingLogs.length && matchingLogs.length > 0}
                                                    onChange={() => setSelectedLogs(selectedLogs.length === matchingLogs.length ? [] : matchingLogs.map(l => l.log_id))}
                                                />
                                            </th>
                                            <th className="p-4">File Name</th>
                                            <th className="p-4">Start Time</th>
                                            <th className="p-4 text-right">Data Rows</th>
                                            <th className="p-4 text-right">Duration</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {matchingLogs.map(log => (
                                            <tr key={log.log_id} className="border-t border-gray-800 hover:bg-gray-700/30 transition-colors">
                                                <td className="p-4">
                                                    <input 
                                                        type="checkbox" 
                                                        className="w-4 h-4"
                                                        checked={selectedLogs.includes(log.log_id)}
                                                        onChange={() => toggleLogSelection(log.log_id)}
                                                    />
                                                </td>
                                                <td className="p-4 font-mono text-sm text-cyan-100">{log.file_name}</td>
                                                <td className="p-4 text-sm text-gray-300">
                                                    {log.start_time ? new Date(log.start_time).toLocaleString() : 'N/A'}
                                                </td>
                                                <td className="p-4 text-sm text-right text-gray-400">{(log.total_rows || 0).toLocaleString()}</td>
                                                <td className="p-4 text-sm text-right text-gray-400">{(log.trip_duration_seconds / 60).toFixed(1)}m</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'pids' && (
                <div className="bg-gray-800 rounded-lg p-6 shadow-xl space-y-6 border border-gray-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-semibold mb-2">PID Data Quality Scan</h2>
                            <p className="text-gray-400 text-sm mb-4">Columns with <span className="text-red-400 font-bold">0 Populated Rows</span> are likely unsupported by the PCM. Blacklisting them will drop them from the database.</p>
                        </div>
                        <button 
                            onClick={() => setShowPreview(true)}
                            disabled={loading || selectedPIDsForBlacklist.length === 0}
                            className="bg-red-600 hover:bg-red-700 px-8 py-3 rounded-lg font-bold disabled:opacity-50 transition-all shadow-xl"
                        >
                            Proceed to Blacklist ({selectedPIDsForBlacklist.length})
                        </button>
                    </div>

                    <div className="max-h-[600px] overflow-y-auto border border-gray-700 rounded-lg bg-gray-900/30">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-900 sticky top-0 border-b border-gray-700">
                                <tr>
                                    <th className="p-4 w-10"></th>
                                    <th className="p-4">PID Name (Source)</th>
                                    <th className="p-4">Sanitized Name</th>
                                    <th className="p-4 text-right">Populated Rows</th>
                                    <th className="p-4 text-right">Total Rows</th>
                                    <th className="p-4 text-right">Fill %</th>
                                </tr>
                            </thead>
                            <tbody>
                                {columnStats.map(col => {
                                    const fillPct = col.total_rows > 0 ? (col.populated_rows / col.total_rows) * 100 : 0;
                                    const isEmpty = col.populated_rows === 0;
                                    const isSelected = selectedPIDsForBlacklist.includes(col.column_name);
                                    
                                    return (
                                        <tr 
                                            key={col.column_id} 
                                            className={`border-t border-gray-800 hover:bg-gray-700/30 transition-colors ${isEmpty ? 'bg-red-900/5' : ''} ${isSelected ? 'bg-cyan-900/10' : ''}`}
                                        >
                                            <td className="p-4">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-4 h-4"
                                                    checked={isSelected}
                                                    onChange={() => toggleBlacklistSelection(col.column_name)}
                                                />
                                            </td>
                                            <td className={`p-4 font-medium ${isEmpty ? 'text-red-300' : 'text-white'}`}>{col.column_name}</td>
                                            <td className="p-4 font-mono text-xs text-gray-500">{col.sanitized_name}</td>
                                            <td className={`p-4 text-right font-mono ${isEmpty ? 'text-red-400 font-bold' : 'text-gray-300'}`}>{col.populated_rows.toLocaleString()}</td>
                                            <td className="p-4 text-right text-gray-500 font-mono">{col.total_rows.toLocaleString()}</td>
                                            <td className="p-4 text-right">
                                                <span className={`px-2 py-1 rounded text-xs font-bold font-mono ${fillPct > 50 ? 'bg-green-900/30 text-green-400' : fillPct > 0 ? 'bg-yellow-900/30 text-yellow-400' : 'bg-red-900/30 text-red-400'}`}>
                                                    {fillPct.toFixed(1)}%
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {columnStats.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan="6" className="p-10 text-center text-gray-500 italic">No PID data available.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {showPreview && renderPreviewModal(activeTab)}
        </div>
    );
}
