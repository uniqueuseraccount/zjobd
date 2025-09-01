// FILE: frontend/src/components/charts/CombinedChartMap.js
//
// --- VERSION 0.4.0-ALPHA ---
// - Map background, chart overlay at bottom 1/3 height.
// - Fixed 30s window (~10 points), no sampling.
// - Rotates map so log time flows left→right.
// - Midline anchoring to median of anchor PID.
// - Click-to-pan left/right with smooth animation.
//

import React, { useMemo, useRef, useState } from 'react';
import TripMap from '../maps/TripMap';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import { getAverageHeading } from '../../utils/mapUtils';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, zoomPlugin);

export default function CombinedChartMap({
  log,
  selectedPIDs,
  chartColors,
  visibleRange,
  setVisibleRange,
  mapColumns = ['latitude', 'longitude', 'operating_state']
}) {
  const chartRef = useRef(null);
  const [animating, setAnimating] = useState(false);

  const windowSize = visibleRange.max - visibleRange.min;

  // Slice current 30s window
  const windowData = useMemo(() => {
    if (!log?.data) return [];
    return log.data.slice(visibleRange.min, visibleRange.max + 1);
  }, [log, visibleRange]);

  // Anchor PID = most variable PID in current selection
  const anchorPID = useMemo(() => {
    if (!log?.data) return null;
    let maxVar = -Infinity;
    let pidName = null;
    selectedPIDs.forEach(pid => {
      if (pid === 'none') return;
      const vals = log.data.map(r => r[pid]).filter(v => typeof v === 'number');
      if (!vals.length) return;
      const range = Math.max(...vals) - Math.min(...vals);
      if (range > maxVar) {
        maxVar = range;
        pidName = pid;
      }
    });
    return pidName;
  }, [log, selectedPIDs]);

  // Median of anchor PID in current window
  const anchorMedian = useMemo(() => {
    if (!anchorPID || !windowData.length) return 0;
    const vals = windowData.map(r => r[anchorPID]).filter(v => typeof v === 'number').sort((a, b) => a - b);
    const mid = Math.floor(vals.length / 2);
    return vals.length % 2 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
  }, [anchorPID, windowData]);

  // Average heading for rotation
  const avgHeading = useMemo(() => {
    return getAverageHeading(windowData, mapColumns[0], mapColumns[1]);
  }, [windowData, mapColumns]);

  // Chart datasets
  const chartData = useMemo(() => {
    if (!log?.data) return { datasets: [] };
    const datasets = [];
    selectedPIDs.forEach((pid, idx) => {
      if (pid === 'none') return;
      datasets.push({
        label: pid,
        data: windowData.map(row => row[pid]),
        borderColor: chartColors[idx],
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

  // Chart options with midline anchoring
  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: animating ? 500 : 0 },
    plugins: {
      legend: { display: true, labels: { color: '#FFFFFF' } },
      zoom: { pan: { enabled: false }, zoom: { enabled: false } }
    },
    scales: {
      y: {
        type: 'logarithmic',
        min: Math.min(anchorMedian / 10, ...windowData.map(r => Math.min(...selectedPIDs.map(pid => r[pid] || Infinity)))),
        max: Math.max(anchorMedian * 10, ...windowData.map(r => Math.max(...selectedPIDs.map(pid => r[pid] || -Infinity)))),
        ticks: { color: '#9CA3AF' }
      },
      x: { ticks: { color: '#9CA3AF' } }
    }
  }), [windowData, selectedPIDs, anchorMedian, animating]);

  // Click-to-pan handlers
  const handlePanLeft = () => {
    if (!log?.data) return;
    setAnimating(true);
    const shift = Math.floor(windowSize / 2);
    setVisibleRange({
      min: Math.max(0, visibleRange.min - shift),
      max: Math.max(windowSize, visibleRange.max - shift)
    });
    setTimeout(() => setAnimating(false), 500);
  };

  const handlePanRight = () => {
    if (!log?.data) return;
    setAnimating(true);
    const shift = Math.floor(windowSize / 2);
    const maxIndex = log.data.length - 1;
    setVisibleRange({
      min: Math.min(maxIndex - windowSize, visibleRange.min + shift),
      max: Math.min(maxIndex, visibleRange.max + shift)
    });
    setTimeout(() => setAnimating(false), 500);
  };

  return (
    <div className="relative w-full aspect-square bg-gray-900 rounded-lg overflow-hidden">
      {/* Map background */}
      <div className="absolute inset-0 transition-transform duration-500" style={{ transform: `rotate(${avgHeading}deg)` }}>
        <TripMap
          primaryPath={windowData}
          columns={mapColumns}
          rotation={avgHeading}
          visibleRange={visibleRange}
          onBoundsRangeChange={() => {}}
          multiRoute={false}
        />
      </div>

      {/* Chart overlay */}
      <div className="absolute bottom-0 left-0 w-full h-1/3 bg-black/40 backdrop-blur-sm">
        <Line ref={chartRef} options={chartOptions} data={chartData} />
        {/* Click zones */}
        <div className="absolute top-0 left-0 h-full w-1/2 cursor-pointer" onClick={handlePanLeft} />
        <div className="absolute top-0 right-0 h-full w-1/2 cursor-pointer" onClick={handlePanRight} />
      </div>
    </div>
  );
}
