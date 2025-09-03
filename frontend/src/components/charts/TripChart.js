/// --- VERSION 0.9.0 ---
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, zoomPlugin);

export default function TripChart({
  log,
  selectedPIDs = [],
  onPIDChange = () => {},
  chartColors = [],
  visibleRange = { min: 0, max: 0 }
}) {
  const chartRef = useRef(null);
  const dataRef = log?.data || [];
  const colsRef = log?.columns || [];

  const windowData = useMemo(() => {
    const min = Math.max(0, visibleRange?.min ?? 0);
    const max = Math.min((dataRef.length - 1), visibleRange?.max ?? 0);
    if (dataRef.length === 0 || max < min) return [];
    return dataRef.slice(min, max + 1);
  }, [dataRef, visibleRange]);

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
      zoom: { pan: { enabled: true, mode: 'x' }, zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' } }
    },
    scales: {
      x: { ticks: { color: '#9CA3AF' } },
      y: { ticks: { color: '#9CA3AF' } }
    }
  }), []);

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-4">
      <div className="flex items-center space-x-4 mb-2">
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
      <div className="h-[56vh]">
        <Line ref={chartRef} options={chartOptions} data={chartData} />
      </div>
    </div>
  );
}
