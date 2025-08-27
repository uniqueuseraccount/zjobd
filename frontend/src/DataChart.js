// In frontend/src/DataChart.js

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import { generateColorGradient } from './colorUtils';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, zoomPlugin);

// --- FIX: Statically map dropdown keys to their color/axis properties ---
const pidConfig = {
    pid1: { colorSet: { main: '#00fffa', dark: '#005554' }, yAxisID: 'y1' },
    pid2: { colorSet: { main: '#f000ff', dark: '#500055' }, yAxisID: 'y2' },
    pid3: { colorSet: { main: '#ffe600', dark: '#554d00' }, yAxisID: 'y3' },
};
// Note: I've corrected the second color to be Magenta as you intended.

const DataChart = ({ groupData, onTimeRangeChange }) => {
    const chartRef = useRef(null);
    const [selectedPids, setSelectedPids] = useState({
        pid1: 'Engine RPM', pid2: 'None', pid3: 'None',
    });
    
    const datasets = Object.entries(selectedPids)
        .filter(([, pidName]) => pidName && pidName !== 'None')
        .flatMap(([pidKey, pidName]) => {
            const config = pidConfig[pidKey];
            const numLogs = groupData.logs.length;
            const colors = generateColorGradient(config.colorSet.main, config.colorSet.dark, numLogs);

            const pidNameToSanitizedMap = groupData.logs.reduce((acc, log) => {
                const logId = log.log_id;
                // Use the full normalized_names map which is now correctly passed
                Object.entries(groupData.normalized_names[logId]).forEach(([sanitized, original]) => {
                    if (!acc[original]) acc[original] = {};
                    acc[original][logId] = sanitized;
                });
                return acc;
            }, {});

            return groupData.logs.map((log, logIndex) => {
                const logId = log.log_id;
                const logData = groupData.all_data[logId] || [];
                const pidSanitized = pidNameToSanitizedMap[pidName]?.[logId];
                
                if (logData.length < 1 || !pidSanitized) return null;
                const startTime = logData[0].timestamp;
                const data = logData.map(d => ({
                    x: (d.timestamp - startTime) / 1000,
                    y: d[pidSanitized]
                }));
                
                return {
                    label: `${log.file_name} - ${pidName}`, data,
                    borderColor: colors[logIndex], backgroundColor: colors[logIndex],
                    yAxisID: config.yAxisID,
                    tension: 0.2, pointRadius: 0, borderWidth: 2,
                };
            }).filter(Boolean);
        });

    const handlePidChange = (pidKey, value) => {
        setSelectedPids(prev => ({ ...prev, [pidKey]: value }));
    };

    const handleZoomOrPan = useCallback((chart) => {
        if (!chart) return;
        const { min, max } = chart.scales.x;
        onTimeRangeChange({ min, max });
    }, [onTimeRangeChange]);

    const setZoom = useCallback((minutes) => {
        const chart = chartRef.current;
        if (!chart) return;
        chart.zoomScale('x', { min: 0, max: minutes * 60 }, 'default');
        // Manually trigger the callback after setting zoom
        handleZoomOrPan(chart);
    }, [handleZoomOrPan]);

    const resetZoom = useCallback(() => {
        const chart = chartRef.current;
        if (chart) {
            chart.resetZoom('default');
            // Manually trigger the callback after resetting
            handleZoomOrPan(chart);
        }
    }, [handleZoomOrPan]);

    useEffect(() => {
        // This effect ensures the initial zoom is set correctly on load
        const chart = chartRef.current;
        if (chart) {
           const maxTime = Math.max(...Object.values(groupData.all_data).flat().map(d => d.timestamp));
           const minTime = Math.min(...Object.values(groupData.all_data).flat().map(d => d.timestamp));
           if (maxTime > minTime) {
               setZoom(10);
           }
        }
    }, [groupData, setZoom]);

    const options = {
        responsive: true, maintainAspectRatio: false, animation: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
            x: { type: 'linear', title: { display: true, text: 'Elapsed Time (seconds)' } },
            y1: { type: 'linear', display: selectedPids.pid1 !== 'None', position: 'left', title: { display: true, text: selectedPids.pid1, color: pidConfig.pid1.colorSet.main }, ticks: { color: pidConfig.pid1.colorSet.main } },
            y2: { type: 'linear', display: selectedPids.pid2 !== 'None', position: 'left', grid: { drawOnChartArea: false }, title: { display: true, text: selectedPids.pid2, color: pidConfig.pid2.colorSet.main }, ticks: { color: pidConfig.pid2.colorSet.main } },
            y3: { type: 'linear', display: selectedPids.pid3 !== 'None', position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: selectedPids.pid3, color: pidConfig.pid3.colorSet.main }, ticks: { color: pidConfig.pid3.colorSet.main } },
        },
        plugins: {
            title: { display: true, text: 'Trip Group Log Comparison' },
            zoom: {
                pan: { enabled: true, mode: 'x', onPanComplete: ({chart}) => handleZoomOrPan(chart) },
                zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x', onZoomComplete: ({chart}) => handleZoomOrPan(chart) },
            }
        },
    };

    const pidSelector = (pidKey) => (
        <select value={selectedPids[pidKey]} onChange={(e) => handlePidChange(pidKey, e.target.value)} style={{ borderColor: pidConfig[pidKey].colorSet.main, color: pidConfig[pidKey].colorSet.main, marginRight: '10px' }}>
            <option>None</option>
            {groupData.combined_pids.map(pid => <option key={pid} value={pid}>{pid}</option>)}
        </select>
    );

    return (
        <div>
            <div className="controls" style={{ padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    {pidSelector('pid1')}
                    {pidSelector('pid2')}
                    {pidSelector('pid3')}
                </div>
                <div>
                    <button onClick={() => setZoom(2)}>2m</button>
                    <button onClick={() => setZoom(5)}>5m</button>
                    <button onClick={() => setZoom(10)}>10m</button>
                    <button onClick={resetZoom} style={{ marginLeft: '10px' }}>Reset Zoom</button>
                </div>
            </div>
            <div style={{ height: '480px' }}>
                <Line ref={chartRef} options={options} data={{ datasets }} />
            </div>
        </div>
    );
};

export default DataChart;