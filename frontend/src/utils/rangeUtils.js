// FILE: frontend/src/utils/rangeUtils.js
//
// --- VERSION 0.2.0 ---
// - Adds DEFAULT_WINDOW_SECONDS constant so you can change the default viewport length globally.
// - getDefaultVisibleRange uses this constant unless you override it.

export const DEFAULT_WINDOW_SECONDS = 60; // Change this to 30, 300, etc. to adjust globally

export function getDefaultVisibleRange(logData, desiredSeconds = DEFAULT_WINDOW_SECONDS) {
  if (!Array.isArray(logData) || logData.length === 0) {
    return { min: 0, max: 0 };
  }

  // Try to detect sampling interval from first two points
  let intervalSec = 1; // fallback
  if (logData.length > 1 && logData[0].timestamp != null && logData[1].timestamp != null) {
    const t0 = Number(logData[0].timestamp);
    const t1 = Number(logData[1].timestamp);
    const diff = Math.abs(t1 - t0);
    // If timestamps are in ms, convert to seconds
    intervalSec = diff > 1000 ? diff / 1000 : diff;
  }

  const pointsPerWindow = Math.max(1, Math.round(desiredSeconds / intervalSec));
  const maxIndex = Math.min(pointsPerWindow, logData.length - 1);

  return { min: 0, max: maxIndex };
}
