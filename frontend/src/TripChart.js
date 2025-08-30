// FILE: frontend/src/TripChart.js
//
// --- VERSION 1.9.7-ALPHA ---
// - NEW: Extracted chart logic from LogDetail.js into reusable TripChart component.
// - Supports PID selection, fixed color mapping, zoom buttons, and chart→map sync.
// - Designed to work for both single-log and multi-log contexts via props.
//

import React, { useMemo, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, zoomPlugin);

function PidSelector({ color, options, onChange, selectedValue }) {
  return (
    <div className="flex-1 flex items-center bg-gray-700 rounded-md p-2" style={{ borderLeft: `4px solid ${color}` }}>
      <select
        value={selectedValue || 'none'}
        onChange={e => onChange(e.target.value)}
        className="bg-transparent text-white w-full focus:outline-none text-sm capitalize"
      >
        <option value="none">-- Select PID --</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt.replace(/_/g, ' ')}</option>
        ))}
      </select>
    </div>
  );
}

export default function TripChart({
  log,
  comparisonLog,
  selectedPIDs,
  onPIDChange,
  chartColors,
  comparisonColors,
  visibleRange,
  setVisibleRange
}) {
  const chartRef = useRef(null);
  const syncingRef = useRef(false);

  const setZoom = (minutes) => {
    if (!chartRef.current || !log || log.data.length < 2) return;
    const chart = chartRef.current;
    const timeDiff = log.data[1].timestamp - log.data[0].timestamp;
    const pointsPerSecond = timeDiff > 0 ? 1 / timeDiff : 1;
    const pointsToShow = Math.round(minutes * 60 * pointsPerSecond);
    const currentMin = Math.round(chart.scales.x.min);
    const max = Math.min(currentMin + pointsToShow, log.data.length - 1);

    syncingRef.current = true;
    chart.zoomScale('x', { min: currentMin, max }, 'default');
    setVisibleRange({ min: currentMin, max });
    setTimeout(() => { syncingRef.current = false; }, 0);
  };

  const chartData = useMemo(() => {
    if (!log) return null;
    const datasets = [];
    selectedPIDs.forEach((pid, slotIndex) => {
      if (pid === 'none') return;
      datasets.push({
        label: pid,
        data: log.data.map(row => row[pid]),
        borderColor: chartColors[slotIndex],
        yAxisID: `y${slotIndex}`,
        pointRadius: 0,
        borderWidth: 2,
      });
      if (comparisonLog) {
        datasets.push({
          label: `${pid} (Comp)`,
          data: comparisonLog.data.map(row => row[pid]),
          borderColor: comparisonColors[slotIndex],
          borderDash: [5, 5],
          yAxisID: `y${slotIndex}`,
          pointRadius: 0,
          borderWidth: 2,
        });
      }
    });
    return { labels: log.data.map((_, i) => i), datasets };
  }, [log, selectedPIDs, comparisonLog, chartColors, comparisonColors]);

  const chartOptions = useMemo(() => {
    const scales = {
      x: {
        ticks: {
          callback: function (value) {
            if (log && log.data[value]) {
              const seconds = log.data[value].timestamp - log.data[0].timestamp;
              const minutes = Math.floor(seconds / 60);
              const remSeconds = seconds % 60;
              return `${minutes}m ${remSeconds}s`;
            }
            return value;
          }
        }
      }
    };
    selectedPIDs.forEach((pid, slotIndex) => {
      if (pid === 'none') return;
      scales[`y${slotIndex}`] = {
        type: 'linear',
        display: true,
        position: slotIndex % 2 === 0 ? 'left' : 'right',
        grid: { drawOnChartArea: slotIndex === 0 },
        ticks: { color: chartColors[slotIndex] },
        title: { display: true, text: pid.replace(/_/g, ' '), color: chartColors[slotIndex] }
      };
    });
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      animation: false,
      plugins: {
        legend: { display: false },
        zoom: {
          pan: {
            enabled: true,
            mode: 'x',
            onPanComplete: ({ chart }) => {
              if (syncingRef.current) return;
              setVisibleRange({ min: Math.round(chart.scales.x.min), max: Math.round(chart.scales.x.max) });
            }
          },
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: 'x',
            onZoomComplete: ({ chart }) => {
              if (syncingRef.current) return;
              setVisibleRange({ min: Math.round(chart.scales.x.min), max: Math.round(chart.scales.x.max) });
            }
          }
        }
      },
      scales
    };
  }, [log, selectedPIDs, chartColors, setVisibleRange]);

  if (!log) return null;

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-4">
      <div className="flex items-center space-x-4 mb-2">
        {selectedPIDs.map((pid, index) => (
          <PidSelector
            key={index}
            color={chartColors[index]}
            options={log.columns.filter(c => !['data_id', 'timestamp', 'operating_state'].includes(c))}
            selectedValue={pid}
            onChange={(value) => onPIDChange(index, value)}
          />
        ))}
      </div>
      <div className="flex justify-end items-center space-x-2 mb-2">
        <span className="text-gray-400 text-sm">Zoom:</span>
        <button onClick={() => setZoom(2)} className="bg-gray-700 px-2 py-1 text-xs rounded hover:bg-gray-600">2min</button>
        <button onClick={() => setZoom(5)} className="bg-gray-700 px-2 py-1 text-xs rounded hover:bg-gray-600">5min</button>
        <button onClick={() => setZoom(10)} className="bg-gray-700 px-2 py-1 text-xs rounded hover:bg-gray-600">10min</button>
        <button onClick={() => chartRef.current.resetZoom()} className="bg-gray-700 px-2 py-1 text-xs rounded hover:bg-gray-600">Reset</button>
      </div>
      <div className="h-[56vh]">
        <Line ref={chartRef} options={chartOptions} data={chartData} />
      </div>
    </div>
  );
}
