// FILE: frontend/src/TripChart.js
//
// --- VERSION 1.9.8-ALPHA ---
// - UPDATED: Multi-log mode now uses hue families + shade variation per log.
// - Each PID slot keeps its hue across logs; logs get progressively darker shades.
// - Preserves PID selection, zoom buttons, chart→map sync.
//

import React, { useMemo, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import tinycolor from 'tinycolor2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, zoomPlugin);

// Hue families for each PID slot
const PID_COLOR_FAMILIES = [
  '#38BDF8', // blue
  '#F59E0B', // orange
  '#4ADE80', // green
  '#F472B6', // pink
  '#A78BFA'  // purple
];

// Generate progressively darker shades for each hue
function generateShades(hex, count) {
  const shades = [];
  for (let i = 0; i < count; i++) {
    const amt = i * (100 / (count + 1)); // spread shades evenly
    shades.push(tinycolor(hex).darken(amt).toHexString());
  }
  return shades;
}

const MAX_LOGS = 6; // adjust as needed
const PID_COLOR_SHADES = PID_COLOR_FAMILIES.map(base =>
  generateShades(base, MAX_LOGS)
);

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
  log,                // For single-log: { data, columns }
  logs,               // For multi-log: array of { log_id, start_timestamp, data, columns }
  selectedPIDs,
  onPIDChange,
  chartColors = PID_COLOR_FAMILIES,
  comparisonColors = [],
  comparisonLog,      // Only used in single-log mode
  visibleRange,
  setVisibleRange
}) {
  const chartRef = useRef(null);
  const syncingRef = useRef(false);

  const isGroupMode = Array.isArray(logs) && logs.length > 0;

  const setZoom = (minutes) => {
    if (!chartRef.current) return;
    const baseData = isGroupMode ? logs[0].data : log.data;
    if (!baseData || baseData.length < 2) return;

    const chart = chartRef.current;
    const timeDiff = baseData[1].timestamp - baseData[0].timestamp;
    const pointsPerSecond = timeDiff > 0 ? 1 / timeDiff : 1;
    const pointsToShow = Math.round(minutes * 60 * pointsPerSecond);
    const currentMin = Math.round(chart.scales.x.min);
    const max = Math.min(currentMin + pointsToShow, baseData.length - 1);

    syncingRef.current = true;
    chart.zoomScale('x', { min: currentMin, max }, 'default');
    setVisibleRange({ min: currentMin, max });
    setTimeout(() => { syncingRef.current = false; }, 0);
  };
  const chartData = useMemo(() => {
    if (isGroupMode) {
      const datasets = [];
      logs.forEach((logItem, logIndex) => {
        selectedPIDs.forEach((pid, slotIndex) => {
          if (pid === 'none') return;
          const color = PID_COLOR_SHADES[slotIndex][logIndex % MAX_LOGS];
          datasets.push({
            label: `${new Date(logItem.start_timestamp * 1000).toLocaleDateString()} — ${pid}`,
            data: logItem.data.map(row => ({
              x: row.timestamp - logItem.start_timestamp,
              y: row[pid]
            })),
            borderColor: color,
            backgroundColor: tinycolor(color).setAlpha(0.5).toRgbString(),
            tension: 0.4,
            pointRadius: 0,
            borderWidth: 2
          });
        });
      });
      return { datasets };
    } else {
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
          borderWidth: 2
        });
        if (comparisonLog) {
          datasets.push({
            label: `${pid} (Comp)`,
            data: comparisonLog.data.map(row => row[pid]),
            borderColor: comparisonColors[slotIndex],
            borderDash: [5, 5],
            yAxisID: `y${slotIndex}`,
            pointRadius: 0,
            borderWidth: 2
          });
        }
      });
      return { labels: log.data.map((_, i) => i), datasets };
    }
  }, [isGroupMode, logs, log, selectedPIDs, comparisonLog, chartColors, comparisonColors]);

  const chartOptions = useMemo(() => {
    const scales = {
      x: {
        type: 'linear',
        ticks: {
          callback: function (value) {
            if (!isGroupMode && log && log.data[value]) {
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
    if (!isGroupMode) {
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
    } else {
      scales.y = {
        title: { display: true, text: 'Value', color: '#9CA3AF' },
        ticks: { color: '#9CA3AF' }
      };
    }
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      animation: false,
      plugins: {
        legend: { display: true, labels: { color: '#FFFFFF' } },
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
  }, [isGroupMode, log, selectedPIDs, chartColors, setVisibleRange]);

  const pidOptions = isGroupMode
    ? logs[0]?.columns?.filter(c => !['data_id', 'timestamp', 'operating_state'].includes(c)) || []
    : log.columns.filter(c => !['data_id', 'timestamp', 'operating_state'].includes(c));

  if (isGroupMode && logs.length === 0) return null;
  if (!isGroupMode && !log) return null;

    return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-4">
      <div className="flex items-center space-x-4 mb-2">
        {selectedPIDs.map((pid, index) => (
          <PidSelector
            key={index}
            color={chartColors[index]}
            options={pidOptions}
            selectedValue={pid}
            onChange={(value) => onPIDChange(index, value)}
          />
        ))}
      </div>

      <div className="flex justify-end items-center space-x-2 mb-2">
        <span className="text-gray-400 text-sm">Zoom:</span>
        <button
          onClick={() => setZoom(2)}
          className="bg-gray-700 px-2 py-1 text-xs rounded hover:bg-gray-600"
        >
          2min
        </button>
        <button
          onClick={() => setZoom(5)}
          className="bg-gray-700 px-2 py-1 text-xs rounded hover:bg-gray-600"
        >
          5min
        </button>
        <button
          onClick={() => setZoom(10)}
          className="bg-gray-700 px-2 py-1 text-xs rounded hover:bg-gray-600"
        >
          10min
        </button>
        <button
          onClick={() => chartRef.current.resetZoom()}
          className="bg-gray-700 px-2 py-1 text-xs rounded hover:bg-gray-600"
        >
          Reset
        </button>
      </div>

      <div className="h-[56vh]">
        <Line ref={chartRef} options={chartOptions} data={chartData} />
      </div>
    </div>
  );
}
