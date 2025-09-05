/// --- VERSION 0.9.5 ---
// - Renders PID selectors, sampling indicator, and a Chart.js line chart.
// - Uses adaptive sampling for performance.
// - Fully wired to log.data / log.columns from backend.

import React, { useMemo, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import PIDSelector from '../shared/PIDSelector';
import SamplingIndicator from '../shared/SamplingIndicator';
import { sampleData } from '../../utils/samplingUtils';
import { getDefaultVisibleRange } from '../../utils/rangeUtils';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, zoomPlugin);

export default function TripChart({
  log,
  selectedPIDs = [],
  onPIDChange = () => {},
  chartColors = [],
  visibleRange = { min: 0, max: 0 },
  setVisibleRange = () => {}
}) {
  const chartRef = useRef(null);

  const dataRef = useMemo(() => log?.data || [], [log]);
  const colsRef = useMemo(() => log?.columns || [], [log]);

  const windowData = useMemo(() => {
    const min = Math.max(0, visibleRange?.min ?? 0);
    const max = Math.min((dataRef.length - 1), visibleRange?.max ?? 0);
    if (dataRef.length === 0 || max < min) return [];
    return dataRef.slice(min, max + 1);
  }, [dataRef, visibleRange]);

  const timeLabels = useMemo(() => {
    const startTs = windowData[0]?.timestamp ?? dataRef[0]?.timestamp ?? 0;
    return windowData.map(row => {
      const t = Number(row?.timestamp ?? 0) - Number(startTs);
      const sec = Math.floor(t / 1000);
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = sec % 60;
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    });
  }, [windowData, dataRef]);

  const { chartData, samplingActive } = useMemo(() => {
    let samplingFlag = false;
    const datasets = [];

    (selectedPIDs || []).forEach((pid, idx) => {
      if (!pid || pid === 'none') return;

      let points = windowData.map(row => row?.[pid]);
      if (points.length > 200) {
        points = sampleData(points, 200);
        samplingFlag = true;
      }

      datasets.push({
        label: pid,
        data: points,
        borderColor: chartColors[idx] || '#38BDF8',
        pointRadius: 0,
        borderWidth: 2,
        tension: 0.4
      });
    });

    return {
      chartData: {
        labels: timeLabels,
        datasets
      },
      samplingActive: samplingFlag
    };
  }, [windowData, selectedPIDs, chartColors, timeLabels]);

  const chartOptions = useMemo(() => {
    // Range-compression scaling
    const allVals = (selectedPIDs || [])
      .filter(pid => pid && pid !== 'none')
      .flatMap(pid => windowData.map(r => r?.[pid]).filter(v => typeof v === 'number'));

    let yMin = Math.min(...allVals);
    let yMax = Math.max(...allVals);

    if (selectedPIDs.length > 1) {
      const ranges = selectedPIDs
        .map(pid => windowData.map(r => r?.[pid]).filter(v => typeof v === 'number'))
        .filter(arr => arr.length)
        .map(arr => ({ min: Math.min(...arr), max: Math.max(...arr) }));

      if (ranges.length > 1) {
        const gap = ranges[1].min - ranges[0].max;
        if (gap > (ranges[0].max - ranges[0].min) * 2) {
          yMin = ranges[0].min;
          yMax = ranges[1].max;
        }
      }
    }

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        zoom: { pan: { enabled: true, mode: 'x' }, zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' } }
      },
      scales: {
        x: { ticks: { color: '#9CA3AF' } },
        y: { min: yMin, max: yMax, ticks: { color: '#9CA3AF' } }
      }
    };
  }, [windowData, selectedPIDs]);

  // Inside TripChart.js — replace the handleZoom function with this:

  const handleZoom = (minutes) => {
    if (minutes === 'reset') {
      // Only reset if not already at full view
      if (visibleRange.min === 0 && visibleRange.max === dataRef.length - 1) return;
      setVisibleRange({ min: 0, max: dataRef.length - 1 });
      return;
    }
    const range = getDefaultVisibleRange(dataRef, minutes * 60);
    setVisibleRange(range);
  };
  

  const handlePan = (direction) => {
    const totalLength = dataRef.length;
    const size = visibleRange.max - visibleRange.min;
    const shift = Math.floor(size / 2);
    let min = visibleRange.min;
    if (direction === 'left') min = Math.max(0, min - shift);
    if (direction === 'right') min = Math.min(totalLength - size, min + shift);
    setVisibleRange({ min, max: min + size });
  };

  const { scrollWidthPercent, scrollLeftPercent } = useMemo(() => {
    const total = dataRef.length;
    const size = visibleRange.max - visibleRange.min;
    const widthPct = total > 0 ? Math.max((size / total) * 100, 2) : 0; // min width 2%
    const leftPct = total > 0 ? (visibleRange.min / total) * 100 : 0;
    return { scrollWidthPercent: widthPct, scrollLeftPercent: leftPct };
  }, [dataRef.length, visibleRange]);
  
  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-4 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        {(selectedPIDs || []).map((pid, index) => (
          <PIDSelector
            key={index}
            color={chartColors[index] || '#38BDF8'}
            options={colsRef}
            selectedValue={pid}
            onChange={(value) => onPIDChange(index, value)}
          />
        ))}
      </div>
      <SamplingIndicator active={samplingActive} />

<div className="flex space-x-2 text-sm text-gray-300">
  <button onClick={() => handleZoom(2)} className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600">2min</button>
  <button onClick={() => handleZoom(5)} className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600">5min</button>
  <button onClick={() => handleZoom(10)} className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600">10min</button>
  <button onClick={() => handleZoom('reset')} disabled={visibleRange.min === 0 && visibleRange.max === dataRef.length - 1} className={`px-2 py-1 rounded ${visibleRange.min === 0 && visibleRange.max === dataRef.length - 1 ? 'bg-gray-600 text-gray-500' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>Reset</button>

</div>

      <div className="h-[56vh]">
        <Line ref={chartRef} options={chartOptions} data={chartData} />
      </div>
      <div className="flex items-center space-x-2 mt-2">
        <button
          onClick={() => handlePan('left')}
          disabled={visibleRange.min <= 0}
          className={`px-2 py-1 rounded ${visibleRange.min <= 0 ? 'bg-gray-600 text-gray-500' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
        >
        </button>

        <div className="flex-1 h-2 bg-gray-600 rounded relative overflow-hidden">
          <div
            className="absolute top-0 h-2 bg-blue-400 rounded"
            style={{
              width: `${scrollWidthPercent}%`,
              left: `${scrollLeftPercent}%`,
              transition: 'left 0.2s ease, width 0.2s ease'
            }}
          />
        </div>

        <button
          onClick={() => handlePan('right')}
          disabled={visibleRange.max >= dataRef.length - 1}
          className={`px-2 py-1 rounded ${visibleRange.max >= dataRef.length - 1 ? 'bg-gray-600 text-gray-500': 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
          >
          </button>
        </div>
      </div>
    );
  }
            