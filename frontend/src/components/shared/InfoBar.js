// --- VERSION 0.2.1 ---
// - Displays trip metadata and group log count.

import React from 'react';
import { Link } from 'react-router-dom';

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatTimestamp(ts) {
  const d = new Date(ts);
  return d.toLocaleString();
}

export default function InfoBar({ tripInfo, groupLogs }) {
  const filename = tripInfo?.file_name || 'Unknown';
  const startTime = tripInfo?.start_time ? formatTimestamp(tripInfo.start_time) : 'Unknown';
  const distance = tripInfo?.distance_miles != null ? `${tripInfo.distance_miles} mi` : '—';
  const duration = tripInfo?.trip_duration_seconds != null ? formatDuration(tripInfo.trip_duration_seconds) : '—';
  const rowCount = tripInfo?.row_count != null ? `${tripInfo.row_count} rows` : '—';
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
      {groupId && (
        <Link to={`/trip-groups/${groupId}`} className="text-blue-400 hover:underline">
          View Group →
        </Link>
      )}
    </div>
  );
}
