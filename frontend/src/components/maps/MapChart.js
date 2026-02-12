// --- VERSION 0.1.0 ---
// - Optional standalone chart for map-linked PID data.
// - Not currently used in LogDetail/TripGroupDetail but included for completeness.

import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function MapChart({ data = [], pid = 'engine_rpm', color = '#38BDF8' }) {
  const chartData = {
    labels: data.map((_, i) => i),
    datasets: [{
      label: pid,
      data: data.map(row => row?.[pid]),
      borderColor: color,
      pointRadius: 0,
      borderWidth: 2,
      tension: 0.4
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: true, labels: { color: '#FFFFFF' } }
    },
    scales: {
      x: { ticks: { color: '#9CA3AF' } },
      y: { ticks: { color: '#9CA3AF' } }
    }
  };

  return (
    <div className="h-[40vh] bg-gray-800 rounded-lg p-4">
      <Line options={chartOptions} data={chartData} />
    </div>
  );
}
