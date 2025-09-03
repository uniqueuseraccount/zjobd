// --- VERSION 0.9.0 ---
// - Restored full functionality from pre‑refactor version.
// - Fetches log data, trip info, and group logs from backend.
// - Passes PID state to TripChart and CombinedChartMap.
// - Displays InfoBar with trip/group info.

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import TripChart from '../charts/TripChart';
import CombinedChartMap from '../charts/CombinedChartMap';
import InfoBar from '../shared/InfoBar';
import { DEFAULT_WINDOW_SECONDS, getDefaultVisibleRange } from '../../utils/rangeUtils';

export default function LogDetail() {
  const { logId } = useParams();
  const [log, setLog] = useState(null);
  const [tripInfo, setTripInfo] = useState(null);
  const [groupLogs, setGroupLogs] = useState([]);
  const [visibleRange, setVisibleRange] = useState({ min: 0, max: 0 });

  const [selectedPIDs, setSelectedPIDs] = useState(['engine_rpm', 'vehicle_speed']);
  const chartColors = ['#FF4D4D', '#00E676'];

  const handlePIDChange = (index, value) => {
    const updated = [...selectedPIDs];
    updated[index] = value;
    setSelectedPIDs(updated);
  };

  useEffect(() => {
    if (!logId) return;
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
      });
  }, [logId]);

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
      />
      <CombinedChartMap
        log={log}
        selectedPIDs={selectedPIDs}
        chartColors={chartColors}
        visibleRange={visibleRange}
        setVisibleRange={setVisibleRange}
      />
    </div>
  );
}
