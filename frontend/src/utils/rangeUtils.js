// --- VERSION 0.2.0 ---
// - Default window length constant.
// - getDefaultVisibleRange calculates index bounds from desired seconds.

export const DEFAULT_WINDOW_SECONDS = 60;

export function getDefaultVisibleRange(logData, desiredSeconds = DEFAULT_WINDOW_SECONDS) {
  if (!Array.isArray(logData) || logData.length === 0) {
    return { min: 0, max: 0 };
  }

  let intervalSec = 1;
  if (logData.length > 1 && logData[0].timestamp != null && logData[1].timestamp != null) {
    const t0 = Number(logData[0].timestamp);
    const t1 = Number(logData[1].timestamp);
    const diff = Math.abs(t1 - t0);
    intervalSec = diff > 1000 ? diff / 1000 : diff;
  }

  const pointsPerWindow = Math.max(1, Math.round(desiredSeconds / intervalSec));
  const maxIndex = Math.min(pointsPerWindow, logData.length - 1);

  return { min: 0, max: maxIndex };
}
