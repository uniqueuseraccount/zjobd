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

export default function TripGroupDetail() {
  const { groupId } = useParams();
  
  // State management
  const [groupData, setGroupData] = useState(null);
  const [visibleRange, setVisibleRange] = useState({ min: 0, max: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // PID selection state with color persistence
  const [selectedPIDs, setSelectedPIDs] = useState([
    'engine_rpm',
    'vehicle_speed',
    'maf', 
    'throttle_position',
    'coolant_temp'
  ]);
  
  const chartColors = ['#FF4D4D', '#00E676', '#38BDF8', '#F59E0B', '#A78BFA'];

  // Handle PID changes while preserving color positions
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

  // Create normalized log data from group data
  const normalizedLog = useMemo(() => {
    if (!groupData?.logs || !groupData?.log_data) {
      return null;
    }

    // Use the first (primary) log's data
    const primaryLog = groupData.logs[0];
    if (!primaryLog) return null;

    const primaryData = groupData.log_data[primaryLog.log_id];
    if (!Array.isArray(primaryData) || primaryData.length === 0) {
      return null;
    }

    // Extract columns from first data row
    const columns = Object.keys(primaryData[0]);
    
    console.log(`[TripGroupDetail] Normalized log:`, {
      primaryLogId: primaryLog.log_id,
      dataPoints: primaryData.length,
      columns: columns.length
    });

    return {
      data: primaryData,
      columns: columns
    };
  }, [groupData]);

  // Create trip info for InfoBar
  const tripInfo = useMemo(() => {
    if (!groupData?.logs || groupData.logs.length === 0) return null;

    const primaryLog = groupData.logs[0];
    const logData = normalizedLog?.data;
    
    // Calculate aggregate trip info
    let totalDistance = 0;
    let totalDuration = 0;
    let earliestStart = null;
    
    groupData.logs.forEach(log => {
      if (log.trip_distance_miles) {
        totalDistance += parseFloat(log.trip_distance_miles) || 0;
      }
      if (log.trip_duration_seconds) {
        totalDuration += parseFloat(log.trip_duration_seconds) || 0;
      }
      if (log.start_timestamp) {
        const startTime = new Date(log.start_timestamp * 1000);
        if (!earliestStart || startTime < earliestStart) {
          earliestStart = startTime;
        }
      }
    });

    return {
      file_name: `Trip Group ${groupId} (${groupData.logs.length} trips)`,
      start_time: earliestStart ? earliestStart.getTime() : (logData?.[0]?.timestamp || null),
      trip_distance_miles: totalDistance,
      trip_duration_seconds: totalDuration,
      row_count: logData?.length || 0,
      trip_group_id: groupId
    };
  }, [groupData, groupId, normalizedLog]);

  // Fetch trip group data
  useEffect(() => {
    if (!groupId) return;
    
    setLoading(true);
    setError(null);
    
    const fetchGroupData = async () => {
      try {
        console.log(`[TripGroupDetail] Fetching data for group ${groupId}`);
        
        const response = await fetch(`/api/trip-groups/${groupId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        console.log(`[TripGroupDetail] Received data:`, {
          logs: data.logs?.length || 0,
          logDataKeys: Object.keys(data.log_data || {}).length
        });

        // Validate data structure
        if (!data.logs || !Array.isArray(data.logs) || data.logs.length === 0) {
          throw new Error('Invalid group data: missing or empty logs array');
        }

        if (!data.log_data || typeof data.log_data !== 'object') {
          throw new Error('Invalid group data: missing or invalid log_data object');
        }

        setGroupData(data);

        // Set initial visible range after data is processed
        const primaryLog = data.logs[0];
        const primaryData = data.log_data[primaryLog?.log_id];
        
        if (Array.isArray(primaryData)) {
          const initialRange = getDefaultVisibleRange(primaryData, DEFAULT_WINDOW_SECONDS);
          console.log(`[TripGroupDetail] Setting initial range:`, initialRange);
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

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-lg">
          <div className="animate-spin w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          Loading trip group data...
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 text-center">
        <div className="text-red-400 text-lg font-semibold mb-2">Error Loading Trip Group</div>
        <div className="text-red-300 mb-4">{error}</div>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // No data state
  if (!normalizedLog || !normalizedLog.data || normalizedLog.data.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <div className="text-gray-400 text-lg">No trip group data available</div>
        <div className="text-gray-500 text-sm mt-2">
          Group ID: {groupId || 'Not specified'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info Bar */}
      <InfoBar 
        tripInfo={tripInfo} 
        groupLogs={groupData?.logs || []}
        logData={normalizedLog.data}
      />
      
      {/* Trip Chart */}
      <TripChart
        log={normalizedLog}
        selectedPIDs={selectedPIDs}
        onPIDChange={handlePIDChange}
        chartColors={chartColors}
        visibleRange={visibleRange}
        setVisibleRange={setVisibleRange}
        onChartZoom={handleChartZoom}
      />
      
      {/* Trip Map */}
      <TripMap
        primaryPath={normalizedLog.data}
        columns={['latitude', 'longitude', 'operating_state']}
        visibleRange={visibleRange}
        showDataPoints={true}
        multiRoute={false}
      />

      {/* Group Summary */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-cyan-400 mb-3">Trip Group Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-700 rounded p-3">
            <div className="text-gray-400 text-sm">Total Trips</div>
            <div className="text-xl font-bold text-white">{groupData?.logs?.length || 0}</div>
          </div>
          <div className="bg-gray-700 rounded p-3">
            <div className="text-gray-400 text-sm">Avg Distance</div>
            <div className="text-xl font-bold text-white">
              {groupData?.logs ? 
                (groupData.logs.reduce((sum, log) => sum + (parseFloat(log.trip_distance_miles) || 0), 0) / groupData.logs.length).toFixed(1) 
                : '0'} mi
            </div>
          </div>
          <div className="bg-gray-700 rounded p-3">
            <div className="text-gray-400 text-sm">Avg Duration</div>
            <div className="text-xl font-bold text-white">
              {groupData?.logs ? 
                Math.round(groupData.logs.reduce((sum, log) => sum + (parseInt(log.trip_duration_seconds) || 0), 0) / groupData.logs.length / 60)
                : '0'} min
            </div>
          </div>
          <div className="bg-gray-700 rounded p-3">
            <div className="text-gray-400 text-sm">Data Points</div>
            <div className="text-xl font-bold text-white">
              {normalizedLog.data.length.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
      
      {/* Debug Info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-800 rounded p-3 text-xs text-gray-400 font-mono">
          <div>Group ID: {groupId}</div>
          <div>Primary log: {groupData?.logs?.[0]?.log_id}</div>
          <div>Data points: {normalizedLog.data.length.toLocaleString()}</div>
          <div>Columns: {normalizedLog.columns.length} ({normalizedLog.columns.slice(0, 5).join(', ')}{normalizedLog.columns.length > 5 ? '...' : ''})</div>
          <div>Visible range: {visibleRange.min} - {visibleRange.max} ({visibleRange.max - visibleRange.min + 1} points)</div>
          <div>Selected PIDs: {selectedPIDs.filter(p => p && p !== 'none').join(', ')}</div>
        </div>
      )}
    </div>
  );
}