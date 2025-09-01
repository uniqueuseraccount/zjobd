// FILE: frontend/src/components/pages/TripGroupDetail.js
//
// --- VERSION 0.5.0 ---
// - Shared visibleRange state for TripChart + CombinedChartMap sync.
// - Resets visibleRange when group changes.
// - ESLint-friendly null/array guards.
// - Uses DEFAULT_WINDOW_SECONDS from rangeUtils.js.

import React, { useState, useEffect } from 'react';
import TripChart from '../charts/TripChart';
import CombinedChartMap from '../charts/CombinedChartMap';
import { getDefaultVisibleRange, DEFAULT_WINDOW_SECONDS } from '../../utils/rangeUtils';

export default function TripGroupDetail({ logGroup, selectedPIDs, onPIDChange, chartColors }) {
  const [visibleRange, setVisibleRange] = useState({ min: 0, max: 0 });

  useEffect(() => {
    if (logGroup && Array.isArray(logGroup.data) && logGroup.data.length) {
      setVisibleRange(getDefaultVisibleRange(logGroup.data, DEFAULT_WINDOW_SECONDS));
    }
  }, [logGroup?.id, logGroup?.data?.length]);

  if (!logGroup || !Array.isArray(logGroup.data)) {
    return <div className="text-gray-400">No trip group selected</div>;
  }

  return (
    <div className="space-y-6">
      <TripChart
        log={logGroup}
        selectedPIDs={selectedPIDs}
        onPIDChange={onPIDChange}
        chartColors={chartColors}
        visibleRange={visibleRange}
        setVisibleRange={setVisibleRange}
      />

      <CombinedChartMap
        log={logGroup}
        selectedPIDs={selectedPIDs}
        chartColors={chartColors}
        visibleRange={visibleRange}
        setVisibleRange={setVisibleRange}
      />
    </div>
  );
}
