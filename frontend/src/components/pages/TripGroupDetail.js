// FILE: frontend/src/components/pages/TripGroupDetail.js
//
// --- VERSION 0.6.0 ---
// - Fetches trip group data from Flask using URL param.
// - Shared visibleRange state for TripChart + CombinedChartMap sync.
// - Resets visibleRange when group changes.
// - Uses DEFAULT_WINDOW_SECONDS from rangeUtils.js.

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import TripChart from '../charts/TripChart';
import CombinedChartMap from '../charts/CombinedChartMap';
import { getDefaultVisibleRange, DEFAULT_WINDOW_SECONDS } from '../../utils/rangeUtils';

export default function TripGroupDetail({ selectedPIDs, onPIDChange, chartColors }) {
  const { groupId } = useParams();
  const [logGroup, setLogGroup] = useState(null);
  const [visibleRange, setVisibleRange] = useState({ min: 0, max: 0 });

  useEffect(() => {
    if (!groupId) return;
    fetch(`/api/trip-groups/${groupId}`)
      .then(res => res.json())
      .then(data => {
        setLogGroup(data);
        setVisibleRange(getDefaultVisibleRange(data.data, DEFAULT_WINDOW_SECONDS));
      })
      .catch(err => {
        console.error('Error fetching trip group data:', err);
        setLogGroup(null);
      });
  }, [groupId]);

  if (!logGroup) {
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
