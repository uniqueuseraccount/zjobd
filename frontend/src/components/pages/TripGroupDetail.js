// --- VERSION 1.0.0 ---
// - Enhanced TripGroupDetail with proper data fetching and normalization
// - Synchronized chart and map interaction for trip group comparison
// - Proper error handling and loading states

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import TripChart from '../charts/TripChart';
import TripMap from '../maps/TripMap';
import InfoBar from '../shared/InfoBar';
import { DEFAULT_WINDOW_SECONDS, getDefaultVisibleRange } from '../../utils/rangeUtils';
import { getPidColor } from '../../utils/colorUtils';

export default function TripGroupDetail() {
  const { groupId } = useParams();
  
  // State management
  const [groupData, setGroupData] = useState(null);
  const [visibleRange, setVisibleRange] = useState({ min: 0, max: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // For Comparison Mode, we usually focus on one metric across trips, 
  // but to keep consistent with the UI, we'll allow standard selection 
  // and the Chart will decide how to render (e.g. primary log solid, others dashed/faded).
  const [selectedPIDs, setSelectedPIDs] = useState([
    'vehicle_speed',
    'engine_rpm',
    'none',
    'none',
    'none'
  ]);
  
  // Use the util for consistent colors
  const chartColors = selectedPIDs.map((pid, idx) => getPidColor(pid, idx));

  // Handle PID changes
  const handlePIDChange = useCallback((index, value) => {
    setSelectedPIDs(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  }, []);

  // Handle chart zoom changes and sync with map
  const handleChartZoom = useCallback((newRange) => {
    setVisibleRange(newRange);
  }, []);

  // Prepare data for all logs in the group
  const comparisonData = useMemo(() => {
    if (!groupData?.logs || !groupData?.log_data) return null;

    return groupData.logs.map(log => ({
      id: log.log_id,
      name: `Trip ${log.log_id} (${new Date(log.start_timestamp * 1000).toLocaleDateString()})`,
      data: groupData.log_data[log.log_id] || [],
      columns: Object.keys(groupData.log_data[log.log_id]?.[0] || {})
    }));
  }, [groupData]);

  // Use the first log as the "primary" for map reference and initial range
  const primaryLogData = comparisonData?.[0];

  // Create trip info for InfoBar
  const tripInfo = useMemo(() => {
    if (!groupData?.logs || groupData.logs.length === 0) return null;

    let totalDistance = 0;
    let totalDuration = 0;
    let earliestStart = null;
    
    groupData.logs.forEach(log => {
      if (log.trip_distance_miles) totalDistance += parseFloat(log.trip_distance_miles) || 0;
      if (log.trip_duration_seconds) totalDuration += parseFloat(log.trip_duration_seconds) || 0;
      if (log.start_timestamp) {
        const startTime = new Date(log.start_timestamp * 1000);
        if (!earliestStart || startTime < earliestStart) earliestStart = startTime;
      }
    });

    return {
      file_name: `Trip Group ${groupId} (${groupData.logs.length} trips)`,
      start_time: earliestStart ? earliestStart.getTime() : null,
      trip_distance_miles: totalDistance,
      trip_duration_seconds: totalDuration,
      row_count: primaryLogData?.data?.length || 0,
      trip_group_id: groupId
    };
  }, [groupData, groupId, primaryLogData]);

  // Fetch trip group data
  useEffect(() => {
    if (!groupId) return;
    setLoading(true);
    setError(null);
    
    const fetchGroupData = async () => {
      try {
        const response = await fetch(`/api/trip-groups/${groupId}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const data = await response.json();
        
        if (!data.logs || !Array.isArray(data.logs) || data.logs.length === 0) {
          throw new Error('Invalid group data: missing or empty logs array');
        }

        setGroupData(data);

        // Set initial visible range based on primary log
        const firstLogId = data.logs[0]?.log_id;
        const firstLogData = data.log_data[firstLogId];
        
        if (Array.isArray(firstLogData)) {
          const initialRange = getDefaultVisibleRange(firstLogData, DEFAULT_WINDOW_SECONDS);
          setVisibleRange(initialRange);
        }

      } catch (err) {
        console.error(`[TripGroupDetail] Error fetching group ${groupId}:`, err);
        setError(err.message);
        setGroupData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchGroupData();
  }, [groupId]);

  if (loading) return <div className="p-8 text-center text-gray-400">Loading trip group data...</div>;
  if (error) return <div className="p-8 text-center text-red-400">Error: {error}</div>;
  if (!comparisonData || comparisonData.length === 0) return <div className="p-8 text-center text-gray-400">No data available</div>;

  return (
    <div className="space-y-4">
      <InfoBar tripInfo={tripInfo} groupLogs={groupData?.logs || []} />
      
      <TripChart
        logs={comparisonData} // Pass ARRAY of logs
        selectedPIDs={selectedPIDs}
        onPIDChange={handlePIDChange}
        chartColors={chartColors}
        visibleRange={visibleRange}
        setVisibleRange={setVisibleRange}
        onChartZoom={handleChartZoom}
        mode="comparison" // Signal to chart that we are comparing multiple logs
      />
      
      <TripMap
        primaryPath={primaryLogData.data}
        secondaryPaths={comparisonData.slice(1).map(l => l.data)} // Pass other paths
        columns={['latitude', 'longitude', 'operating_state']}
        visibleRange={visibleRange}
        showDataPoints={true}
      />

      {/* Group Summary stats block (existing code) */}
      <div className="bg-gray-800 rounded-lg p-4">
         {/* ... (Keep existing summary stats logic) ... */}
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
             <div className="bg-gray-700 p-2 rounded">
                 <div className="text-gray-400 text-xs">Total Trips</div>
                 <div className="text-xl font-bold text-white">{groupData?.logs?.length}</div>
             </div>
             {/* ... placeholders for other stats ... */}
         </div>
      </div>
    </div>
  );
}