// --- VERSION 0.0.1 ---
// - Simple downsampling by picking evenly spaced points.

export function sampleData(dataArray, targetCount) {
  if (!Array.isArray(dataArray) || dataArray.length <= targetCount) return dataArray;
  const step = dataArray.length / targetCount;
  const sampled = [];
  for (let i = 0; i < targetCount; i++) {
    sampled.push(dataArray[Math.floor(i * step)]);
  }
  return sampled;
}
