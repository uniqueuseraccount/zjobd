/// --- VERSION 0.2.6---
// - Renders PID selectors, sampling indicator, and a Chart.js line chart.
// - Uses adaptive sampling for performance.
// - Fully wired to log.data / log.columns from backend.


import React, { useMemo, useRef, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend
} from 'chart.js';
import PIDSelector from '../shared/PIDSelector';
import SamplingIndicator from '../shared/SamplingIndicator';
import { sampleData } from '../../utils/samplingUtils';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function TripChart({
  log,
  selectedPIDs = [],
  onPIDChange = () => {},
  chartColors = [],
  visibleRange,
  setVisibleRange
}) {
  const chartRef = useRef(null);
  const dragRef = useRef(false);
  const trackRef = useRef(null);

  const dataRef = useMemo(() => log?.data || [], [log]);
  const colsRef = useMemo(() => log?.columns || [], [log]);

  const windowData = useMemo(() => {
    const min = Math.max(0, visibleRange.min);
    const max = Math.min(dataRef.length - 1, visibleRange.max);
    return dataRef.slice(min, max + 1);
  }, [dataRef, visibleRange]);

  const timeLabels = useMemo(() => {
    const startTs = dataRef[visibleRange.min]?.timestamp ?? 0;
    return windowData.map(row => {
      const t = Number(row?.timestamp ?? 0) - Number(startTs);
      const sec = Math.floor(t / 1000);
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = sec % 60;
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    });
  }, [windowData, dataRef, visibleRange]);

  const { chartData, samplingActive } = useMemo(() => {
    let samplingFlag = false;
    const datasets = [];

    selectedPIDs.forEach((pid, idx) => {
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

    return { chartData: { labels: timeLabels, datasets }, samplingActive: samplingFlag };
  }, [windowData, selectedPIDs, chartColors, timeLabels]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: '#9CA3AF' } },
      y: { ticks: { color: '#9CA3AF' } }
    }
  }), []);

  const handleZoomPreset = useCallback((minutes) => {
    if (minutes === 'reset') {
      setVisibleRange({ min: 0, max: dataRef.length - 1 });
      return;
    }
    const size = Math.floor((minutes * 60 * dataRef.length) / (dataRef[dataRef.length - 1]?.timestamp - dataRef[0]?.timestamp) * 1000);
    setVisibleRange({ min: visibleRange.min, max: visibleRange.min + size });
  }, [dataRef, visibleRange, setVisibleRange]);

  const handlePan = useCallback((dir) => {
    const size = visibleRange.max - visibleRange.min;
    const shift = Math.floor(size / 2);
    let min = visibleRange.min + (dir === 'right' ? shift : -shift);
    min = Math.max(0, Math.min(dataRef.length - size, min));
    setVisibleRange({ min, max: min + size });
  }, [dataRef.length, visibleRange, setVisibleRange]);

  const { scrollWidthPercent, scrollLeftPercent } = useMemo(() => {
    const total = dataRef.length;
    const size = visibleRange.max - visibleRange.min;
    return {
      scrollWidthPercent: total > 0 ? Math.max((size / total) * 100, 2) : 0,
      scrollLeftPercent: total > 0 ? (visibleRange.min / total) * 100 : 0
    };
  }, [dataRef.length, visibleRange]);

  const updateFromDrag = useCallback((clientX) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickPct = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    const total = dataRef.length;
    const size = visibleRange.max - visibleRange.min;
    let newMin = Math.round(clickPct * total);
    newMin = Math.max(0, Math.min(total - size, newMin));
    setVisibleRange({ min: newMin, max: newMin + size });
  }, [dataRef.length, visibleRange, setVisibleRange]);

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-4 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        {selectedPIDs.map((pid, index) => (
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
        <button onClick={() => handleZoomPreset(2)} className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600">2min</button>
        <button onClick={() => handleZoomPreset(5)} className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600">5min</button>
        <button onClick={() => handleZoomPreset(10)} className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600">10min</button>
        <button
          onClick={() => handleZoomPreset('reset')}
          disabled={visibleRange.min === 0 && visibleRange.max === dataRef.length - 1}
          className={`px-2 py-1 rounded ${visibleRange.min === 0 && visibleRange.max === dataRef.length - 1
            ? 'bg-gray-600 text-gray-500'
            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
        >
          Reset
        </button>
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
          ◀
        </button>
        <div
          ref={trackRef}
          className="flex-1 h-2 bg-gray-600 rounded relative overflow-hidden cursor-pointer"
          onMouseDown={(e) => { dragRef.current = true; updateFromDrag(e.clientX); }}
          onMouseMove={(e) => { if (dragRef.current) updateFromDrag(e.clientX); }}
          onMouseUp={() => { dragRef.current = false; }}
          onMouseLeave={() => { dragRef.current = false; }}
          onTouchStart={(e) => { dragRef.current = true; updateFromDrag(e.touches[0].clientX); }}
          onTouchMove={(e) => { if (dragRef.current) updateFromDrag(e.touches[0].clientX); }}
          onTouchEnd={() => { dragRef.current = false; }}
        >
          <div
            className="absolute top-0 h-2 bg-blue-400 rounded"
            style={{
              width: `${scrollWidthPercent}%`,
              left: `${scrollLeftPercent}%`,
              transition: dragRef.current ? 'none' : 'left 0.1s ease, width 0.1s ease'
            }}
          />
        </div>
        <button
          onClick={() => handlePan('right')}
          disabled={visibleRange.max >= dataRef.length - 1}
          className={`px-2 py-1 rounded ${visibleRange.max >= dataRef.length - 1 ? 'bg-gray-600 text-gray-500' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
        >
          ▶
        </button>
      </div>
    </div>
  );
}
