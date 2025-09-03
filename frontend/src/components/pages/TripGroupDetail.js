// --- VERSION 0.5.2 ALPHA---
// - Integrates InfoBar for trip/group info display.
// - Normalizes trip group payload to pseudo-log for charts.
// - Uses local PID state with PIDSelector in TripChart.
// - Shared visibleRange state via useVisibleRange hook.
// - Console logs for fetch lifecycle to aid debugging.

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import TripChart from '../charts/TripChart';
import CombinedChartMap from '../charts/CombinedChartMap';
import InfoBar from '../shared/InfoBar';
import { useVisibleRange } from '../../hooks/useVisibleRange';
import { DEFAULT_WINDOW_SECONDS, getDefaultVisibleRange } from '../../utils/rangeUtils';

export default function TripGroupDetail() {
  const { groupId } = useParams();
  const [groupPayload, setGroupPayload] = useState(null);

  const [selectedPIDs, setSelectedPIDs] = useState(['engine_rpm', 'vehicle_speed']);
  const chartColors = ['#FF4D4D', '#00E676'];

  const { visibleRange, setVisibleRange } = useVisibleRange([]);

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
        const primaryId = logs[0]?.log_id;
        const primaryData = primaryId ? (logDataMap[primaryId] || []) : [];
        const columns = primaryData.length ? Object.keys(primaryData[0]) : [];
        const pseudoLog = { data: primaryData, columns };
        console.log(`[TripGroupDetail] group ${groupId} logs=${logs.length}, primary rows=${primaryData.length}`);
        setGroupPayload({ pseudoLog, tripInfo: null, groupLogs: logs });
        setVisibleRange(getDefaultVisibleRange(primaryData, DEFAULT_WINDOW_SECONDS));
      })
      .catch(err => {
        console.error(`[TripGroupDetail] Error fetching group ${groupId}:`, err);
        setGroupPayload(null);
      });
  }, [groupId, setVisibleRange]);

  const log = useMemo(() => groupPayload?.pseudoLog || null, [groupPayload]);

  if (!log) return <div className="text-gray-400">No trip group selected</div>;

  return (
    <div className="space-y-4">
      <InfoBar tripInfo={groupPayload?.tripInfo} groupLogs={groupPayload?.groupLogs} />
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
