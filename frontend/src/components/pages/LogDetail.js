// FILE: frontend/src/components/pages/LogDetail.js
//
// --- VERSION 0.6.0 ---
// - Fetches log data from Flask using URL param.
// - Shared visibleRange state for TripChart + CombinedChartMap sync.
// - Resets visibleRange when log changes.
// - Uses DEFAULT_WINDOW_SECONDS from rangeUtils.js.

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import TripChart from '../charts/TripChart';
import CombinedChartMap from '../charts/CombinedChartMap';
import { getDefaultVisibleRange, DEFAULT_WINDOW_SECONDS } from '../../utils/rangeUtils';

export default function LogDetail({ selectedPIDs, onPIDChange, chartColors }) {
  const { logId } = useParams();
  const [log, setLog] = useState(null);
  const [visibleRange, setVisibleRange] = useState({ min: 0, max: 0 });

  useEffect(() => {
    if (!logId) return;
    fetch(`/api/logs/${logId}/data`)
      .then(res => res.json())
      .then(data => {
        setLog(data);
        setVisibleRange(getDefaultVisibleRange(data.data, DEFAULT_WINDOW_SECONDS));
      })
      .catch(err => {
        console.error('Error fetching log data:', err);
        setLog(null);
      });
  }, [logId]);

  if (!log) {
    return <div className="text-gray-400">No log selected</div>;
  }

  return (
    <div className="space-y-6">
      <TripChart
        log={log}
        selectedPIDs={selectedPIDs}
        onPIDChange={onPIDChange}
        chartColors={chartColors}
        visibleRange={visibleRange}
        setVisibleRange={setVisibleRange}
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
