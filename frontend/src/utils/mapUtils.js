// FILE: frontend/src/utils/mapUtils.js
//
// --- VERSION 0.1.0 ---
// - Provides getAverageHeading for CombinedChartMap.
// - Heading is in degrees, 0 = north, 90 = east, etc.

export function getAverageHeading(data, latKey = 'latitude', lonKey = 'longitude') {
  if (!data || data.length < 2) return 0;

  let totalHeading = 0;
  let count = 0;

  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1];
    const curr = data[i];
    if (
      typeof prev[latKey] !== 'number' ||
      typeof prev[lonKey] !== 'number' ||
      typeof curr[latKey] !== 'number' ||
      typeof curr[lonKey] !== 'number'
    ) continue;

    const dLon = (curr[lonKey] - prev[lonKey]) * (Math.PI / 180);
    const y = Math.sin(dLon) * Math.cos(curr[latKey] * Math.PI / 180);
    const x =
      Math.cos(prev[latKey] * Math.PI / 180) * Math.sin(curr[latKey] * Math.PI / 180) -
      Math.sin(prev[latKey] * Math.PI / 180) * Math.cos(curr[latKey] * Math.PI / 180) * Math.cos(dLon);

    let heading = Math.atan2(y, x) * (180 / Math.PI);
    if (heading < 0) heading += 360;

    totalHeading += heading;
    count++;
  }

  return count > 0 ? totalHeading / count : 0;
}
