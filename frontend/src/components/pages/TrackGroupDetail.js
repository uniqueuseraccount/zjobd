// --- VERSION 1.1.0 ---
// - Synchronized with Global TimeContext
// - Implemented side-by-side Chart/Map layout (63/33) matching TripGroupDetail
// - Added mathematical averages for track stats
// - Added individual log breakdown grid and detailed log table
// - Corrected line style differentiation for track comparison

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import TripChart from '../charts/TripChart';
import TripMap from '../maps/TripMap';
import InfoBar from '../shared/InfoBar';
import { useGlobalTime } from '../../context/TimeContext';
import { getPidColor } from '../../utils/colorUtils';

// Helper to generate unique line styles for logs in comparison
const getLogLineStyle = (idx) => {
  const styles = [
    [],              // Solid
    [5, 5],          // Dashed
    [2, 2],          // Dotted
    [10, 5, 2, 5],   // Dash-dot
    [15, 3, 15, 3]   // Long dash
  ];
  return styles[idx % styles.length];
};

export default function TrackGroupDetail() {
  const { startId, endId } = useParams();
  const { visibleRange, resetRange } = useGlobalTime();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedPIDs, setSelectedPIDs] = useState([
    'vehicle_speed',
    'engine_rpm',
    'none',
    'none',
    'none'
  ]);
  
  const chartColors = selectedPIDs.map((pid, idx) => getPidColor(pid, idx));

  const handlePIDChange = useCallback((index, value) => {
    setSelectedPIDs(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  }, []);

  const comparisonData = useMemo(() => {
    if (!data?.logs || !data?.log_data) return null;
    return data.logs.map((log, idx) => ({
      id: log.log_id,
      name: `Log ${log.log_id}`,
      date: new Date(log.start_timestamp * 1000).toLocaleDateString(),
      data: data.log_data[log.log_id] || [],
      columns: Object.keys(data.log_data[log.log_id]?.[0] || {}),
      lineStyle: getLogLineStyle(idx)
    }));
  }, [data]);

  const referenceLog = useMemo(() => {
    if (!comparisonData || comparisonData.length === 0) return null;
    return [...comparisonData].sort((a, b) => b.data.length - a.data.length)[0];
  }, [comparisonData]);

  const tripInfo = useMemo(() => {
    if (!data?.logs || data.logs.length === 0) return null;
    const logs = data.logs;
    const count = logs.length;
    
    // MATHEMATICAL AVERAGES
    const avgDistance = logs.reduce((sum, l) => sum + (parseFloat(l.trip_distance_miles || l.distance_miles) || 0), 0) / count;
    const avgDuration = logs.reduce((sum, l) => sum + (parseFloat(l.trip_duration_seconds) || 0), 0) / count;
    
    let earliestStart = null;
    logs.forEach(log => {
      if (log.start_timestamp) {
        const startTime = new Date(log.start_timestamp * 1000);
        if (!earliestStart || startTime < earliestStart) earliestStart = startTime;
      }
    });

    return {
      file_name: `Track: ${startId} → ${endId}`,
      start_time: earliestStart ? earliestStart.getTime() : null,
      trip_distance_miles: avgDistance,
      trip_duration_seconds: avgDuration,
      row_count: referenceLog?.data?.length || 0,
      trip_group_id: `track-${startId}-${endId}`
    };
  }, [data, startId, endId, referenceLog]);

  useEffect(() => {
    if (!startId || !endId) return;
    setLoading(true);
    const fetchGroupData = async () => {
      try {
        const response = await fetch(`/api/track-groups/${startId}/${endId}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const result = await response.json();
        
        setData(result);

        // SYNC GLOBAL TIME
        let maxLen = 0;
        Object.values(result.log_data).forEach(d => { if (d.length > maxLen) maxLen = d.length; });
        if (maxLen > 0) resetRange(maxLen);

      } catch (err) {
        console.error(`[TrackGroupDetail] Error:`, err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchGroupData();
  }, [startId, endId, resetRange]);

  if (loading) return <div className="p-8 text-center text-gray-400 font-medium">Loading track group data...</div>;
  if (error) return <div className="p-8 text-center text-red-400 font-medium border border-red-900/50 rounded-lg bg-red-900/10">Error: {error}</div>;
  if (!comparisonData) return null;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link to="/track-groups" className="text-gray-400 hover:text-cyan-400 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <h2 className="text-2xl font-bold text-white">Track Group: {startId} → {endId}</h2>
      </div>

      <InfoBar tripInfo={tripInfo} groupLogs={data?.logs || []} />
      
      {/* Primary Comparison View */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="lg:w-[63%]">
          <TripChart
            log={referenceLog}
            logs={comparisonData} 
            selectedPIDs={selectedPIDs}
            onPIDChange={handlePIDChange}
            chartColors={chartColors}
            mode="comparison"
          />
        </div>
        <div className="lg:w-[33%]">
          <TripMap
            primaryPath={referenceLog?.data || []}
            secondaryPaths={comparisonData.filter(l => l.id !== referenceLog?.id).map(l => l.data)}
            columns={['latitude', 'longitude']}
            visibleRange={visibleRange}
            showDataPoints={true}
          />
        </div>
      </div>

      {/* Expanded Individual Log Grid */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between border-b border-gray-700 pb-2">
          <h3 className="text-2xl font-bold text-white">Individual Comparison Breakdown</h3>
          <button 
            onClick={() => resetRange(referenceLog.data.length)}
            className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
          >
            Reset View Window
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {comparisonData.map((log) => (
            <div key={log.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-lg group hover:border-cyan-500/50 transition-all duration-300">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <span className="text-cyan-400 font-mono font-bold">Log {log.id}</span>
                  <span className="text-gray-500 text-xs ml-3 font-medium uppercase tracking-wider">{log.date}</span>
                </div>
                <Link 
                  to={`/logs/${log.id}`}
                  className="p-1.5 hover:bg-gray-700 rounded-md transition-all text-gray-400 hover:text-cyan-400"
                  title="Open Full Single Detail View"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </Link>
              </div>
              
              <div className="h-48 mb-4">
                <TripChart
                  log={log}
                  selectedPIDs={selectedPIDs}
                  chartColors={chartColors}
                  mode="single"
                />
              </div>
              
              <div className="h-48 rounded-lg overflow-hidden border border-gray-900 shadow-inner">
                <TripMap
                  primaryPath={log.data}
                  columns={['latitude', 'longitude']}
                  visibleRange={visibleRange}
                  showDataPoints={false}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700 mb-8">
        <h3 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
          <span>Track Data Source Logs</span>
          <span className="text-sm font-normal text-gray-500">({data.logs.length} sessions)</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="text-xs uppercase text-gray-500 border-b border-gray-700 font-bold tracking-wider">
              <tr>
                <th className="pb-3 px-2">Log ID</th>
                <th className="pb-3 px-2">Line Pattern</th>
                <th className="pb-3 px-2">Start Time</th>
                <th className="pb-3 px-2">Distance</th>
                <th className="pb-3 px-2">Duration</th>
                <th className="pb-3 px-2 text-right">Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50 font-medium">
              {data.logs.map((log, idx) => (
                <tr key={log.log_id} className="hover:bg-gray-750 transition-colors group">
                  <td className="py-4 px-2 font-mono text-cyan-500/80">{log.log_id}</td>
                  <td className="py-4 px-2">
                    <div className="flex gap-1.5 items-center">
                      {getLogLineStyle(idx).length === 0 ? (
                        <div className="w-10 h-1 bg-cyan-400 rounded-full shadow-sm shadow-cyan-500/20" title="Solid Line" />
                      ) : (
                        <div className="w-10 h-1 border-b-2 border-dashed border-cyan-400" title="Patterned Line" />
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-2 text-gray-400 group-hover:text-gray-200">{new Date(log.start_time).toLocaleString()}</td>
                  <td className="py-4 px-2">{(parseFloat(log.trip_distance_miles || log.distance_miles) || 0).toFixed(2)} mi</td>
                  <td className="py-4 px-2 text-gray-400 group-hover:text-gray-200">
                    {Math.floor(log.trip_duration_seconds / 60)}m {Math.floor(log.trip_duration_seconds % 60)}s
                  </td>
                  <td className="py-4 px-2 text-right">
                    <Link to={`/logs/${log.log_id}`} className="text-blue-400 hover:text-cyan-400 underline underline-offset-4 decoration-blue-400/30 hover:decoration-cyan-400/50 transition-all">
                      Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
