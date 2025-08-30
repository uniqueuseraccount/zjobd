### This file contains all of the source code for the front end files contained within the src directory: ###
### ~/zjobd/frontend/src/ ###

### App.css ###
.App {
  text-align: center;
}

.App-logo {
  height: 40vmin;
  pointer-events: none;
}

@media (prefers-reduced-motion: no-preference) {
  .App-logo {
    animation: App-logo-spin infinite 20s linear;
  }
}

.App-header {
  background-color: #282c34;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: calc(10px + 2vmin);
  color: white;
}

.App-link {
  color: #61dafb;
}

@keyframes App-logo-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

### App.js ###
// FILE: frontend/src/App.js
//
// --- VERSION 1.8.0 ---
// - Added new route for the "Tools" page.
// - Added a navigation link to the new "Tools" page in the header.
// -----------------------------

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import LogList from './LogList';
import LogDetail from './LogDetail';
import TripGroupList from './TripGroupList';
import TripGroupDetail from './TripGroupDetail';
import Tools from './Tools'; // New

function App() {
  return (
    <Router>
      <div className="bg-gray-900 text-white min-h-screen font-sans">
        <div className="container mx-auto p-4 md:p-8">
          <header className="mb-8 flex justify-between items-center border-b border-gray-700 pb-4">
            <Link to="/" className="text-4xl font-bold text-cyan-400 hover:text-cyan-300 no-underline">
              Jeep Diagnostics Dashboard
            </Link>
            <nav className="flex items-center space-x-6">
              <Link to="/trip-groups" className="text-lg text-gray-300 hover:text-cyan-400">
                Trip Groups
              </Link>
              <Link to="/tools" className="text-lg text-gray-300 hover:text-cyan-400">
                Tools
              </Link>
            </nav>
          </header>
          <main>
            <Routes>
              <Route path="/" element={<LogList />} />
              <Route path="/logs/:logId" element={<LogDetail />} />
              <Route path="/trip-groups" element={<TripGroupList />} />
              <Route path="/trip-groups/:groupId" element={<TripGroupDetail />} />
              <Route path="/tools" element={<Tools />} />
            </Routes>
          </main>
          <footer className="text-center mt-8 text-gray-500 text-sm">
            <p>Jeep Log Processor v1.8.0</p>
          </footer>
        </div>
      </div>
    </Router>
  );
}

export default App;

### App.test.js ###
### This file might be leftover and unneccessary to keep ###
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders learn react link', () => {
  render(<App />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});

### index.css ###
@tailwind base;
@tailwind components;
@tailwind utilities;

### index.js ###
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

### LogDetail.js ###
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
				label: pid, data: log.data.map(row => row[pid]), borderColor: CHART_COLORS[index], yAxisID: `y${index}`, pointRadius: 0, borderWidth: 2,
			});
		});

		if (comparisonLog) {
			activePIDs.forEach((pid, index) => {
				datasets.push({
					label: `${pid} (Comp)`, data: comparisonLog.data.map(row => row[pid]), borderColor: COMPARISON_COLORS[index], borderDash: [5, 5], yAxisID: `y${index}`, pointRadius: 0, borderWidth: 2,
				});
			});
		}
		return { labels: log.data.map((_, i) => i), datasets };
	}, [log, selectedPIDs, comparisonLog]);

	const chartOptions = useMemo(() => {
		const scales = { x: { ticks: { 
			callback: function(value) {
				if(log && log.data[value]) {
					const seconds = log.data[value].timestamp - log.data[0].timestamp;
					const minutes = Math.floor(seconds / 60);
					const remSeconds = seconds % 60;
					return `${minutes}m ${remSeconds}s`;
				}
				return value;
			}
		}}};
		
		const activePIDs = selectedPIDs.filter(p => p !== 'none');
		activePIDs.forEach((pid, index) => {
			scales[`y${index}`] = { 
				type: 'linear', 
				display: true, 
				position: index % 2 === 0 ? 'left' : 'right', 
				grid: { drawOnChartArea: index === 0 }, 
				ticks: {color: CHART_COLORS[index]},
				title: { display: true, text: pid.replace(/_/g, ' '), color: CHART_COLORS[index] }
			};
		});

		return {
			responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, animation: false,
			plugins: {
				legend: { display: false },
				zoom: {
					pan: { enabled: true, mode: 'x', onPanComplete: ({chart}) => setVisibleRange({min: Math.round(chart.scales.x.min), max: Math.round(chart.scales.x.max)}) },
					zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x', onZoomComplete: ({chart}) => setVisibleRange({min: Math.round(chart.scales.x.min), max: Math.round(chart.scales.x.max)}) }
				}
			},
			scales: scales
		}
	}, [log]);

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
				<TripMap primaryPath={log.data} comparisonPath={comparisonLog?.data} columns={log.columns} visibleRange={visibleRange} />
			</div>
		</div>
	);
}

export default LogDetail;

### LogList.js ###
// FILE: frontend/src/LogList.js
//
// --- VERSION 1.0.0 ---
// - This is the new home for the log list component, previously in App.js.
// - It now uses `useNavigate` from `react-router-dom` to make each row
//   a clickable link that navigates to the detail page for that log.
// -----------------------------

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function LogList() {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('Loading...');
  const navigate = useNavigate();

  useEffect(() => {
	const fetchLogs = async () => {
	  try {
		const response = await axios.get('http://localhost:5001/api/logs');
		setLogs(response.data);
		if (response.data.length === 0) {
		  setStatus('No logs found. Add CSV files to the logs folder!');
		}
	  } catch (error) {
		console.error("Error fetching logs:", error);
		setStatus('Could not connect to the backend. Is the Flask server running?');
	  }
	};
	fetchLogs();
  }, []);

  const formatTimestamp = (unixTimestamp) => new Date(unixTimestamp * 1000).toLocaleString();
  const formatDuration = (seconds) => {
	if (seconds < 0) return '00:00';
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = Math.floor(seconds % 60);
	return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  const handleRowClick = (logId) => {
	navigate(`/logs/${logId}`);
  };

  return (
	<div className="bg-gray-800 rounded-lg shadow-xl p-4">
	  <div className="overflow-x-auto">
		{logs.length > 0 ? (
		  <table className="w-full text-left">
			<thead className="border-b-2 border-cyan-500">
			  <tr>
				<th className="p-3">Log File</th>
				<th className="p-3">Trip Start Time</th>
				<th className="p-3 text-right">Duration (min:sec)</th>
			  </tr>
			</thead>
			<tbody>
			  {logs.map((log) => (
				<tr 
				  key={log.log_id} 
				  className="border-b border-gray-700 hover:bg-gray-700/50 cursor-pointer"
				  onClick={() => handleRowClick(log.log_id)}
				>
				  <td className="p-3 font-mono">{log.file_name}</td>
				  <td className="p-3">{formatTimestamp(log.start_timestamp)}</td>
				  <td className="p-3 text-right font-mono">{formatDuration(log.trip_duration_seconds)}</td>
				</tr>
			  ))}
			</tbody>
		  </table>
		) : (
		  <p className="text-center text-gray-400 py-8">{status}</p>
		)}
	  </div>
	</div>
  );
}

export default LogList;

### Tools.js ###
// FILE: frontend/src/Tools.js

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

function StatCard({ title, value }) {
	return (
		<div className="bg-gray-700 p-4 rounded-lg text-center">
			<p className="text-sm text-gray-400">{title}</p>
			<p className="text-2xl font-bold text-cyan-400">{value}</p>
		</div>
	);
}

function Tools() {
	const [sensitivity, setSensitivity] = useState(3);
	const [preview, setPreview] = useState(null);
	const [currentStats, setCurrentStats] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [applyStatus, setApplyStatus] = useState('');

	const fetchCurrentStats = useCallback(async () => {
		setIsLoading(true);
		try {
			const response = await axios.get('http://localhost:5001/api/trip-groups/summary');
			setCurrentStats(response.data);
		} catch (error) {
			console.error("Error fetching current stats:", error);
		}
		setIsLoading(false);
	}, []);

	useEffect(() => {
		fetchCurrentStats();
	}, [fetchCurrentStats]);

	const handlePreview = useCallback(async () => {
		setIsLoading(true);
		setApplyStatus('');
		try {
			const response = await axios.post('http://localhost:5001/api/trip-groups/preview', { sensitivity });
			setPreview(response.data);
		} catch (error) {
			console.error("Error fetching preview:", error);
			setPreview({ error: "Could not fetch preview." });
		}
		setIsLoading(false);
	}, [sensitivity]);

	const handleApply = async () => {
		setIsLoading(true);
		setApplyStatus('Applying new grouping...');
		try {
			const response = await axios.post('http://localhost:5001/api/trips/apply-grouping', { sensitivity });
			setApplyStatus(response.data.message || 'Grouping applied successfully!');
			fetchCurrentStats();
		} catch (error) {
			setApplyStatus('An error occurred while applying the new grouping.');
		}
		setIsLoading(false);
	};

	return (
		<div className="bg-gray-800 rounded-lg shadow-xl p-6 space-y-6">
			<div>
				<h3 className="text-xl font-semibold">Trip Grouping Sensitivity</h3>
				<p className="text-gray-400 mt-1 mb-4">
					Adjust the "fuzziness" for automatic trip grouping. A higher number is more strict (less fuzzy). The default is 3. A lower number is less strict (more fuzzy).
				</p>
				<div className="flex items-center space-x-4">
					<input type="range" min="2" max="5" step="1" value={sensitivity} onChange={(e) => setSensitivity(parseInt(e.target.value))} className="w-64" />
					<span className="font-mono text-lg">{sensitivity}</span>
					<button onClick={handlePreview} disabled={isLoading} className="bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded-md disabled:opacity-50">
						{isLoading ? 'Loading...' : 'Preview'}
					</button>
					<button onClick={handleApply} disabled={isLoading} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-md disabled:opacity-50">
						Apply
					</button>
				</div>
				{applyStatus && <p className="mt-4 text-yellow-400">{applyStatus}</p>}
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div>
					<h4 className="font-bold text-lg mb-2">Current Stats</h4>
					{currentStats ? (
						<div className="grid grid-cols-2 gap-4">
							<StatCard title="Total Groups (>1 trip)" value={currentStats.total_groups} />
							<StatCard title="Trips in Groups" value={`${currentStats.total_trips_grouped} / ${currentStats.total_logs}`} />
							<StatCard title="Groups of 2" value={currentStats.group_counts.groups_of_2} />
							<StatCard title="Groups of 5+" value={currentStats.group_counts.groups_of_5_plus} />
						</div>
					) : <p>Loading...</p>}
				</div>
				<div>
					<h4 className="font-bold text-lg mb-2">Preview Stats (Sensitivity: {sensitivity})</h4>
					{preview ? (
						<div className="grid grid-cols-2 gap-4">
							<StatCard title="Total Groups (>1 trip)" value={preview.total_groups} />
							<StatCard title="Trips in Groups" value={preview.total_trips_grouped} />
							<StatCard title="Groups of 2" value={preview.group_counts.groups_of_2} />
							<StatCard title="Groups of 5+" value={preview.group_counts.groups_of_5_plus} />
						</div>
					) : <p className="text-gray-400">Press Preview to see results.</p>}
				</div>
			</div>
		</div>
	);
}

export default Tools;

### TripGroupDetail.js ###
// FILE: frontend/src/TripGroupDetail.js
//
// --- VERSION 1.9.7-ALPHA ---
// - FIXED: The `gpsData is not defined` runtime error.
// ----------------------------

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import TripMap from './TripMap';

ChartJS.register( CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend );

const CHART_COLORS = [ '#38BDF8', '#F59E0B', '#4ADE80', '#F472B6', '#A78BFA', '#2DD4BF', '#FB7185', '#FACC15', '#818CF8', '#FDE047' ];

function TripGroupDetail() {
	const { groupId } = useParams();
	const [groupData, setGroupData] = useState(null);
	const [availablePIDs, setAvailablePIDs] = useState([]);
	const [selectedPID, setSelectedPID] = useState('engine_rpm');
	const [status, setStatus] = useState('Loading group data...');

	useEffect(() => {
		const fetchGroupData = async () => {
			try {
				const response = await axios.get(`http://localhost:5001/api/trip-groups/${groupId}`);
				setGroupData(response.data);

				const firstLogData = Object.values(response.data.log_data)[0] || [];
				if (firstLogData.length > 0) {
					const uniquePids = Object.keys(firstLogData[0] || {}).filter(p => !['data_id', 'timestamp', 'operating_state'].includes(p));
					setAvailablePIDs(uniquePids.sort());
				}
			} catch (error) {
				console.error("Error fetching group detail:", error);
				setStatus('Failed to load group data.');
			}
		};
		fetchGroupData();
	}, [groupId]);

	const chartData = useMemo(() => {
		if (!groupData || !selectedPID) return null;

		const datasets = groupData.logs.map((log, index) => {
			const logData = groupData.log_data[log.log_id] || [];
			return {
				label: new Date(log.start_timestamp * 1000).toLocaleDateString(),
				data: logData.map(row => ({
					x: row.timestamp - log.start_timestamp,
					y: row[selectedPID]
				})),
				borderColor: CHART_COLORS[index % CHART_COLORS.length],
				backgroundColor: `${CHART_COLORS[index % CHART_COLORS.length]}80`,
				tension: 0.4,
				pointRadius: 0,
				borderWidth: 2,
			};
		});
		return { datasets };
	}, [groupData, selectedPID]);

	const chartOptions = {
		responsive: true,
		maintainAspectRatio: false,
		interaction: { mode: 'index', intersect: false },
		plugins: {
			title: { display: true, text: `Comparison for PID: ${selectedPID}`, color: '#FFFFFF', font: { size: 18 } },
			legend: { position: 'bottom', labels: { color: '#FFFFFF' } },
		},
		scales: {
			x: { type: 'linear', title: { display: true, text: 'Time since trip start (seconds)', color: '#9CA3AF' }, ticks: { color: '#9CA3AF' } },
			y: { title: { display: true, text: selectedPID.replace(/_/g, ' '), color: '#9CA3AF' }, ticks: { color: '#9CA3AF' } },
		},
	};

	return (
		<div className="space-y-6">
			<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
				<div className="md:col-span-3 bg-gray-800 rounded-lg shadow-xl p-4 h-[70vh]">
					{chartData ? ( <Line options={chartOptions} data={chartData} /> ) : ( <p className="flex items-center justify-center h-full text-gray-400">{status}</p> )}
				</div>
				<div className="md:col-span-1 bg-gray-800 rounded-lg shadow-xl p-4">
					<h3 className="text-lg font-bold border-b-2 border-cyan-500 pb-2 mb-3">Logs in this Group</h3>
					<div className="flex flex-col space-y-1 max-h-[30vh] overflow-y-auto">
						{groupData?.logs.map(log => (
							<Link key={log.log_id} to={`/logs/${log.log_id}`} className="text-left p-2 rounded-md text-sm hover:bg-gray-700 text-cyan-400">
								{log.file_name}
							</Link>
						))}
					</div>
					<h3 className="text-lg font-bold border-b-2 border-cyan-500 pb-2 my-3">Select PID to Compare</h3>
					<div className="flex flex-col space-y-1 max-h-[30vh] overflow-y-auto">
						{availablePIDs.map(pid => (
							<button key={pid} onClick={() => setSelectedPID(pid)} className={`text-left p-2 rounded-md text-sm ${selectedPID === pid ? 'bg-cyan-600 font-bold' : 'hover:bg-gray-700'}`}>
								{pid.replace(/_/g, ' ')}
							</button>
						))}
					</div>
				</div>
			</div>
			{groupData && groupData.gps_data && (
				<div className="bg-gray-800 rounded-lg shadow-xl p-4 h-[60vh]">
					<TripMap 
						positions={Object.values(groupData.gps_data)} 
						multiRoute={true} 
						columns={['latitude', 'longitude', 'operating_state']} // Pass a generic columns array
						labels={groupData.logs.map(l => new Date(l.start_timestamp * 1000).toLocaleDateString())}
					/>
				</div>
			)}
		</div>
	);
}

export default TripGroupDetail;

### TripMap.js ###
### I will note before the gemini beddie poopoo disaster, I had instructed it to always use a versioning system like you'll see in teh beginning comments of this file. I wanted to freeze the versions at a maximimum of 1.9.4 alpha, with minor iterations getting an updated .4.1; .4.2 and so on, and any refactors or major updates at this point to max out at 1.9.7 - but we werent supposed to be working on feature updates, simply getting the basic stuff working, so I didn't think it would be necessary to go past 1.9.7, until we got to that point. When Gemini started feeding me code that was versioned 1.8.0, or started dropping the top code comments altogether, that was one of the major signs shit was going pear shaped. As we go forward on this project, I know you talked about keeping an md dev log, etc - which Im on board with, please include whatever updates you think should add to that as we go, but, also, can you include these header comments with code versions and some notes about what was changed in the file, if nothing else as a fall back sanity check? ###

// FILE: frontend/src/TripMap.js
//
// --- VERSION 1.9.7-ALPHA ---
// - FIXED: Removed unused `Tooltip` import to resolve console warning.
// ---------------------------

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const STATE_COLORS = { "Closed Loop (Idle)": "#34D399", "Closed Loop (City)": "#60A5FA", "Closed Loop (Highway)": "#38BDF8", "Open Loop (WOT Accel)": "#F87171", "Open Loop (Decel Fuel Cut)": "#FBBF24", "Open Loop (Cold Start)": "#A78BFA", "default": "#9CA3AF" };
const COMPARISON_COLOR = "#6B7280";

const CHART_COLORS = [ '#38BDF8', '#F59E0B', '#4ADE80', '#F472B6', '#A78BFA', '#2DD4BF', '#FB7185', '#FACC15', '#818CF8', '#FDE047' ];

function MapController({ bounds }) {
	const map = useMap();
	useEffect(() => {
		if (bounds && bounds.length === 2 && bounds[0][0] !== Infinity) {
			map.fitBounds(bounds, { padding: [50, 50] });
		}
	}, [bounds, map]);
	return null;
}

function TripMap({ primaryPath, comparisonPath, columns, visibleRange, multiRoute = false, labels = [] }) {
	const latCol = columns.find(c => c.includes('latitude'));
	const lonCol = columns.find(c => c.includes('longitude'));

	const getPathSegments = (path) => {
		if (!path || !latCol || !lonCol) return [];
		const segments = [];
		let currentSegment = { color: STATE_COLORS.default, points: [] };
		path.forEach(row => {
			const stateColor = STATE_COLORS[row.operating_state] || STATE_COLORS.default;
			const point = [row[latCol], row[lonCol]];
			if (point[0] && point[1] && point[0] !== 0) {
				if (stateColor !== currentSegment.color && currentSegment.points.length > 0) {
					segments.push(currentSegment);
					currentSegment = { color: stateColor, points: [currentSegment.points[currentSegment.points.length - 1]] };
				}
				currentSegment.color = stateColor;
				currentSegment.points.push(point);
			}
		});
		if (currentSegment.points.length > 1) segments.push(currentSegment);
		return segments;
	};
	
	const getBounds = () => {
		if (multiRoute) {
			const allPoints = primaryPath.flat().filter(p => p[0] && p[1] && p[0] !== 0);
			if (allPoints.length === 0) return [[44.97, -93.26], [44.98, -93.27]];
			const latitudes = allPoints.map(p => p[0]);
			const longitudes = allPoints.map(p => p[1]);
			return [[Math.min(...latitudes), Math.min(...longitudes)], [Math.max(...latitudes), Math.max(...longitudes)]];
		}
		
		const path = primaryPath.slice(visibleRange.min, visibleRange.max + 1);
		const points = path.map(row => [row[latCol], row[lonCol]]).filter(p => p[0] && p[1] && p[0] !== 0);
		if (points.length === 0) return [[44.97, -93.26], [44.98, -93.27]];
		const latitudes = points.map(p => p[0]);
		const longitudes = points.map(p => p[1]);
		return [[Math.min(...latitudes), Math.min(...longitudes)], [Math.max(...latitudes), Math.max(...longitudes)]];
	};

	const bounds = getBounds();
	const primarySegments = multiRoute ? [] : getPathSegments(primaryPath);
	const comparisonSegments = comparisonPath ? getPathSegments(comparisonPath) : [];




	return (
		<MapContainer bounds={bounds} style={{ height: '400px', width: '100%', backgroundColor: '#1F2937', borderRadius: '0.5rem' }}>
			<MapController bounds={bounds} />
			<TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
			
			{multiRoute ? (
				primaryPath.map((path, index) => (
					<Polyline key={`multi-${index}`} positions={path.map(p => [p.latitude, p.longitude])} color={CHART_COLORS[index % CHART_COLORS.length]} />
				))
			) : (
				<>
					{comparisonPath && comparisonSegments.map((segment, index) => <Polyline key={`comp-${index}`} positions={segment.points} color={COMPARISON_COLOR} weight={5} opacity={0.6} dashArray="5, 10" />)}
					{primarySegments.map((segment, index) => <Polyline key={index} positions={segment.points} color={segment.color} weight={5} />)}
				</>
			)}
		</MapContainer>
	);
}

export default TripMap;

### There are some other files in the src directory, like setupTests.js, reportWebVitals.js, and logo.svg that I think are basically default files for react projects or something along those lines and I can either ignore, or maybe even delete? ###

