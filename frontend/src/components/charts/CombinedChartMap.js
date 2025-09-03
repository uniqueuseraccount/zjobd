// --- VERSION 0.9.0 ---
// - Displays TripMap as background with overlaid chart synced to visibleRange.
// - Click left/right halves to pan window.
// - Anchors y-scale to most variable PID in current window.

import React, { useMemo, useRef, useState } from 'react';
import TripMap from '../maps/TripMap';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import { getAverageHeading } from '../../utils/mapUtils';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, zoomPlugin);

export default function CombinedChartMap({
  log,
  selectedPIDs = [],
  chartColors = [],
  visibleRange = { min: 0, max: 0 },
  setVisibleRange = () => {},
  mapColumns = ['latitude', 'longitude', 'operating_state']
}) {
  const chartRef = useRef(null);
  const [animating, setAnimating] = useState(false);
  const dataRef = log?.data || [];

  const windowSize = Math.max(1, (visibleRange?.max ?? 0) - (visibleRange?.min ?? 0));

  const windowData = useMemo(() => {
    const min = Math.max(0, visibleRange?.min ?? 0);
    const max = Math.min((dataRef.length - 1), visibleRange?.max ?? 0);
    if (dataRef.length === 0 || max < min) return [];
    return dataRef.slice(min, max + 1);
  }, [dataRef, visibleRange]);

  const anchorPID = useMemo(() => {
    let maxVar = -Infinity;
    let pidName = null;
    (selectedPIDs || []).forEach(pid => {
      if (!pid || pid === 'none') return;
      const vals = windowData.map(r => r?.[pid]).filter(v => typeof v === 'number');
      if (!vals.length) return;
      const range = Math.max(...vals) - Math.min(...vals);
      if (range > maxVar) {
        maxVar = range;
        pidName = pid;
      }
    });
    return pidName;
  }, [windowData, selectedPIDs]);

  const anchorMedian = useMemo(() => {
    if (!anchorPID || windowData.length === 0) return 0;
    const vals = windowData.map(r => r?.[anchorPID]).filter(v => typeof v === 'number').sort((a, b) => a - b);
    if (vals.length === 0) return 0;
    const mid = Math.floor(vals.length / 2);
    return vals.length % 2 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
  }, [anchorPID, windowData]);

  const avgHeading = useMemo(() => {
    return getAverageHeading(windowData, mapColumns[0], mapColumns[1]) || 0;
  }, [windowData, mapColumns]);

  const chartData = useMemo(() => {
    const datasets = [];
    (selectedPIDs || []).forEach((pid, idx) => {
      if (!pid || pid === 'none') return;
      datasets.push({
        label: pid,
        data: windowData.map(row => row?.[pid]),
        borderColor: chartColors[idx] || '#38BDF8',
        pointRadius: 0,
        borderWidth: 2,
        tension: 0.4
      });
    });
    return {
      labels: windowData.map((_, i) => i),
      datasets
    };
  }, [windowData, selectedPIDs, chartColors]);

  const chartOptions = useMemo(() => {
    const allVals = (selectedPIDs || [])
      .filter(pid => pid && pid !== 'none')
      .flatMap(pid => windowData.map(r => r?.[pid]).filter(v => typeof v === 'number'));

    const minVal = allVals.length ? Math.min(...allVals) : 0;
    const maxVal = allVals.length ? Math.max(...allVals) : 1;
    const pad = (maxVal - minVal) * 0.1 || 1;

    const yMin = Math.min(minVal - pad, anchorMedian - pad);
    const yMax = Math.max(maxVal + pad, anchorMedian + pad);

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: animating ? 500 : 0 },
      plugins: {
        legend: { display: true, labels: { color: '#FFFFFF' } },
        zoom: { pan: { enabled: false }, zoom: { enabled: false } }
      },
      scales: {
        y: { type: 'linear', min: yMin, max: yMax, ticks: { color: '#9CA3AF' } },
        x: { ticks: { color: '#9CA3AF' } }
    }
  };
}, [windowData, selectedPIDs, anchorMedian, animating]);

const handlePanLeft = () => {
  if (!dataRef.length) return;
  setAnimating(true);
  const shift = Math.max(1, Math.floor(windowSize / 2));
  const min = Math.max(0, (visibleRange.min ?? 0) - shift);
  const max = min + windowSize;
  setVisibleRange({ min, max });
  setTimeout(() => setAnimating(false), 500);
};

const handlePanRight = () => {
  if (!dataRef.length) return;
  setAnimating(true);
  const shift = Math.max(1, Math.floor(windowSize / 2));
  const maxIdx = dataRef.length - 1;
  const max = Math.min(maxIdx, (visibleRange.max ?? 0) + shift);
  const min = Math.max(0, max - windowSize);
  setVisibleRange({ min, max });
  setTimeout(() => setAnimating(false), 500);
};

return (
  <div className="relative w-full aspect-square bg-gray-900 rounded-lg overflow-hidden">
    <div className="absolute inset-0 transition-transform duration-500" style={{ transform: `rotate(${avgHeading}deg)` }}>
      <TripMap
        primaryPath={windowData}
        columns={mapColumns}
        visibleRange={visibleRange}
        onBoundsRangeChange={() => {}}
        multiRoute={false}
      />
    </div>
    <div className="absolute bottom-0 left-0 w-full h-1/3 bg-black/40 backdrop-blur-sm">
      <Line ref={chartRef} options={chartOptions} data={chartData} />
      <div className="absolute top-0 left-0 h-full w-1/2 cursor-pointer" onClick={handlePanLeft} />
      <div className="absolute top-0 right-0 h-full w-1/2 cursor-pointer" onClick={handlePanRight} />
    </div>
  </div>
);
}
