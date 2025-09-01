// FILE: frontend/src/components/charts/TripChart.js
//
// --- VERSION 0.2.0-ALPHA ---
// - Adds adaptive sampling: max 200 points per PID.
// - Shows SamplingIndicator when sampling is active.
// - Otherwise identical to your existing TripChart layout/props.
//

import React, { useMemo, useRef } from 'react';
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
import PIDSelector from '../shared/PIDSelector';
import SamplingIndicator from '../shared/SamplingIndicator';
import { sampleData } from '../../utils/samplingUtils';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, zoomPlugin);

export default function TripChart({
  log,                // { data, columns }
  selectedPIDs,       // array of PID names
  onPIDChange,        // function(index, value)
  chartColors,        // array of colors for PIDs
  visibleRange,       // { min, max }
  setVisibleRange     // function to update range
}) {
  const chartRef = useRef(null);

  // Slice current visible range
  const windowData = useMemo(() => {
    if (!log?.data) return [];
    return log.data.slice(visibleRange.min, visibleRange.max + 1);
  }, [log, visibleRange]);

  // Build datasets with adaptive sampling
  const { chartData, samplingActive } = useMemo(() => {
    if (!log?.data) return { chartData: { datasets: [] }, samplingActive: false };

    let samplingFlag = false;
    const datasets = [];

    selectedPIDs.forEach((pid, idx) => {
      if (pid === 'none') return;

      let points = windowData.map(row => row[pid]);
      if (points.length > 200) {
        points = sampleData(points, 200);
        samplingFlag = true;
      }

      datasets.push({
        label: pid,
        data: points,
        borderColor: chartColors[idx],
        pointRadius: 0,
        borderWidth: 2,
        tension: 0.4
      });
    });

    return {
      chartData: {
        labels: windowData.map((_, i) => i),
        datasets
      },
      samplingActive: samplingFlag
    };
  }, [windowData, selectedPIDs, chartColors]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: true, labels: { color: '#FFFFFF' } },
      zoom: {
        pan: { enabled: true, mode: 'x' },
        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' }
      }
    },
    scales: {
      x: { ticks: { color: '#9CA3AF' } },
      y: { ticks: { color: '#9CA3AF' } }
    }
  }), []);

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-4">
      {/* PID selectors */}
      <div className="flex items-center space-x-4 mb-2">
        {selectedPIDs.map((pid, index) => (
          <PIDSelector
            key={index}
            color={chartColors[index]}
            options={log?.columns || []}
            selectedValue={pid}
            onChange={(value) => onPIDChange(index, value)}
          />
        ))}
      </div>

      {/* Sampling indicator */}
      <SamplingIndicator active={samplingActive} />

      {/* Chart */}
      <div className="h-[56vh]">
        <Line ref={chartRef} options={chartOptions} data={chartData} />
      </div>
    </div>
  );
}
