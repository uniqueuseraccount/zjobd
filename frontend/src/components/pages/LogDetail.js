// --- VERSION 1.0.0 ---
// - Enhanced LogDetail with proper data fetching and state management
// - Synchronized chart and map interaction
// - Proper error handling and loading states

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import TripChart from '../charts/TripChart';
import TripMap from '../maps/TripMap';
import InfoBar from '../shared/InfoBar';
import { DEFAULT_WINDOW_SECONDS, getDefaultVisibleRange } from '../../utils/rangeUtils';

export default function LogDetail() {
  const { logId } = useParams();
  
  // State management
  const [log, setLog] = useState(null);
  const [tripInfo, setTripInfo] = useState(null);
  const [groupLogs, setGroupLogs] = useState([]);
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

  // Fetch log data
  useEffect(() => {
    if (!logId) return;
    
    setLoading(true);
    setError(null);
    
    const fetchLogData = async () => {
      try {
        console.log(`[LogDetail] Fetching data for log ${logId}`);
        
        const response = await fetch(`/api/logs/${logId}/data`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        console.log(`[LogDetail] Received data:`, {
          dataPoints: data.data?.length || 0,
          columns: data.columns?.length || 0,
          tripInfo: !!data.trip_info,
          groupLogs: data.group_logs?.length || 0
        });

        // Validate data structure
        if (!data.data || !Array.isArray(data.data)) {
          throw new Error('Invalid data format: missing or invalid data array');
        }

        if (!data.columns || !Array.isArray(data.columns)) {
          throw new Error('Invalid data format: missing or invalid columns array');
        }

        // Set the log data
        const logData = {
          data: data.data,
          columns: data.columns
        };

        setLog(logData);
        setTripInfo(data.trip_info || null);
        setGroupLogs(data.group_logs || []);
        
        // Set initial visible range
        const initialRange = getDefaultVisibleRange(data.data, DEFAULT_WINDOW_SECONDS);
        console.log(`[LogDetail] Setting initial range:`, initialRange);
        setVisibleRange(initialRange);

      } catch (err) {
        console.error(`[LogDetail] Error fetching log ${logId}:`, err);
        setError(err.message);
        setLog(null);
        setTripInfo(null);
        setGroupLogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLogData();
  }, [logId]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-lg">
          <div className="animate-spin w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          Loading log data...
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 text-center">
        <div className="text-red-400 text-lg font-semibold mb-2">Error Loading Log</div>
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

  // No log state
  if (!log || !log.data || log.data.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <div className="text-gray-400 text-lg">No log data available</div>
        <div className="text-gray-500 text-sm mt-2">
          Log ID: {logId || 'Not specified'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info Bar */}
      <InfoBar 
        tripInfo={tripInfo} 
        groupLogs={groupLogs}
        logData={log.data}
      />
      
      {/* Trip Chart */}
      <TripChart
        log={log}
        selectedPIDs={selectedPIDs}
        onPIDChange={handlePIDChange}
        chartColors={chartColors}
        visibleRange={visibleRange}
        setVisibleRange={setVisibleRange}
        onChartZoom={handleChartZoom}
      />
      
      {/* Trip Map */}
      <TripMap
        primaryPath={log.data}
        columns={['latitude', 'longitude', 'operating_state']}
        visibleRange={visibleRange}
        showDataPoints={true}
        multiRoute={false}
      />
      
      {/* Debug Info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-800 rounded p-3 text-xs text-gray-400 font-mono">
          <div>Log ID: {logId}</div>
          <div>Data points: {log.data.length.toLocaleString()}</div>
          <div>Columns: {log.columns.length} ({log.columns.slice(0, 5).join(', ')}{log.columns.length > 5 ? '...' : ''})</div>
          <div>Visible range: {visibleRange.min} - {visibleRange.max} ({visibleRange.max - visibleRange.min + 1} points)</div>
          <div>Selected PIDs: {selectedPIDs.filter(p => p && p !== 'none').join(', ')}</div>
        </div>
      )}
    </div>
  );
}