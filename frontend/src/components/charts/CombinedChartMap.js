// FILE: frontend/src/components/charts/CombinedChartMap.js
//
// --- VERSION 0.1.0-ALPHA ---
// - NEW: Combined chart + map view for fixed time window analysis.
// - CURRENT: Static layout, chart + map stacked vertically.
// - NEXT: Add rotation, midline alignment, click-to-pan, and PID sync.
//

import React, { useState, useMemo, useRef } from 'react';
import TripMap from '../maps/TripMap';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, zoomPlugin);

export default function CombinedChartMap({
  log,                // { data, columns }
  selectedPIDs,       // array of PID names
  chartColors,        // array of colors for PIDs
  visibleRange,       // { min, max }
  setVisibleRange,    // function to update range
  mapColumns = ['latitude', 'longitude', 'operating_state']
}) {
  const chartRef = useRef(null);
  const [windowSize] = useState(30); // seconds — fixed for now

  // Filter data for current visible range
  const windowData = useMemo(() => {
    if (!log || !log.data) return [];
    const startIndex = visibleRange.min;
    const endIndex = visibleRange.max;
    return log.data.slice(startIndex, endIndex + 1);
  }, [log, visibleRange]);

  // Build chart datasets
  const chartData = useMemo(() => {
    if (!log || !log.data) return { datasets: [] };
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
  }, [log, selectedPIDs, chartColors, windowData]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: true, labels: { color: '#FFFFFF' } },
      zoom: {
        pan: { enabled: false },
        zoom: { enabled: false }
      }
    },
    scales: {
      x: { ticks: { color: '#9CA3AF' } },
      y: { ticks: { color: '#9CA3AF' } }
    }
  }), []);
  // Click handlers for left/right navigation
  const handlePanLeft = () => {
    const shift = Math.floor(windowSize / 2);
    setVisibleRange({
      min: Math.max(0, visibleRange.min - shift),
      max: Math.max(windowSize, visibleRange.max - shift)
    });
  };

  const handlePanRight = () => {
    const shift = Math.floor(windowSize / 2);
    const maxIndex = log.data.length - 1;
    setVisibleRange({
      min: Math.min(maxIndex - windowSize, visibleRange.min + shift),
      max: Math.min(maxIndex, visibleRange.max + shift)
    });
  };

  return (
    <div className="bg-gray-900 rounded-lg shadow-xl overflow-hidden">
      {/* Chart Section */}
      <div className="h-[60vh] relative">
        <Line ref={chartRef} options={chartOptions} data={chartData} />
        {/* Click zones */}
        <div
          className="absolute top-0 left-0 h-full w-1/2 cursor-pointer"
          onClick={handlePanLeft}
        />
        <div
          className="absolute top-0 right-0 h-full w-1/2 cursor-pointer"
          onClick={handlePanRight}
        />
      </div>

      {/* Map Section */}
      <div className="h-[60vh]">
        <TripMap
          primaryPath={windowData}
          columns={mapColumns}
          visibleRange={visibleRange}
          onBoundsRangeChange={() => {}}
          multiRoute={false}
        />
      </div>
    </div>
  );
}

