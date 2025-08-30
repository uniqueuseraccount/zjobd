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

	// Add this near the top of LogDetail, before setZoom:
const syncingRef = useRef(false);

const setZoom = (minutes) => {
  if (!chartRef.current || !log || log.data.length < 2) return;
  const chart = chartRef.current;
  const timeDiff = log.data[1].timestamp - log.data[0].timestamp;
  const pointsPerSecond = timeDiff > 0 ? 1 / timeDiff : 1;
  const pointsToShow = Math.round(minutes * 60 * pointsPerSecond);
  const currentMin = Math.round(chart.scales.x.min);
  const max = Math.min(currentMin + pointsToShow, log.data.length - 1);

  syncingRef.current = true; // prevent map from snapping back
  chart.zoomScale('x', { min: currentMin, max }, 'default');
  setVisibleRange({ min: currentMin, max });
  setTimeout(() => { syncingRef.current = false; }, 0);
};

const handleMapBoundsRangeChange = ({ min, max }) => {
  if (!chartRef.current) return;
  syncingRef.current = true; // prevent chart from triggering map update back
  chartRef.current.zoomScale('x', { min, max }, 'default');
  setVisibleRange({ min, max });
  setTimeout(() => { syncingRef.current = false; }, 0);
};


	const chartData = useMemo(() => {
		if (!log) return null;

		const datasets = [];

		// Fixed slot-to-color mapping (no shifting when you clear a PID)
		selectedPIDs.forEach((pid, slotIndex) => {
			if (pid === 'none') return;

			datasets.push({
				label: pid,
				data: log.data.map(row => row[pid]),
				borderColor: CHART_COLORS[slotIndex],
				yAxisID: `y${slotIndex}`,
				pointRadius: 0,
				borderWidth: 2,
			});

			if (comparisonLog) {
				datasets.push({
					label: `${pid} (Comp)`,
					data: comparisonLog.data.map(row => row[pid]),
					borderColor: COMPARISON_COLORS[slotIndex],
					borderDash: [5, 5],
					yAxisID: `y${slotIndex}`,
					pointRadius: 0,
					borderWidth: 2,
				});
			}
	});

  return { labels: log.data.map((_, i) => i), datasets };
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

  // Axes per fixed slot index (colors and titles stay aligned with selectors)
  selectedPIDs.forEach((pid, slotIndex) => {
    if (pid === 'none') return;
    scales[`y${slotIndex}`] = {
      type: 'linear',
      display: true,
      position: slotIndex % 2 === 0 ? 'left' : 'right',
      grid: { drawOnChartArea: slotIndex === 0 },
      ticks: { color: CHART_COLORS[slotIndex] },
      title: { display: true, text: pid.replace(/_/g, ' '), color: CHART_COLORS[slotIndex] }
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

			<div className="bg-gray-800 rounded-lg shadow-xl p-4">
				<div className="flex justify-end items-center space-x-2 mb-2">
					<span className="text-gray-400 text-sm">Zoom:</span>
					<button onClick={() => setZoom(2)} className="bg-gray-700 px-2 py-1 text-xs rounded hover:bg-gray-600">2min</button>
					<button onClick={() => setZoom(5)} className="bg-gray-700 px-2 py-1 text-xs rounded hover:bg-gray-600">5min</button>
					<button onClick={() => setZoom(10)} className="bg-gray-700 px-2 py-1 text-xs rounded hover:bg-gray-600">10min</button>
					<button onClick={() => chartRef.current.resetZoom()} className="bg-gray-700 px-2 py-1 text-xs rounded hover:bg-gray-600">Reset</button>
				</div>
				<div className="h-[56vh]">
					<Line ref={chartRef} options={chartOptions} data={chartData} />
				</div>
			</div>

			<div className="bg-gray-800 rounded-lg shadow-xl p-4 h-[60vh]">
				<TripMap
					primaryPath={log?.data || []}
					comparisonPath={comparisonLog?.data || []}
					columns={log?.columns || []}
					visibleRange={visibleRange}
					multiRoute={false}
					onBoundsRangeChange={handleMapBoundsRangeChange}
				/>
				</div>
		</div>
	);
}

export default LogDetail;

### TripGroupDetail.js ###
// FILE: frontend/src/TripGroupDetail.js
//
// --- VERSION 1.9.7-ALPHA ---
// - FIXED: Passes `primaryPath` instead of `positions` to TripMap to match prop signature.
// - CLEANUP: Columns array passed explicitly.
// - NO OTHER LOGIC CHANGES.
//

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import TripMap from './TripMap';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const CHART_COLORS = [
  '#38BDF8', '#F59E0B', '#4ADE80', '#F472B6', '#A78BFA',
  '#2DD4BF', '#FB7185', '#FACC15', '#818CF8', '#FDE047'
];

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
          const uniquePids = Object.keys(firstLogData[0] || {})
            .filter(p => !['data_id', 'timestamp', 'operating_state'].includes(p));
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
      title: {
        display: true,
        text: `Comparison for PID: ${selectedPID}`,
        color: '#FFFFFF',
        font: { size: 18 }
      },
      legend: { position: 'bottom', labels: { color: '#FFFFFF' } },
    },
    scales: {
      x: {
        type: 'linear',
        title: { display: true, text: 'Time since trip start (seconds)', color: '#9CA3AF' },
        ticks: { color: '#9CA3AF' }
      },
      y: {
        title: { display: true, text: selectedPID.replace(/_/g, ' '), color: '#9CA3AF' },
        ticks: { color: '#9CA3AF' }
      },
    },
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-3 bg-gray-800 rounded-lg shadow-xl p-4 h-[70vh]">
          {chartData ? (
            <Line options={chartOptions} data={chartData} />
          ) : (
            <p className="flex items-center justify-center h-full text-gray-400">{status}</p>
          )}
        </div>
        <div className="md:col-span-1 bg-gray-800 rounded-lg shadow-xl p-4">
          <h3 className="text-lg font-bold border-b-2 border-cyan-500 pb-2 mb-3">Logs in this Group</h3>
          <div className="flex flex-col space-y-1 max-h-[30vh] overflow-y-auto">
            {groupData?.logs.map(log => (
              <Link
                key={log.log_id}
                to={`/logs/${log.log_id}`}
                className="text-left p-2 rounded-md text-sm hover:bg-gray-700 text-cyan-400"
              >
                {log.file_name}
              </Link>
            ))}
          </div>
          <h3 className="text-lg font-bold border-b-2 border-cyan-500 pb-2 my-3">Select PID to Compare</h3>
          <div className="flex flex-col space-y-1 max-h-[30vh] overflow-y-auto">
            {availablePIDs.map(pid => (
              <button
                key={pid}
                onClick={() => setSelectedPID(pid)}
                className={`text-left p-2 rounded-md text-sm ${
                  selectedPID === pid ? 'bg-cyan-600 font-bold' : 'hover:bg-gray-700'
                }`}
              >
                {pid.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>
      {groupData && groupData.gps_data && (
        <div className="bg-gray-800 rounded-lg shadow-xl p-4 h-[60vh]">
          <TripMap
            primaryPath={Object.values(groupData.gps_data)}
            multiRoute={true}
            columns={['latitude', 'longitude', 'operating_state']}
            labels={groupData.logs.map(l =>
              new Date(l.start_timestamp * 1000).toLocaleDateString()
            )}
          />
        </div>
      )}
    </div>
  );
}

export default TripGroupDetail;


### TripMap.js ###
// FILE: frontend/src/TripMap.js
//
// --- VERSION 1.9.7-ALPHA ---
// - FIXED: Guarded `.flat()` calls to prevent crash when primaryPath is undefined.
// - UPDATED: Map height now fills parent container instead of fixed 400px.
// - PRESERVED: All existing features, colors, and multiRoute logic.
//
// https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png
// https://tile.openstreetmap.bzh/ca/{z}/{x}/{y}.png

import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const STATE_COLORS = {
  "Closed Loop (Idle)": "#34D399",
  "Closed Loop (City)": "#60A5FA",
  "Closed Loop (Highway)": "#38BDF8",
  "Open Loop (WOT Accel)": "#F87171",
  "Open Loop (Decel Fuel Cut)": "#FBBF24",
  "Open Loop (Cold Start)": "#A78BFA",
  "default": "#38BDF8"
};

const COMPARISON_COLOR = "#22D3EE"; // cyan-300, brighter on dark map

const CHART_COLORS = [
  '#38BDF8', '#F59E0B', '#4ADE80', '#F472B6', '#A78BFA',
  '#2DD4BF', '#FB7185', '#FACC15', '#818CF8', '#FDE047'
];

function MapController({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length === 2 && bounds[0][0] !== Infinity) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
}

function MapSync({ enabled, primaryPath, columns, onBoundsRangeChange }) {
  const isSyncingRef = useRef(false);
  const map = useMapEvents({
    movestart: () => { isSyncingRef.current = false; },
    moveend: () => { if (!isSyncingRef.current) compute(); },
    zoomend: () => { if (!isSyncingRef.current) compute(); }
  });

  function compute() {
    if (!enabled || !onBoundsRangeChange || !primaryPath || primaryPath.length === 0) return;
    const latCol = columns.find(c => c.includes('latitude'));
    const lonCol = columns.find(c => c.includes('longitude'));
    if (!latCol || !lonCol) return;

    const b = map.getBounds();
    let min = Infinity, max = -Infinity;

    primaryPath.forEach((row, idx) => {
      const lat = row[latCol];
      const lon = row[lonCol];
      if (lat && lon && lat !== 0 && b.contains([lat, lon])) {
        if (idx < min) min = idx;
        if (idx > max) max = idx;
      }
    });

    if (isFinite(min) && isFinite(max)) {
      isSyncingRef.current = true;
      onBoundsRangeChange({ min, max });
      setTimeout(() => { isSyncingRef.current = false; }, 0);
    }
  }

  return null;
}


function TripMap({ primaryPath, comparisonPath, columns, visibleRange, multiRoute = false, labels = [], onBoundsRangeChange }) {
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
			const allPoints = Array.isArray(primaryPath) && typeof primaryPath.flat === 'function'
			? primaryPath.flat().filter(p => p && p.latitude && p.longitude && p.latitude !== 0 && p.longitude !== 0)
			: [];
			if (allPoints.length === 0) return [[44.97, -93.26], [44.98, -93.27]];
			const latitudes = allPoints.map(p => p.latitude);
			const longitudes = allPoints.map(p => p.longitude);
			return [[Math.min(...latitudes), Math.min(...longitudes)], [Math.max(...latitudes), Math.max(...longitudes)]];
		}

		if (!primaryPath) return [[44.97, -93.26], [44.98, -93.27]];
		const path = primaryPath.slice(visibleRange?.min ?? 0, (visibleRange?.max ?? primaryPath.length - 1) + 1);
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
		<MapContainer bounds={bounds} style={{ height: '100%', width: '100%', backgroundColor: '#1F2937', borderRadius: '0.5rem' }}>
			<MapController bounds={bounds} />
			<MapSync enabled={!multiRoute} primaryPath={primaryPath} columns={columns} onBoundsRangeChange={onBoundsRangeChange} />

			<TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors &copy; CARTO" />

			{multiRoute ? (
				primaryPath.map((path, index) => (
					<Polyline key={`multi-${index}`} positions={path.map(p => [p.latitude, p.longitude])} color={CHART_COLORS[index % CHART_COLORS.length]} />
				))
			) : (
				<>
				{comparisonPath && comparisonSegments.map((segment, index) => (
					<Polyline key={`comp-${index}`} positions={segment.points} color={COMPARISON_COLOR} weight={5} opacity={0.6} dashArray="5, 10" />
				))}
				{primarySegments.map((segment, index) => (
					<Polyline key={index} positions={segment.points} color={segment.color} weight={5} />
				))}
				</>
			)}
    	</MapContainer>
  	);
}

export default TripMap;
