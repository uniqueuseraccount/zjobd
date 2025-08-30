// FILE: frontend/src/LogDetail.js
//
// --- VERSION 1.9.7-ALPHA ---
// - REFACTOR: Extracted chart logic into new TripChart.js component.
// - CLEANUP: Removed inline PidSelector, chartData, chartOptions, and chart JSX.
// - BEHAVIOR: Chart→map sync preserved, map→chart sync disabled to prevent snap-back.
//

import React, { useState, useEffect, } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import TripChart from './TripChart';
import TripMap from './TripMap';

const CHART_COLORS = ['#38BDF8', '#F59E0B', '#4ADE80', '#F472B6', '#A78BFA'];
const COMPARISON_COLORS = ['#0284C7', '#B45309', '#16A34A', '#DB2777', '#7C3AED'];

function LogDetail() {
  const { logId } = useParams();
  const [log, setLog] = useState(null);
  const [selectedPIDs, setSelectedPIDs] = useState([
    'engine_rpm',
    'vehicle_speed',
    'none',
    'none',
    'none'
  ]);
  const [comparisonLog, setComparisonLog] = useState(null);
  const [visibleRange, setVisibleRange] = useState({ min: 0, max: 0 });

  useEffect(() => {
    const fetchLog = async () => {
      try {
        const response = await axios.get(`http://localhost:5001/api/logs/${logId}/data`);
        setLog(response.data);
        if (response.data.data.length > 0) {
          setVisibleRange({ min: 0, max: response.data.data.length - 1 });
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchLog();
    setComparisonLog(null);
  }, [logId]);

  const handlePidChange = (index, value) => {
    const newPids = [...selectedPIDs];
    newPids[index] = value === 'none' ? 'none' : value;
    setSelectedPIDs(newPids);
  };

  const handleComparisonSelect = async (newLogId) => {
    if (!newLogId || newLogId === 'none') {
      setComparisonLog(null);
      return;
    }
    const response = await axios.get(`http://localhost:5001/api/logs/${newLogId}/data`);
    setComparisonLog(response.data);
  };

  const handleMapBoundsRangeChange = ({ min, max }) => {
    // Map→chart sync intentionally disabled for now to prevent snap-back
    // This function remains in case we re-enable two-way sync later
  };

  if (!log) return <p className="text-center">Loading log data...</p>;

  return (
    <div className="space-y-6">
      {/* Trip Info Header */}
      <div className="bg-gray-800 p-4 rounded-lg shadow-xl text-sm">
        <h2 className="text-xl font-bold text-cyan-400">{log.trip_info.file_name}</h2>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-gray-300 mt-2 items-center">
          <span>
            Length: <span className="font-mono">{log.data.length} rows</span>
          </span>
          <span>
            Trip Start:{' '}
            <span className="font-mono">
              {new Date(log.data[0].timestamp * 1000).toLocaleString()}
            </span>
          </span>
          <span>
            Duration:{' '}
            <span className="font-mono">
              {Math.floor(log.trip_info.trip_duration_seconds / 60)}m{' '}
              {Math.round(log.trip_info.trip_duration_seconds % 60)}s
            </span>
          </span>
          <span>
            Distance:{' '}
            <span className="font-mono">
              {log.trip_info.distance_miles
                ? log.trip_info.distance_miles.toFixed(2)
                : 'N/A'}{' '}
              miles
            </span>
          </span>
          {log.group_logs.length > 1 && (
            <div className="flex items-center space-x-2">
              <span>
                Group:{' '}
                <Link
                  to={`/trip-groups/${log.trip_info.trip_group_id}`}
                  className="text-cyan-400 hover:underline"
                >
                  [{log.group_logs.length} Logs]
                </Link>
              </span>
              <select
                onChange={(e) => handleComparisonSelect(e.target.value)}
                className="bg-gray-700 text-white p-1 rounded-md text-xs"
              >
                <option value="none">-- Compare With --</option>
                {log.group_logs
                  .filter((gl) => gl.log_id !== parseInt(logId))
                  .map((gl) => (
                    <option key={gl.log_id} value={gl.log_id}>
                      {new Date(gl.start_timestamp * 1000).toLocaleDateString()}
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <TripChart
        log={log}
        comparisonLog={comparisonLog}
        selectedPIDs={selectedPIDs}
        onPIDChange={handlePidChange}
        chartColors={CHART_COLORS}
        comparisonColors={COMPARISON_COLORS}
        visibleRange={visibleRange}
        setVisibleRange={setVisibleRange}
      />

      {/* Map */}
      <div className="bg-gray-800 rounded-lg shadow-xl p-4 h-[60vh]">
        <TripMap
          primaryPath={log?.data || []}
          comparisonPath={comparisonLog?.data || []}
          columns={log?.columns || []}
          visibleRange={visibleRange}
          multiRoute={false}
          onBoundsRangeChange={handleMapBoundsRangeChange}
        />
      </div>
    </div>
  );
}

export default LogDetail;