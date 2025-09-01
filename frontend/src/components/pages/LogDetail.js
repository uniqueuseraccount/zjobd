// FILE: frontend/src/components/pages/LogDetail.js
//
// --- VERSION 0.5.0 ---
// - Shared visibleRange state for TripChart + CombinedChartMap sync.
// - Resets visibleRange when log changes.
// - ESLint-friendly null/array guards.
// - Uses DEFAULT_WINDOW_SECONDS from rangeUtils.js.

import React, { useState, useEffect } from 'react';
import TripChart from '../charts/TripChart';
import CombinedChartMap from '../charts/CombinedChartMap';
import { getDefaultVisibleRange, DEFAULT_WINDOW_SECONDS } from '../../utils/rangeUtils';

export default function LogDetail({ log, selectedPIDs, onPIDChange, chartColors }) {
  const [visibleRange, setVisibleRange] = useState({ min: 0, max: 0 });

  useEffect(() => {
    if (log && Array.isArray(log.data) && log.data.length) {
      setVisibleRange(getDefaultVisibleRange(log.data, DEFAULT_WINDOW_SECONDS));
    }
  }, [log?.id, log?.data?.length]);

  if (!log || !Array.isArray(log.data)) {
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
