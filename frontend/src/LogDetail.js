// FILE: frontend/src/LogDetail.js
//
// --- VERSION 1.9.7-ALPHA ---
// - FIXED: Removed unused `handleComparisonChange` function to resolve the
//   console warning.
// ---------------------------

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import TripMap from './TripMap';

ChartJS.register( CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, zoomPlugin );

const CHART_COLORS = [ '#38BDF8', '#F59E0B', '#4ADE80', '#F472B6', '#A78BFA' ];
const COMPARISON_COLORS = [ '#0284C7', '#B45309', '#16A34A', '#DB2777', '#7C3AED' ];

function PidSelector({ color, options, onChange, selectedValue }) {
	return (
		<div className="flex-1 flex items-center bg-gray-700 rounded-md p-2" style={{ borderLeft: `4px solid ${color}`}}>
			<select value={selectedValue || 'none'} onChange={e => onChange(e.target.value)} className="bg-transparent text-white w-full focus:outline-none text-sm capitalize">
				<option value="none">-- Select PID --</option>
				{options.map(opt => <option key={opt} value={opt}>{opt.replace(/_/g, ' ')}</option>)}
			</select>
		</div>
	);
}

function LogDetail() {
	const { logId } = useParams();
	const chartRef = useRef(null);
	const [log, setLog] = useState(null);
	const [selectedPIDs, setSelectedPIDs] = useState(['engine_rpm', 'vehicle_speed', 'none', 'none', 'none']);
	const [comparisonLog, setComparisonLog] = useState(null);
	const [visibleRange, setVisibleRange] = useState({ min: 0, max: 0 });

	useEffect(() => {
		const fetchLog = async () => {
			try {
				const response = await axios.get(`http://localhost:5001/api/logs/${logId}/data`);
				setLog(response.data);
				if (response.data.data.length > 0) {
					setVisibleRange({ min: 0, max: response.data.data.length - 1 });
				}
			} catch (e) { console.error(e); }
		};
		fetchLog();
		setComparisonLog(null);
	}, [logId]);

	const handlePidChange = (index, value) => {
		const newPids = [...selectedPIDs];
		newPids[index] = value === 'none' ? 'none' : value;
		setSelectedPIDs(newPids);
	};

	const handleComparisonSelect = async (newLogId) => {
		if (!newLogId || newLogId === 'none') {
			setComparisonLog(null);
			return;
		}
		const response = await axios.get(`http://localhost:5001/api/logs/${newLogId}/data`);
		setComparisonLog(response.data);
	};

	const setZoom = (minutes) => {
		const chart = chartRef.current;
		if (!chart || !log || log.data.length < 2) return;
		const timeDiff = log.data[1].timestamp - log.data[0].timestamp;
		const pointsPerSecond = timeDiff > 0 ? 1 / timeDiff : 1;
		const pointsToShow = Math.round(minutes * 60 * pointsPerSecond);
		const currentMin = Math.round(chart.scales.x.min);
		const max = Math.min(currentMin + pointsToShow, log.data.length - 1);
		chart.zoomScale('x', { min: currentMin, max: max }, 'default');
	};
	
	const chartData = useMemo(() => {
   		if (!log) return null;

    	const datasets = [];
    	const activePIDs = selectedPIDs.filter(p => p !== 'none');

    	activePIDs.forEach((pid, index) => {
       		datasets.push({
            	label: pid,
            	data: log.data.map(row => row[pid]),
            	borderColor: CHART_COLORS[index],
            	yAxisID: `y${index}`,
            	pointRadius: 0,
            	borderWidth: 2,
        	});
    	});

		if (comparisonLog) {
			activePIDs.forEach((pid, index) => {
				datasets.push({
					label: `${pid} (Comp)`,
					data: comparisonLog.data.map(row => row[pid]),
					borderColor: COMPARISON_COLORS[index],
					borderDash: [5, 5],
					yAxisID: `y${index}`,
					pointRadius: 0,
					borderWidth: 2,
				});
			});	
		}	

    	return {
        	labels: log.data.map((_, i) => i),
        	datasets
    	};
	}, [log, selectedPIDs, comparisonLog]);

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

    const activePIDs = selectedPIDs.filter(p => p !== 'none');
    activePIDs.forEach((pid, index) => {
        scales[`y${index}`] = {
            type: 'linear',
            display: true,
            position: index % 2 === 0 ? 'left' : 'right',
            grid: { drawOnChartArea: index === 0 },
            ticks: { color: CHART_COLORS[index] },
            title: { display: true, text: pid.replace(/_/g, ' '), color: CHART_COLORS[index] }
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
                    onPanComplete: ({ chart }) =>
                        setVisibleRange({
                            min: Math.round(chart.scales.x.min),
                            max: Math.round(chart.scales.x.max)
                        })
                },
                zoom: {
                    wheel: { enabled: true },
                    pinch: { enabled: true },
                    mode: 'x',
                    onZoomComplete: ({ chart }) =>
                        setVisibleRange({
                            min: Math.round(chart.scales.x.min),
                            max: Math.round(chart.scales.x.max)
                        })
                }
            }
        },
        scales: scales
    };
}, [log, selectedPIDs]);

	if (!log) return <p className="text-center">Loading log data...</p>;
	
	return (
		<div className="space-y-6">
			<div className="bg-gray-800 p-4 rounded-lg shadow-xl text-sm">
				<h2 className="text-xl font-bold text-cyan-400">{log.trip_info.file_name}</h2>
				<div className="flex flex-wrap gap-x-6 gap-y-2 text-gray-300 mt-2 items-center">
					<span>Length: <span className="font-mono">{log.data.length} rows</span></span>
					<span>Trip Start: <span className="font-mono">{new Date(log.data[0].timestamp * 1000).toLocaleString()}</span></span>
					<span>Duration: <span className="font-mono">{Math.floor(log.trip_info.trip_duration_seconds / 60)}m {Math.round(log.trip_info.trip_duration_seconds % 60)}s</span></span>
					<span>Distance: <span className="font-mono">{log.trip_info.distance_miles ? log.trip_info.distance_miles.toFixed(2) : 'N/A'} miles</span></span>
					{log.group_logs.length > 1 && 
						<div className="flex items-center space-x-2">
							<span>Group: <Link to={`/trip-groups/${log.trip_info.trip_group_id}`} className="text-cyan-400 hover:underline">[{log.group_logs.length} Logs]</Link></span>
							<select onChange={(e) => handleComparisonSelect(e.target.value)} className="bg-gray-700 text-white p-1 rounded-md text-xs">
								<option value="none">-- Compare With --</option>
								{log.group_logs.filter(gl => gl.log_id !== parseInt(logId)).map(gl => (
									<option key={gl.log_id} value={gl.log_id}>{new Date(gl.start_timestamp * 1000).toLocaleDateString()}</option>
								))}
							</select>
						</div>
					}
				</div>
			</div>

			<div className="flex items-center space-x-4">
				{selectedPIDs.map((pid, index) => <PidSelector key={index} color={CHART_COLORS[index]} options={log.columns.filter(c => !['data_id', 'timestamp', 'operating_state'].includes(c))} selectedValue={pid} onChange={(value) => handlePidChange(index, value)} />)}
			</div>

			<div className="bg-gray-800 rounded-lg shadow-xl p-4 h-[60vh] relative">
				<Line ref={chartRef} options={chartOptions} data={chartData} />
				<div className="absolute bottom-4 right-4 flex space-x-2 bg-gray-900/50 p-1 rounded-md">
					<span className="text-gray-400 text-sm self-center">Zoom:</span>
					<button onClick={() => setZoom(2)} className="bg-gray-700 px-2 py-1 text-xs rounded hover:bg-gray-600">2min</button>
					<button onClick={() => setZoom(5)} className="bg-gray-700 px-2 py-1 text-xs rounded hover:bg-gray-600">5min</button>
					<button onClick={() => setZoom(10)} className="bg-gray-700 px-2 py-1 text-xs rounded hover:bg-gray-600">10min</button>
					<button onClick={() => chartRef.current.resetZoom()} className="bg-gray-700 px-2 py-1 text-xs rounded hover:bg-gray-600">Reset</button>
				</div>
			</div>

			<div className="bg-gray-800 rounded-lg shadow-xl p-4 h-[60vh]">
				<TripMap
					primaryPath={log?.data || []}
					comparisonPath={comparisonLog?.data || []}
					columns={log?.columns || []}
					visibleRange={visibleRange}
					multiRoute={false}
				/>
			</div>
		</div>
	);
}

export default LogDetail;