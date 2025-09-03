// --- VERSION 0.5.1 ALPHA ---
// - Fetches trip group by URL param (proxy-aware).
// - Adapts backend payload to a pseudo-log { data, columns } for charts.
// - Local PID state; shared visibleRange.
// - Console logs for fetch lifecycle.

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import TripChart from '../charts/TripChart';
import CombinedChartMap from '../charts/CombinedChartMap';
import { getDefaultVisibleRange, DEFAULT_WINDOW_SECONDS } from '../../utils/rangeUtils';

export default function TripGroupDetail() {
  const { groupId } = useParams();
  const [groupPayload, setGroupPayload] = useState(null);
  const [visibleRange, setVisibleRange] = useState({ min: 0, max: 0 });

  const [selectedPIDs, setSelectedPIDs] = useState(['engine_rpm', 'vehicle_speed']);
  const chartColors = ['#FF4D4D', '#00E676'];

  const handlePIDChange = (index, value) => {
    const updated = [...selectedPIDs];
    updated[index] = value;
    setSelectedPIDs(updated);
  };

  useEffect(() => {
    if (!groupId) return;
    console.log(`[TripGroupDetail] fetching /api/trip-groups/${groupId}`);
    fetch(`/api/trip-groups/${groupId}`)
      .then(res => res.json())
      .then(data => {
        const logs = data?.logs || [];
        const logDataMap = data?.log_data || {};
        // Pick first log in group as primary for charts
        const primaryId = logs[0]?.log_id;
        const primaryData = primaryId ? (logDataMap[primaryId] || []) : [];
        const columns = primaryData.length ? Object.keys(primaryData[0]) : ['timestamp','operating_state'];
        const pseudoLog = { data: primaryData, columns };
        console.log(`[TripGroupDetail] group ${groupId} logs=${logs.length}, primary rows=${primaryData.length}`);
        setGroupPayload({ pseudoLog, raw: data });
        setVisibleRange(getDefaultVisibleRange(primaryData, DEFAULT_WINDOW_SECONDS));
      })
      .catch(err => {
        console.error(`[TripGroupDetail] Error fetching group ${groupId}:`, err);
        setGroupPayload(null);
      });
  }, [groupId]);

  const log = useMemo(() => groupPayload?.pseudoLog || null, [groupPayload]);

  if (!log) return <div className="text-gray-400">No trip group selected</div>;

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
