// --- VERSION 0.3.0 ---
// - Enhanced InfoBar with proper data display and group linking
// - Shows filename, start time, duration, distance, row count, and group info

import React from 'react';
import { Link } from 'react-router-dom';

function formatDuration(seconds) {
  if (seconds == null || isNaN(seconds)) return '—';
  const rounded = Math.round(Number(seconds));
  const h = Math.floor(rounded / 3600);
  const m = Math.floor((rounded % 3600) / 60);
  const s = rounded % 60;
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatTimestamp(ts) {
  if (!ts) return 'Unknown';
  
  // Handle different timestamp formats
  if (typeof ts === 'string') {
    const date = new Date(ts);
    return isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString();
  }
  
  if (typeof ts === 'number') {
    // Handle both seconds and milliseconds
    const date = new Date(ts < 1e12 ? ts * 1000 : ts);
    return isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString();
  }
  
  return 'Unknown';
}

function formatDistance(miles) {
  if (miles == null || isNaN(miles)) return '—';
  return `${Number(miles).toFixed(2)} mi`;
}

export default function InfoBar({ tripInfo, groupLogs, logData }) {
  // Extract info from different possible sources
  const filename = tripInfo?.file_name || tripInfo?.filename || 'Unknown Log';
  const startTime = formatTimestamp(
    tripInfo?.start_time || 
    tripInfo?.start_timestamp || 
    (logData && logData.length > 0 ? logData[0]?.timestamp : null)
  );
  
  const distance = formatDistance(
    tripInfo?.distance_miles || 
    tripInfo?.trip_distance_miles
  );
  
  const duration = formatDuration(
    tripInfo?.trip_duration_seconds || 
    tripInfo?.duration_seconds ||
    tripInfo?.trip_duration
  );
  
  const rowCount = logData?.length || tripInfo?.row_count || '—';
  const formattedRowCount = typeof rowCount === 'number' ? `${rowCount.toLocaleString()} rows` : `${rowCount} rows`;

  // Group information
  const groupCount = Array.isArray(groupLogs) ? groupLogs.length : 0;
  const groupId = tripInfo?.trip_group_id;
  const hasGroup = groupCount >= 2 && groupId;

  return (
    <div className="bg-gray-700 text-gray-100 text-sm px-4 py-3 rounded-lg mb-4 flex justify-between items-center">
      <div className="flex flex-wrap items-center gap-6">
        <span className="font-semibold text-cyan-400">{filename}</span>
        <span className="text-gray-300">
          <span className="text-gray-500">Started:</span> {startTime}
        </span>
        <span className="text-gray-300">
          <span className="text-gray-500">Distance:</span> {distance}
        </span>
        <span className="text-gray-300">
          <span className="text-gray-500">Duration:</span> {duration}
        </span>
        <span className="text-gray-300">
          <span className="text-gray-500">Data points:</span> {formattedRowCount}
        </span>
      </div>
      
      <div className="flex items-center">
        {hasGroup ? (
          <Link 
            to={`/trip-groups/${groupId}`} 
            className="text-blue-400 hover:text-blue-300 hover:underline transition-colors flex items-center gap-1"
          >
            <span>Part of group ({groupCount} trips)</span>
            <span>→</span>
          </Link>
        ) : (
          <span className="text-gray-500">No trip group</span>
        )}
      </div>
    </div>
  );
}