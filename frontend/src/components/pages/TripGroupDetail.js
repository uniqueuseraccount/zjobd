// --- VERSION 1.3.0 ---
// - Synchronized with Global TimeContext
// - Implemented side-by-side Chart/Map layout (63/33)
// - Added mathematical averages for group stats
// - Added individual log list with navigation
// - Added Expanded Individual Log Charts grid for detailed comparison
// - Standardized PID colors across group

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

export default function TripGroupDetail() {
  const { groupId } = useParams();
  const { visibleRange, resetRange } = useGlobalTime();
  
  const [groupData, setGroupData] = useState(null);
  const [loading, setLoading] = useState(false);
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
    if (!groupData?.logs || !groupData?.log_data) return null;
    return groupData.logs.map((log, idx) => ({
      id: log.log_id,
      name: `Trip ${log.log_id}`,
      date: new Date(log.start_timestamp * 1000).toLocaleDateString(),
      data: groupData.log_data[log.log_id] || [],
      columns: Object.keys(groupData.log_data[log.log_id]?.[0] || {}),
      lineStyle: getLogLineStyle(idx)
    }));
  }, [groupData]);

  const referenceLog = useMemo(() => {
    if (!comparisonData || comparisonData.length === 0) return null;
    return [...comparisonData].sort((a, b) => b.data.length - a.data.length)[0];
  }, [comparisonData]);

  const tripInfo = useMemo(() => {
    if (!groupData?.logs || groupData.logs.length === 0) return null;
    const logs = groupData.logs;
    const count = logs.length;
    const avgDistance = logs.reduce((sum, l) => sum + (parseFloat(l.distance_miles) || 0), 0) / count;
    const avgDuration = logs.reduce((sum, l) => sum + (parseFloat(l.trip_duration_seconds) || 0), 0) / count;
    
    let earliestStart = null;
    logs.forEach(log => {
      if (log.start_timestamp) {
        const startTime = new Date(log.start_timestamp * 1000);
        if (!earliestStart || startTime < earliestStart) earliestStart = startTime;
      }
    });

    return {
      file_name: `Group: ${groupId.substring(0, 8)}...`,
      start_time: earliestStart ? earliestStart.getTime() : null,
      trip_distance_miles: avgDistance,
      trip_duration_seconds: avgDuration,
      row_count: referenceLog?.data?.length || 0,
      trip_group_id: groupId
    };
  }, [groupData, groupId, referenceLog]);

  useEffect(() => {
    if (!groupId) return;
    setLoading(true);
    const fetchGroupData = async () => {
      try {
        const response = await fetch(`/api/trip-groups/${groupId}`);
        const data = await response.json();
        setGroupData(data);
        let maxLen = 0;
        Object.values(data.log_data).forEach(d => { if (d.length > maxLen) maxLen = d.length; });
        if (maxLen > 0) resetRange(maxLen);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchGroupData();
  }, [groupId, resetRange]);

  if (loading) return <div className="p-8 text-center text-gray-400">Loading trip group data...</div>;
  if (error) return <div className="p-8 text-center text-red-400">Error: {error}</div>;
  if (!comparisonData) return null;

  return (
    <div className="space-y-8">
      <InfoBar tripInfo={tripInfo} groupLogs={groupData?.logs || []} />
      
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
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-gray-700 pb-2">
          <h3 className="text-2xl font-bold text-white">Individual Breakdown</h3>
          <button 
            onClick={() => resetRange(referenceLog.data.length)}
            className="text-cyan-400 hover:text-cyan-300 text-sm"
          >
            Reset View Window
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {comparisonData.map((log) => (
            <div key={log.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-lg group hover:border-cyan-500/50 transition-colors">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <span className="text-cyan-400 font-mono font-bold">Log {log.id}</span>
                  <span className="text-gray-500 text-xs ml-2">{log.date}</span>
                </div>
                <Link 
                  to={`/logs/${log.id}`}
                  className="p-1 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-cyan-400"
                  title="View Full Detail"
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
              
              <div className="h-48 rounded overflow-hidden border border-gray-900">
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
      <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700">
        <h3 className="text-xl font-bold text-cyan-400 mb-4">Group Metadata</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="text-xs uppercase text-gray-500 border-b border-gray-700 font-medium">
              <tr>
                <th className="pb-2">Log ID</th>
                <th className="pb-2">Line Style</th>
                <th className="pb-2">Start Time</th>
                <th className="pb-2">Distance</th>
                <th className="pb-2">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {groupData.logs.map((log, idx) => (
                <tr key={log.log_id} className="hover:bg-gray-700/30">
                  <td className="py-3 font-mono text-cyan-500/80">{log.log_id}</td>
                  <td className="py-3">
                    <div className="flex gap-1">
                      {getLogLineStyle(idx).length === 0 ? (
                        <div className="w-8 h-1 bg-cyan-400 rounded-full" title="Solid" />
                      ) : (
                        <div className="w-8 h-1 border-b-2 border-dashed border-cyan-400" title="Patterned" />
                      )}
                    </div>
                  </td>
                  <td className="py-3">{new Date(log.start_time).toLocaleString()}</td>
                  <td className="py-3">{(parseFloat(log.trip_distance_miles) || 0).toFixed(2)} mi</td>
                  <td className="py-3">
                    {Math.floor(log.trip_duration_seconds / 60)}m {Math.floor(log.trip_duration_seconds % 60)}s
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
