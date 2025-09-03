// --- VERSION 0.5.1 ALPHA ---
// - Fetches log data by URL param (proxy-aware).
// - Local PID state (self-contained).
// - Shared visibleRange for TripChart + CombinedChartMap.
// - Console logs for fetch lifecycle to aid program_logs correlation.

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import TripChart from '../charts/TripChart';
import CombinedChartMap from '../charts/CombinedChartMap';
import { getDefaultVisibleRange, DEFAULT_WINDOW_SECONDS } from '../../utils/rangeUtils';

export default function LogDetail() {
  const { logId } = useParams();
  const [log, setLog] = useState(null);
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
    console.log(`[LogDetail] fetching /api/logs/${logId}/data`);
    fetch(`/api/logs/${logId}/data`)
      .then(res => res.json())
      .then(data => {
        console.log(`[LogDetail] loaded log ${logId} with ${Array.isArray(data?.data) ? data.data.length : 0} rows`);
        setLog(data);
        setVisibleRange(getDefaultVisibleRange(data?.data || [], DEFAULT_WINDOW_SECONDS));
      })
      .catch(err => {
        console.error(`[LogDetail] Error fetching log ${logId}:`, err);
        setLog(null);
      });
  }, [logId]);

  if (!log) return <div className="text-gray-400">No log selected</div>;

  return (
    <div className="space-y-6">
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
