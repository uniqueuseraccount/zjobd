// --- VERSION 1.0.0 ---
// - Enhanced TripChart with logarithmic scaling, proper time axis, dynamic dual scales
// - Zoom synchronization with map, proper color persistence, enhanced scroll controls

import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, LogarithmicScale, PointElement, LineElement, Title, Tooltip, Legend
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import PIDSelector from '../shared/PIDSelector';
import SamplingIndicator from '../shared/SamplingIndicator';
import { sampleData } from '../../utils/samplingUtils';
import { getDefaultVisibleRange } from '../../utils/rangeUtils';

ChartJS.register(CategoryScale, LinearScale, LogarithmicScale, PointElement, LineElement, Title, Tooltip, Legend, zoomPlugin);

// Function to determine if values need logarithmic scaling
function needsLogScale(values) {
  const validValues = values.filter(v => typeof v === 'number' && v > 0);
  if (validValues.length === 0) return false;
  
  const min = Math.min(...validValues);
  const max = Math.max(...validValues);
  
  // Use log scale if range spans more than 2 orders of magnitude
  return (max / min) > 100;
}

// Function to group PIDs by scale requirements
function groupPIDsByScale(selectedPIDs, windowData) {
  const pidGroups = { primary: [], secondary: [] };
  const pidStats = {};
  
  selectedPIDs.forEach((pid, idx) => {
    if (!pid || pid === 'none') return;
    
    const values = windowData.map(row => row?.[pid]).filter(v => typeof v === 'number');
    if (values.length === 0) return;
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    
    pidStats[pid] = { min, max, range, idx };
  });
  
  const pidEntries = Object.entries(pidStats);
  if (pidEntries.length === 0) return pidGroups;
  
  // Sort by range to group similar scales
  pidEntries.sort((a, b) => a[1].range - b[1].range);
  
  // If there's a large gap in ranges, split into two groups
  if (pidEntries.length > 1) {
    const ranges = pidEntries.map(([_, stats]) => stats.range);
    const maxRange = Math.max(...ranges);
    const minRange = Math.min(...ranges);
    
    // If largest range is 10x bigger than smallest, use dual scale
    if (maxRange / minRange > 10) {
      const threshold = Math.sqrt(maxRange * minRange); // Geometric mean as threshold
      
      pidEntries.forEach(([pid, stats]) => {
        if (stats.range > threshold) {
          pidGroups.secondary.push({ pid, ...stats });
        } else {
          pidGroups.primary.push({ pid, ...stats });
        }
      });
    } else {
      // All PIDs use primary scale
      pidEntries.forEach(([pid, stats]) => {
        pidGroups.primary.push({ pid, ...stats });
      });
    }
  } else {
    // Single PID uses primary scale
    pidEntries.forEach(([pid, stats]) => {
      pidGroups.primary.push({ pid, ...stats });
    });
  }
  
  return pidGroups;
}

export default function TripChart({
  log,
  selectedPIDs = [],
  onPIDChange = () => {},
  chartColors = [],
  visibleRange = { min: 0, max: 0 },
  setVisibleRange = () => {},
  onChartZoom = () => {}
}) {
  const chartRef = useRef(null);
  const [isZoomed, setIsZoomed] = useState(false);

  const dataRef = useMemo(() => log?.data || [], [log]);
  const colsRef = useMemo(() => log?.columns || [], [log]);

  const windowData = useMemo(() => {
    const min = Math.max(0, visibleRange?.min ?? 0);
    const max = Math.min((dataRef.length - 1), visibleRange?.max ?? 0);
    if (dataRef.length === 0 || max < min) return [];
    return dataRef.slice(min, max + 1);
  }, [dataRef, visibleRange]);

  // Generate time labels based on elapsed time from start
  const timeLabels = useMemo(() => {
    if (windowData.length === 0) return [];
    
    const startTs = Number(dataRef[0]?.timestamp ?? 0);
    
    return windowData.map(row => {
      const currentTs = Number(row?.timestamp ?? 0);
      const elapsedMs = currentTs - startTs;
      const elapsedSec = Math.max(0, Math.floor(elapsedMs / 1000));
      
      const hours = Math.floor(elapsedSec / 3600);
      const minutes = Math.floor((elapsedSec % 3600) / 60);
      const seconds = elapsedSec % 60;
      
      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      } else {
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }
    });
  }, [windowData, dataRef]);

  // Group PIDs by scale requirements and prepare chart data
  const { chartData, samplingActive, useSecondaryScale } = useMemo(() => {
    const pidGroups = groupPIDsByScale(selectedPIDs, windowData);
    const datasets = [];
    let samplingFlag = false;
    const hasSecondaryScale = pidGroups.secondary.length > 0;
    
    // Process primary scale PIDs
    pidGroups.primary.forEach(({ pid, idx }) => {
      let points = windowData.map(row => row?.[pid]);
      
      if (points.length > 200) {
        points = sampleData(points, 200);
        samplingFlag = true;
      }

      datasets.push({
        label: pid,
        data: points,
        borderColor: chartColors[idx] || '#38BDF8',
        backgroundColor: chartColors[idx] || '#38BDF8',
        pointRadius: 0,
        borderWidth: 2,
        tension: 0.4,
        yAxisID: 'y'
      });
    });

    // Process secondary scale PIDs (dashed lines)
    pidGroups.secondary.forEach(({ pid, idx }) => {
      let points = windowData.map(row => row?.[pid]);
      
      if (points.length > 200) {
        points = sampleData(points, 200);
        samplingFlag = true;
      }

      datasets.push({
        label: pid,
        data: points,
        borderColor: chartColors[idx] || '#38BDF8',
        backgroundColor: chartColors[idx] || '#38BDF8',
        pointRadius: 0,
        borderWidth: 2,
        borderDash: [5, 5], // Dashed line for secondary scale
        tension: 0.4,
        yAxisID: 'y1'
      });
    });

    return {
      chartData: {
        labels: timeLabels,
        datasets
      },
      samplingActive: samplingFlag,
      useSecondaryScale: hasSecondaryScale
    };
  }, [windowData, selectedPIDs, chartColors, timeLabels]);

  // Chart options with dynamic scaling
  const chartOptions = useMemo(() => {
    // Calculate scales for primary axis
    const primaryValues = selectedPIDs
      .filter((pid, idx) => {
        if (!pid || pid === 'none') return false;
        const pidGroups = groupPIDsByScale(selectedPIDs, windowData);
        return pidGroups.primary.some(p => p.pid === pid);
      })
      .flatMap(pid => windowData.map(r => r?.[pid]).filter(v => typeof v === 'number'));

    // Calculate scales for secondary axis
    const secondaryValues = selectedPIDs
      .filter((pid, idx) => {
        if (!pid || pid === 'none') return false;
        const pidGroups = groupPIDsByScale(selectedPIDs, windowData);
        return pidGroups.secondary.some(p => p.pid === pid);
      })
      .flatMap(pid => windowData.map(r => r?.[pid]).filter(v => typeof v === 'number'));

    const scales = {
      x: { 
        ticks: { color: '#9CA3AF' },
        title: {
          display: true,
          text: 'Elapsed Time',
          color: '#9CA3AF'
        }
      },
      y: {
        type: needsLogScale(primaryValues) ? 'logarithmic' : 'linear',
        position: 'left',
        ticks: { color: '#9CA3AF' },
        title: {
          display: true,
          text: 'Primary Scale',
          color: '#9CA3AF'
        }
      }
    };

    if (useSecondaryScale) {
      scales.y1 = {
        type: needsLogScale(secondaryValues) ? 'logarithmic' : 'linear',
        position: 'right',
        ticks: { color: '#9CA3AF' },
        title: {
          display: true,
          text: 'Secondary Scale',
          color: '#9CA3AF'
        },
        grid: {
          drawOnChartArea: false
        }
      };
    }

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: { 
          display: true,
          labels: { color: '#9CA3AF' }
        },
        zoom: {
          pan: {
            enabled: true,
            mode: 'x',
            onPan: ({ chart }) => {
              const xScale = chart.scales.x;
              const visibleMin = Math.floor(xScale.min);
              const visibleMax = Math.ceil(xScale.max);
              
              // Update visible range and notify parent
              const newRange = {
                min: Math.max(0, visibleMin + (visibleRange?.min ?? 0)),
                max: Math.min(dataRef.length - 1, visibleMax + (visibleRange?.min ?? 0))
              };
              
              setVisibleRange(newRange);
              onChartZoom?.(newRange);
              setIsZoomed(true);
            }
          },
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: 'x',
            onZoom: ({ chart }) => {
              const xScale = chart.scales.x;
              const visibleMin = Math.floor(xScale.min);
              const visibleMax = Math.ceil(xScale.max);
              
              // Update visible range and notify parent
              const newRange = {
                min: Math.max(0, visibleMin + (visibleRange?.min ?? 0)),
                max: Math.min(dataRef.length - 1, visibleMax + (visibleRange?.min ?? 0))
              };
              
              setVisibleRange(newRange);
              onChartZoom?.(newRange);
              setIsZoomed(true);
            }
          }
        },
        tooltip: {
          callbacks: {
            title: function(tooltipItems) {
              return `Time: ${tooltipItems[0]?.label || ''}`;
            }
          }
        }
      },
      scales
    };
  }, [windowData, selectedPIDs, useSecondaryScale, visibleRange, dataRef.length, setVisibleRange, onChartZoom]);

  // Handle zoom buttons
  const handleZoom = useCallback((minutes) => {
    if (minutes === 'reset') {
      const fullRange = { min: 0, max: dataRef.length - 1 };
      setVisibleRange(fullRange);
      onChartZoom?.(fullRange);
      setIsZoomed(false);
      
      // Reset chart zoom
      if (chartRef.current) {
        chartRef.current.resetZoom();
      }
      return;
    }
    
    const range = getDefaultVisibleRange(dataRef, minutes * 60);
    setVisibleRange(range);
    onChartZoom?.(range);
    setIsZoomed(true);
  }, [dataRef, setVisibleRange, onChartZoom]);

  // Handle pan buttons
  const handlePan = useCallback((direction) => {
    const totalLength = dataRef.length;
    const size = (visibleRange?.max ?? 0) - (visibleRange?.min ?? 0);
    const shift = Math.floor(size / 4); // Smaller shift for smoother panning
    
    let min = visibleRange?.min ?? 0;
    if (direction === 'left') {
      min = Math.max(0, min - shift);
    } else if (direction === 'right') {
      min = Math.min(totalLength - size, min + shift);
    }
    
    const newRange = { min, max: min + size };
    setVisibleRange(newRange);
    onChartZoom?.(newRange);
  }, [dataRef.length, visibleRange, setVisibleRange, onChartZoom]);

  // Calculate scroll bar dimensions
  const { scrollWidthPercent, scrollLeftPercent } = useMemo(() => {
    const total = dataRef.length;
    const size = (visibleRange?.max ?? 0) - (visibleRange?.min ?? 0);
    const widthPct = total > 0 ? Math.max((size / total) * 100, 2) : 100;
    const leftPct = total > 0 ? ((visibleRange?.min ?? 0) / total) * 100 : 0;
    return { scrollWidthPercent: widthPct, scrollLeftPercent: leftPct };
  }, [dataRef.length, visibleRange]);

  // Handle PID changes while preserving colors
  const handlePIDChange = useCallback((index, value) => {
    onPIDChange(index, value);
  }, [onPIDChange]);

  const isFullyZoomedOut = (visibleRange?.min ?? 0) === 0 && (visibleRange?.max ?? 0) === dataRef.length - 1;

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-4 space-y-3">
      {/* PID Selectors */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        {selectedPIDs.map((pid, index) => (
          <PIDSelector
            key={index}
            color={chartColors[index] || '#38BDF8'}
            options={colsRef}
            selectedValue={pid}
            onChange={(value) => handlePIDChange(index, value)}
          />
        ))}
      </div>

      {/* Sampling Indicator */}
      <SamplingIndicator active={samplingActive && !isZoomed} />

      {/* Zoom Controls */}
      <div className="flex space-x-2 text-sm">
        <button 
          onClick={() => handleZoom(2)} 
          className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
        >
          2min
        </button>
        <button 
          onClick={() => handleZoom(5)} 
          className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
        >
          5min
        </button>
        <button 
          onClick={() => handleZoom(10)} 
          className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
        >
          10min
        </button>
        <button 
          onClick={() => handleZoom('reset')} 
          disabled={isFullyZoomedOut}
          className={`px-3 py-1 rounded transition-colors ${
            isFullyZoomedOut 
              ? 'bg-gray-600 text-gray-500 cursor-not-allowed' 
              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
          }`}
        >
          Reset
        </button>
      </div>

      {/* Chart */}
      <div className="h-[56vh]">
        <Line ref={chartRef} options={chartOptions} data={chartData} />
      </div>

      {/* Pan Controls and Scroll Bar */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => handlePan('left')}
          disabled={(visibleRange?.min ?? 0) <= 0}
          className={`px-3 py-1 rounded transition-colors ${
            (visibleRange?.min ?? 0) <= 0
              ? 'bg-gray-600 text-gray-500 cursor-not-allowed'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
          }`}
        >
          ←
        </button>

        <div className="flex-1 h-3 bg-gray-600 rounded relative overflow-hidden cursor-pointer">
          <div
            className="absolute top-0 h-3 bg-blue-400 rounded transition-all duration-200"
            style={{
              width: `${scrollWidthPercent}%`,
              left: `${scrollLeftPercent}%`
            }}
          />
        </div>

        <button
          onClick={() => handlePan('right')}
          disabled={(visibleRange?.max ?? 0) >= dataRef.length - 1}
          className={`px-3 py-1 rounded transition-colors ${
            (visibleRange?.max ?? 0) >= dataRef.length - 1
              ? 'bg-gray-600 text-gray-500 cursor-not-allowed'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
          }`}
        >
          →
        </button>
      </div>

      {/* Scale Legend */}
      {useSecondaryScale && (
        <div className="text-xs text-gray-400 text-center">
          Solid lines: Left scale | Dashed lines: Right scale
        </div>
      )}
    </div>
  );
}