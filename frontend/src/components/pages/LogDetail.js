// --- VERSION 0.9.1 ---
// - Restored full functionality from pre‑refactor version.
// - Fetches log data, trip info, and group logs from backend.
// - Passes PID state to TripChart and CombinedChartMap.
// - Displays InfoBar with trip/group info.

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import TripChart from '../charts/TripChart';
import TripMap from '../maps/TripMap';
import InfoBar from '../shared/InfoBar';
import { DEFAULT_WINDOW_SECONDS, getDefaultVisibleRange } from '../../utils/rangeUtils';

export default function LogDetail() {
  const { logId } = useParams();
  const [log, setLog] = useState(null);
  const [tripInfo, setTripInfo] = useState(null);
  const [groupLogs, setGroupLogs] = useState([]);
  const [visibleRange, setVisibleRange] = useState({ min: 0, max: 0 });
  const [loading, setLoading] = useState(false);

  const [selectedPIDs, setSelectedPIDs] = useState([
    'engine_rpm',
    'vehicle_speed',
    'maf',
    'throttle_position',
    'coolant_temp'
  ]);
  const chartColors = ['#FF4D4D', '#00E676', '#38BDF8', '#F59E0B', '#A78BFA'];

  const handlePIDChange = (index, value) => {
    const updated = [...selectedPIDs];
    updated[index] = value;
    setSelectedPIDs(updated);
  };

  useEffect(() => {
    if (!logId) return;
    setLoading(true);
    fetch(`/api/logs/${logId}/data`)
      .then(res => res.json())
      .then(data => {
        setLog({ data: data.data, columns: data.columns });
        setTripInfo(data.trip_info || null);
        setGroupLogs(data.group_logs || []);
        setVisibleRange(getDefaultVisibleRange(data.data, DEFAULT_WINDOW_SECONDS));
      })
      .catch(err => {
        console.error(`[LogDetail] Error fetching log ${logId}:`, err);
        setLog(null);
      })
      .finally(() => setLoading(false));
  }, [logId]);

  if (loading) return <div className="text-gray-400">Loading log...</div>;
  if (!log) return <div className="text-gray-400">No log selected</div>;

  return (
    <div className="space-y-4">
      <InfoBar tripInfo={tripInfo} groupLogs={groupLogs} />
      <TripChart
        log={log}
        selectedPIDs={selectedPIDs}
        onPIDChange={handlePIDChange}
        chartColors={chartColors}
        visibleRange={visibleRange}
        setVisibleRange={setVisibleRange}
      />
      <TripMap
        primaryPath={log.data}
        columns={['latitude', 'longitude', 'operating_state']}
        visibleRange={visibleRange}
        onBoundsRangeChange={() => {}}
        multiRoute={false}
      />
    </div>
  );
}
