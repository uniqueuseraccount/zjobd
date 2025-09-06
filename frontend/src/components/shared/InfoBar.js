// --- VERSION 0.2.5 ---
// - Displays trip metadata and group log count.

import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

function formatDuration(seconds) {
  if (seconds == null) return '—';
  const rounded = Math.round(seconds);
  const h = Math.floor(rounded / 3600);
  const m = Math.floor((rounded % 3600) / 60);
  const s = rounded % 60;
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatTimestamp(ts) {
  if (!ts) return 'Unknown';
  if (typeof ts === 'string' && !isNaN(Date.parse(ts))) {
    return new Date(ts).toLocaleString();
  }
  if (typeof ts === 'number') {
    return new Date(ts < 1e12 ? ts * 1000 : ts).toLocaleString();
  }
  return 'Unknown';
}

export default function InfoBar({ tripInfo, groupLogs }) {
  // Debug log to inspect incoming values
  useEffect(() => {
    console.log('[InfoBar] tripInfo received:', tripInfo);
    if (tripInfo) {
      console.log('[InfoBar] start_time:', tripInfo.start_time);
      console.log('[InfoBar] timestamp:', tripInfo.timestamp);
    }
  }, [tripInfo]);

  const filename = tripInfo?.file_name || 'Unknown';
  const startTime = formatTimestamp(tripInfo?.start_time || tripInfo?.timestamp);
  const distance = tripInfo?.distance_miles != null
    ? `${Number(tripInfo.distance_miles).toFixed(2)} mi`
    : '—';
  const duration = formatDuration(tripInfo?.trip_duration_seconds);
  const rowCount = tripInfo?.row_count != null ? `${tripInfo.row_count} rows` : '—';

  const groupCount = Array.isArray(groupLogs) ? groupLogs.length : 0;
  const groupId = tripInfo?.trip_group_id;

  return (
    <div className="bg-gray-700 text-gray-100 text-sm px-3 py-2 flex justify-between items-center">
      <div className="space-x-4">
        <span className="font-semibold">{filename}</span>
        <span>{startTime}</span>
        <span>{distance}</span>
        <span>{duration}</span>
        <span>{rowCount}</span>
      </div>
      {groupCount >= 2 && groupId ? (
        <Link to={`/trip-groups/${groupId}`} className="text-blue-400 hover:underline">
          Part of group ({groupCount} logs) →
        </Link>
      ) : (
        <span className="text-gray-400">No trip group</span>
      )}
    </div>
  );
}
