// --- VERSION 0.2.0 ---
// - Displays trip metadata and group log count.

import React from 'react';

export default function InfoBar({ tripInfo, groupLogs }) {
  return (
    <div className="bg-gray-700 text-gray-100 text-sm px-3 py-2 flex justify-between">
      {tripInfo ? (
        <>
          <span>{tripInfo.file_name}</span>
          <span>{tripInfo.distance_miles} mi</span>
          <span>{tripInfo.trip_duration_seconds}s</span>
        </>
      ) : (
        <span>No trip info</span>
      )}
      {Array.isArray(groupLogs) && groupLogs.length > 0 && (
        <span>{groupLogs.length} logs in group</span>
      )}
    </div>
  );
}
