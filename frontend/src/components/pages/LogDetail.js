// --- VERSION 0.5.2 ALPHA ---
// - Integrates InfoBar for trip/group info display.
// - Uses local PID state with PIDSelector in TripChart.
// - Shared visibleRange state via useVisibleRange hook.
// - Console logs for fetch lifecycle to aid debugging.

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import TripChart from '../charts/TripChart';
import CombinedChartMap from '../charts/CombinedChartMap';
import InfoBar from '../shared/InfoBar';
import { useVisibleRange } from '../../hooks/useVisibleRange';
import { DEFAULT_WINDOW_SECONDS, getDefaultVisibleRange } from '../../utils/rangeUtils';

export default function LogDetail() {
  const { logId } = useParams();
  const [log, setLog] = useState(null);
  const [tripInfo, setTripInfo] = useState(null);
  const [groupLogs, setGroupLogs] = useState([]);

  const [selectedPIDs, setSelectedPIDs] = useState(['engine_rpm', 'vehicle_speed']);
  const chartColors = ['#FF4D4D', '#00E676'];

  const { visibleRange, setVisibleRange, resetRange } = useVisibleRange([]);

  const handlePIDChange = (index, value) => {
    const updated = [...selectedPIDs];
    updated[index] = value;
    setSelectedPIDs(updated);
  };

  useEffect(() => {
    if (!logId) return;
    console.log(`[LogDetail] fetching /api/logs/${logId}/data`);
    fetch(`/api/logs/${logId}/data`)
      .then(res => res.json())
      .then(data => {
        console.log(`[LogDetail] loaded log ${logId} with ${Array.isArray(data?.data) ? data.data.length : 0} rows`);
        setLog({ data: data.data, columns: data.columns });
        setTripInfo(data.trip_info || null);
        setGroupLogs(data.group_logs || []);
        setVisibleRange(getDefaultVisibleRange(data.data, DEFAULT_WINDOW_SECONDS));
      })
      .catch(err => {
        console.error(`[LogDetail] Error fetching log ${logId}:`, err);
        setLog(null);
      });
  }, [logId, setVisibleRange]);

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
