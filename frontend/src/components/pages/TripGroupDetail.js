// --- VERSION 0.9.0 ---
// - Restored full functionality from pre‑refactor version.
// - Fetches trip group data, normalizes to pseudo‑log for charts.
// - Passes PID state to TripChart and CombinedChartMap.
// - Displays InfoBar with group info.

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import TripChart from '../charts/TripChart';
import CombinedChartMap from '../charts/CombinedChartMap';
import InfoBar from '../shared/InfoBar';
import { DEFAULT_WINDOW_SECONDS, getDefaultVisibleRange } from '../../utils/rangeUtils';

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
    fetch(`/api/trip-groups/${groupId}`)
      .then(res => res.json())
      .then(data => {
        const logs = data?.logs || [];
        const logDataMap = data?.log_data || {};
        const primaryId = logs[0]?.log_id;
        const primaryData = primaryId ? (logDataMap[primaryId] || []) : [];
        const columns = primaryData.length ? Object.keys(primaryData[0]) : [];
        const pseudoLog = { data: primaryData, columns };
        setGroupPayload({ pseudoLog, tripInfo: null, groupLogs: logs });
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
