// --- VERSION 0.1.0 ---
// - getAverageHeading calculates mean compass heading for a path.

export function getAverageHeading(data, latKey = 'latitude', lonKey = 'longitude') {
  if (!Array.isArray(data) || data.length < 2) return 0;
  let sumX = 0;
  let sumY = 0;
  let count = 0;

  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1];
    const curr = data[i];
    const lat1 = prev?.[latKey];
    const lon1 = prev?.[lonKey];
    const lat2 = curr?.[latKey];
    const lon2 = curr?.[lonKey];
    if ([lat1, lon1, lat2, lon2].some(v => typeof v !== 'number')) continue;

    const dLon = (lon2 - lon1) * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
    const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
              Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
    const heading = Math.atan2(y, x) * 180 / Math.PI;
    sumX += Math.cos(heading * Math.PI / 180);
    sumY += Math.sin(heading * Math.PI / 180);
    count++;
  }

  if (count === 0) return 0;
  const avg = Math.atan2(sumY / count, sumX / count) * 180 / Math.PI;
  return (avg + 360) % 360;
}
