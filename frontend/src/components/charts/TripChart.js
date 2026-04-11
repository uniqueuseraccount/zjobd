// --- VERSION 1.5.0 ---
// - Global Time selection integration
// - Manual click-drag-release time window selection
// - Synchronized state with TimeContext and PlaybackContext
// - Vertical "Now" line for real-time playback visualization

import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, LogarithmicScale, PointElement, LineElement, Title, Tooltip, Legend
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import annotationPlugin from 'chartjs-plugin-annotation';
import PIDSelector from '../shared/PIDSelector';
import { useGlobalTime } from '../../context/TimeContext';
import { usePlayback } from '../../context/PlaybackContext';

ChartJS.register(CategoryScale, LinearScale, LogarithmicScale, PointElement, LineElement, Title, Tooltip, Legend, zoomPlugin, annotationPlugin);

// Function to determine if values need logarithmic scaling
function needsLogScale(values) {
  const validValues = values.filter(v => typeof v === 'number' && v > 0);
  if (validValues.length === 0) return false;
  const min = Math.min(...validValues);
  const max = Math.max(...validValues);
  return (max / min) > 100;
}

// Smart grouping function
function groupPIDsByScale(selectedPIDs, data) {
  const activePIDs = selectedPIDs
    .map((pid, idx) => ({ pid, idx }))
    .filter(p => p.pid && p.pid !== 'none');

  if (activePIDs.length <= 1) return { primary: activePIDs, secondary: [] };

  const pidStats = activePIDs.map(p => {
    const values = data.map(row => row?.[p.pid]).filter(v => typeof v === 'number');
    return { ...p, max: values.length > 0 ? Math.max(...values) : 0 };
  });

  const sorted = [...pidStats].sort((a, b) => a.max - b.max);
  let splitIdx = 0;
  let maxGap = -1;

  for (let i = 0; i < sorted.length - 1; i++) {
    const val1 = Math.max(0.1, sorted[i].max);
    const val2 = Math.max(0.1, sorted[i+1].max);
    const gap = Math.log10(val2) - Math.log10(val1);
    if (gap > maxGap) { maxGap = gap; splitIdx = i; }
  }

  if (maxGap < 0.5) return { primary: activePIDs, secondary: [] };
  return { secondary: sorted.slice(0, splitIdx + 1), primary: sorted.slice(splitIdx + 1) };
}

function scaleRPM(val) {
  if (typeof val !== 'number') return val;
  if (val <= 1000) return val / 10;
  else if (val <= 4000) return 100 + (val - 1000) / 100;
  else return 130 + (val - 4000) / 10;
}

export default function TripChart({
  log,
  logs = [], 
  mode = 'single', 
  selectedPIDs = [],
  onPIDChange = () => {},
  chartColors = []
}) {
  const { visibleRange, setVisibleRange, totalLength } = useGlobalTime();
  const { currentFrame, isPlaying } = usePlayback();
  const chartRef = useRef(null);
  const [key, setKey] = useState(0); 
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);

  useEffect(() => {
    setKey(prev => prev + 1);
  }, [log?.data?.length, mode, selectedPIDs.join(',')]);

  const referenceLog = useMemo(() => mode === 'comparison' ? (logs.length > 0 ? logs[0] : null) : log, [log, logs, mode]);
  const dataRef = useMemo(() => referenceLog?.data || [], [referenceLog]);
  const colsRef = useMemo(() => referenceLog?.columns || [], [referenceLog]);

  const windowData = useMemo(() => {
    const min = Math.max(0, visibleRange?.min ?? 0);
    const max = Math.min((dataRef.length - 1), visibleRange?.max ?? 0);
    return (dataRef.length === 0 || max < min) ? [] : dataRef.slice(min, max + 1);
  }, [dataRef, visibleRange]);

  const bufferData = useMemo(() => {
    const size = (visibleRange?.max ?? 0) - (visibleRange?.min ?? 0);
    const bufferMin = Math.max(0, (visibleRange?.min ?? 0) - size * 5);
    const bufferMax = Math.min(dataRef.length - 1, (visibleRange?.max ?? 0) + size * 5);
    return dataRef.slice(bufferMin, bufferMax + 1);
  }, [dataRef, visibleRange]);

  const timeLabels = useMemo(() => {
    if (windowData.length === 0) return [];
    const startTs = Number(dataRef[0]?.timestamp ?? 0);
    return windowData.map(row => {
      const elapsedSec = Math.max(0, Math.floor((Number(row?.timestamp ?? 0) - startTs) / 1000));
      const h = Math.floor(elapsedSec / 3600);
      const m = Math.floor((elapsedSec % 3600) / 60);
      const s = elapsedSec % 60;
      return h > 0 ? `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}` : `${m}:${s.toString().padStart(2,'0')}`;
    });
  }, [windowData, dataRef]);

  const { chartData, useSecondaryScale } = useMemo(() => {
    const datasets = [];
    let hasSecondaryScale = false;

    if (mode === 'comparison') {
      const active = selectedPIDs.filter(p => p && p !== 'none');
      logs.forEach((currentLog, lIdx) => {
        const d = currentLog.data || [];
        active.forEach((pid, pIdx) => {
          const points = d.slice(visibleRange.min, visibleRange.max + 1).map(r => (pid === 'engine_rpm') ? scaleRPM(r?.[pid]) : r?.[pid]);
          datasets.push({
            label: `${currentLog.name || `Log ${currentLog.id}`} - ${pid}`,
            data: points,
            borderColor: chartColors[pIdx] || '#38BDF8',
            backgroundColor: chartColors[pIdx] || '#38BDF8',
            pointRadius: 0, borderWidth: 2, borderDash: currentLog.lineStyle || [], tension: 0.4, yAxisID: 'y'
          });
        });
      });
    } else {
      const pidGroups = groupPIDsByScale(selectedPIDs, bufferData);
      hasSecondaryScale = pidGroups.secondary.length > 0;
      pidGroups.primary.forEach(({ pid, idx }) => {
        datasets.push({
          label: pid === 'engine_rpm' ? 'Engine RPM (Non-linear)' : pid,
          data: windowData.map(r => (pid === 'engine_rpm') ? scaleRPM(r?.[pid]) : r?.[pid]),
          borderColor: chartColors[idx] || '#38BDF8', backgroundColor: chartColors[idx] || '#38BDF8',
          pointRadius: 0, borderWidth: 2, tension: 0.4, yAxisID: 'y', spanGaps: true
        });
      });
      pidGroups.secondary.forEach(({ pid, idx }) => {
        datasets.push({
          label: pid, data: windowData.map(r => r?.[pid]),
          borderColor: chartColors[idx] || '#38BDF8', backgroundColor: chartColors[idx] || '#38BDF8',
          pointRadius: 0, borderWidth: 2, borderDash: [5, 5], tension: 0.4, yAxisID: 'y1', spanGaps: true
        });
      });
    }
    return { chartData: { labels: timeLabels, datasets }, useSecondaryScale: hasSecondaryScale };
  }, [windowData, bufferData, selectedPIDs, chartColors, timeLabels, mode, logs, visibleRange]);

  const chartOptions = useMemo(() => {
    const pidGroups = groupPIDsByScale(selectedPIDs, bufferData);
    const primary = pidGroups.primary.flatMap(({ pid }) => bufferData.map(r => (pid === 'engine_rpm') ? scaleRPM(r?.[pid]) : r?.[pid])).filter(v => typeof v === 'number');
    const secondary = pidGroups.secondary.flatMap(({ pid }) => bufferData.map(r => r?.[pid])).filter(v => typeof v === 'number');

    return {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 500 }, interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: true, labels: { color: '#9CA3AF' } },
        tooltip: { callbacks: { title: (items) => `Time: ${items[0]?.label || ''}` } },
        annotation: {
          annotations: {
            line1: {
              type: 'line',
              xMin: Math.max(0, currentFrame - (visibleRange?.min || 0)),
              xMax: Math.max(0, currentFrame - (visibleRange?.min || 0)),
              borderColor: 'rgba(34, 211, 238, 0.8)',
              borderWidth: 2,
              display: isPlaying,
              label: { content: 'NOW', display: true, position: 'start', backgroundColor: '#22d3ee', color: '#000', font: { size: 10, weight: 'bold' } }
            }
          }
        }
      },
      scales: {
        x: { ticks: { color: '#9CA3AF' }, title: { display: true, text: 'Elapsed Time', color: '#9CA3AF' } },
        y: { type: needsLogScale(primary) ? 'logarithmic' : 'linear', position: 'left', ticks: { color: '#9CA3AF' }, title: { display: true, text: 'Primary Scale', color: '#9CA3AF' } },
        ...(useSecondaryScale && mode !== 'comparison' ? {
          y1: { type: needsLogScale(secondary) ? 'logarithmic' : 'linear', position: 'right', ticks: { color: '#9CA3AF' }, title: { display: true, text: 'Secondary Scale', color: '#9CA3AF' }, grid: { drawOnChartArea: false } }
        } : {})
      }
    };
  }, [windowData, bufferData, selectedPIDs, useSecondaryScale, visibleRange, currentFrame, isPlaying]);

  const handleMouseDown = (e) => {
    const chart = chartRef.current;
    if (!chart) return;
    const points = chart.getElementsAtEventForMode(e.nativeEvent, 'index', { intersect: false }, true);
    if (points.length > 0) {
      const idx = points[0].index + visibleRange.min;
      setIsSelecting(true); setSelectionStart(idx); setSelectionEnd(idx);
    }
  };

  const handleMouseMove = (e) => {
    if (!isSelecting) return;
    const chart = chartRef.current;
    if (!chart) return;
    const points = chart.getElementsAtEventForMode(e.nativeEvent, 'index', { intersect: false }, true);
    if (points.length > 0) setSelectionEnd(points[0].index + visibleRange.min);
  };

  const handleMouseUp = () => {
    if (!isSelecting) return;
    setIsSelecting(false);
    if (selectionStart !== null && selectionEnd !== null && selectionStart !== selectionEnd) {
      setVisibleRange({ min: Math.min(selectionStart, selectionEnd), max: Math.max(selectionStart, selectionEnd) });
    }
    setSelectionStart(null); setSelectionEnd(null);
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        {selectedPIDs.map((pid, index) => (
          <PIDSelector key={index} color={chartColors[index] || '#38BDF8'} options={colsRef} selectedValue={pid} onChange={(val) => onPIDChange(index, val)} />
        ))}
      </div>
      <div className="h-[56vh] cursor-crosshair relative" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
        <Line key={key} ref={chartRef} options={chartOptions} data={chartData} />
        {isSelecting && selectionStart !== null && selectionEnd !== null && (
          <div className="absolute top-0 bottom-0 bg-cyan-500/20 border-x border-cyan-400 pointer-events-none z-10 flex items-center justify-center">
            <span className="bg-gray-900 text-cyan-400 text-xs px-2 py-1 rounded shadow-lg border border-cyan-500/50">
              {Math.abs(selectionEnd - selectionStart)} frames
            </span>
          </div>
        )}
      </div>
      <div className="text-xs text-gray-500 italic text-center">Click and drag on chart to select a time window</div>
    </div>
  );
}
