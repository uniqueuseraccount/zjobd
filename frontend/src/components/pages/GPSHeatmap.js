// FILE: frontend/src/components/pages/GPSHeatmap.js
//
// --- VERSION 0.3.0 ---
// GPS-First Road Selection with Trip Frequency Heatmaps
// OPTIMIZED: Uses start/end coordinates for initial filtering, fetches GPS data only for promising logs
// -----------------------------

// eslint-disable-next-line no-unused-vars
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend
} from 'chart.js';
import 'leaflet/dist/leaflet.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// Map bounds tracker component
function MapBoundsTracker({ onBoundsChange }) {
  const map = useMapEvents({
    moveend: () => {
      const bounds = map.getBounds();
      onBoundsChange({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
        zoom: map.getZoom()
      });
    },
    zoomend: () => {
      const bounds = map.getBounds();
      onBoundsChange({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
        zoom: map.getZoom()
      });
    }
  });
  
  return null;
}

// Heatmap component using leaflet.heat
function HeatmapLayer({ heatData, intensity = 1 }) {
  const map = useMap();
  
  useEffect(() => {
    if (!window.L || !window.L.heatLayer || !heatData || heatData.length === 0) return;
    
    const heatLayer = window.L.heatLayer(heatData, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      max: intensity,
      gradient: {
        0.0: 'blue',
        0.2: 'cyan', 
        0.4: 'lime',
        0.6: 'yellow',
        0.8: 'orange',
        1.0: 'red'
      }
    });
    
    heatLayer.addTo(map);
    
    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, heatData, intensity]);
  
  return null;
}

// Calculate if a point is within map bounds
function isPointInBounds(lat, lon, bounds) {
  return lat >= bounds.south && lat <= bounds.north && 
         lon >= bounds.west && lon <= bounds.east;
}

// Calculate distance between two points (rough approximation)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const latDiff = lat1 - lat2;
  const lonDiff = lon1 - lon2;
  return Math.sqrt(latDiff * latDiff + lonDiff * lonDiff);
}

// Main GPS Heatmap component  
export default function GPSHeatmap() {
  // State management
  const [allLogs, setAllLogs] = useState([]);
  const [homeLocation, setHomeLocation] = useState(null);
  const [mapBounds, setMapBounds] = useState(null);
  const [eligibleLogs, setEligibleLogs] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingStatus, setProcessingStatus] = useState('');
  
  // Filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minOverlap, setMinOverlap] = useState(10);
  
  // Selection states
  const [selectedLogs, setSelectedLogs] = useState([]);
  const [logDetails, setLogDetails] = useState({});
  
  // View states
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [selectedPIDs, setSelectedPIDs] = useState(['engine_rpm', 'vehicle_speed']);
  const [chartLayout, setChartLayout] = useState('combined');
  const [availablePIDs, setAvailablePIDs] = useState([]);
  
  const chartColors = ['#FF4D4D', '#00E676', '#38BDF8', '#F59E0B', '#A78BFA', '#EC4899', '#8B5CF6', '#F97316'];

  // Fetch all logs on component mount
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/logs');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const logs = await response.json();
        console.log(`[GPSHeatmap] Loaded ${logs.length} logs`);
        
        // Calculate home location (most frequent end point)
        const endPoints = logs
          .filter(log => log.end_lat && log.end_lon)
          .map(log => ({ lat: log.end_lat, lon: log.end_lon, count: 1 }));
        
        const home = findMostFrequentLocation(endPoints);
        setHomeLocation(home);
        
        // Set date range defaults
        if (logs.length > 0) {
          const dates = logs.map(log => new Date(log.start_timestamp * 1000));
          const minDate = new Date(Math.min(...dates));
          const maxDate = new Date(Math.max(...dates));
          setStartDate(minDate.toISOString().split('T')[0]);
          setEndDate(maxDate.toISOString().split('T')[0]);
        }
        
        setAllLogs(logs);
      } catch (err) {
        console.error('[GPSHeatmap] Error fetching logs:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  // Find most frequent location (home detection)
  const findMostFrequentLocation = (points, tolerance = 0.002) => {
    if (points.length === 0) return { lat: 44.9778, lon: -93.2650 }; // Minneapolis default
    
    const clusters = [];
    
    points.forEach(point => {
      let foundCluster = false;
      
      for (const cluster of clusters) {
        const distance = calculateDistance(cluster.lat, cluster.lon, point.lat, point.lon);
        
        if (distance < tolerance) {
          cluster.count += point.count;
          cluster.lat = (cluster.lat * (cluster.count - point.count) + point.lat * point.count) / cluster.count;
          cluster.lon = (cluster.lon * (cluster.count - point.count) + point.lon * point.count) / cluster.count;
          foundCluster = true;
          break;
        }
      }
      
      if (!foundCluster) {
        clusters.push({ ...point });
      }
    });
    
    // Return cluster with highest count
    return clusters.reduce((max, cluster) => 
      cluster.count > max.count ? cluster : max, clusters[0]);
  };

  // OPTIMIZED: Handle map bounds changes with smarter filtering
  const handleBoundsChange = useCallback(async (bounds) => {
    setMapBounds(bounds);
    
    if (!bounds || allLogs.length === 0) return;
    
    console.log(`[GPSHeatmap] Map bounds changed - zoom: ${bounds.zoom}, analyzing ${allLogs.length} logs`);
    setProcessingStatus(`Analyzing ${allLogs.length} logs...`);
    
    // Filter logs by date first
    let dateFiltered = allLogs;
    if (startDate && endDate) {
      const start = new Date(startDate).getTime() / 1000;
      const end = new Date(endDate).getTime() / 1000 + 86400;
      
      dateFiltered = allLogs.filter(log => 
        log.start_timestamp >= start && log.start_timestamp <= end
      );
    }
    
    console.log(`[GPSHeatmap] After date filtering: ${dateFiltered.length} logs`);
    setProcessingStatus(`Date filtered to ${dateFiltered.length} logs. Quick screening...`);
    
    // STEP 1: Quick screening using start/end coordinates
    const candidates = [];
    const heatPoints = [];
    
    dateFiltered.forEach(log => {
      let overlapScore = 0;
      let inBounds = false;
      
      // Check various possible field names for GPS coordinates
      const startLat = log.start_lat || log.start_latitude || log.startLat;
      const startLon = log.start_lon || log.start_longitude || log.startLon;
      const endLat = log.end_lat || log.end_latitude || log.endLat;
      const endLon = log.end_lon || log.end_longitude || log.endLon;
      
      // Simple overlap check using start/end points
      if (typeof startLat === 'number' && typeof startLon === 'number' && startLat !== 0 && startLon !== 0) {
        if (isPointInBounds(startLat, startLon, bounds)) {
          overlapScore += 50;
          heatPoints.push([startLat, startLon, 1]);
          inBounds = true;
        }
      }
      
      if (typeof endLat === 'number' && typeof endLon === 'number' && endLat !== 0 && endLon !== 0) {
        if (isPointInBounds(endLat, endLon, bounds)) {
          overlapScore += 50;
          heatPoints.push([endLat, endLon, 1]);
          inBounds = true;
        }
      }
      
      // For trips that pass through the bounds (start outside, end outside, but potentially crossing)
      if (!inBounds && startLat && startLon && endLat && endLon) {
        const startDistance = Math.min(
          Math.abs(startLat - bounds.north), Math.abs(startLat - bounds.south),
          Math.abs(startLon - bounds.east), Math.abs(startLon - bounds.west)
        );
        const endDistance = Math.min(
          Math.abs(endLat - bounds.north), Math.abs(endLat - bounds.south),
          Math.abs(endLon - bounds.east), Math.abs(endLon - bounds.west)
        );
        
        // If both start and end are close to bounds, it might pass through
        const proximityThreshold = Math.abs(bounds.north - bounds.south) * 0.5; // Half the bound height
        if (startDistance < proximityThreshold && endDistance < proximityThreshold) {
          overlapScore = 25; // Lower score for potential pass-through
          candidates.push({ log, overlapScore, needsGPSCheck: true });
        }
      }
      
      if (overlapScore >= minOverlap) {
        candidates.push({ log, overlapScore, needsGPSCheck: false });
      }
    });
    
    console.log(`[GPSHeatmap] Quick screening found ${candidates.length} candidates`);
    setProcessingStatus(`Found ${candidates.length} candidate logs. Checking GPS data for ${candidates.filter(c => c.needsGPSCheck).length} logs...`);
    
    // STEP 2: For candidates that need GPS verification, fetch and analyze
    const eligible = [];
    let gpsChecked = 0;
    const totalGPSChecks = candidates.filter(c => c.needsGPSCheck).length;
    
    for (const candidate of candidates) {
      if (!candidate.needsGPSCheck) {
        // Already verified by start/end points
        eligible.push({
          ...candidate.log,
          roadOverlap: candidate.overlapScore,
          similarity: null
        });
        continue;
      }
      
      try {
        gpsChecked++;
        setProcessingStatus(`Checking GPS data ${gpsChecked}/${totalGPSChecks}...`);
        
        const response = await fetch(`/api/logs/${candidate.log.log_id}/data`);
        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data.length > 0) {
            // Sample GPS points for faster processing
            const sampleSize = Math.min(50, data.data.length);
            const step = Math.max(1, Math.floor(data.data.length / sampleSize));
            let pointsInBounds = 0;
            let totalSampled = 0;
            
            for (let i = 0; i < data.data.length; i += step) {
              const row = data.data[i];
              const lat = row.latitude || row.lat;
              const lon = row.longitude || row.lon;
              
              if (typeof lat === 'number' && typeof lon === 'number' && lat !== 0 && lon !== 0) {
                totalSampled++;
                if (isPointInBounds(lat, lon, bounds)) {
                  pointsInBounds++;
                  heatPoints.push([lat, lon, 1]);
                }
              }
            }
            
            const actualOverlap = totalSampled > 0 ? (pointsInBounds / totalSampled) * 100 : 0;
            
            if (actualOverlap >= minOverlap) {
              eligible.push({
                ...candidate.log,
                roadOverlap: actualOverlap,
                similarity: null
              });
            }
          }
        }
      } catch (err) {
        console.warn(`Failed to analyze GPS data for log ${candidate.log.log_id}:`, err);
      }
    }
    
    // Calculate similarity scores
    eligible.forEach((log, i) => {
      if (eligible.length > 1) {
        const avgDistance = eligible.reduce((sum, l) => sum + (parseFloat(l.trip_distance_miles) || 0), 0) / eligible.length;
        const avgDuration = eligible.reduce((sum, l) => sum + (parseInt(l.trip_duration_seconds) || 0), 0) / eligible.length;
        
        const distDiff = Math.abs((parseFloat(log.trip_distance_miles) || 0) - avgDistance);
        const durDiff = Math.abs((parseInt(log.trip_duration_seconds) || 0) - avgDuration);
        
        log.similarity = Math.max(0, 100 - (distDiff * 20) - (durDiff / 60));
      } else {
        log.similarity = 100;
      }
    });
    
    console.log(`[GPSHeatmap] Found ${eligible.length} eligible logs after GPS verification`);
    console.log(`[GPSHeatmap] Generated ${heatPoints.length} heat points`);
    
    setEligibleLogs(eligible);
    setHeatmapData(heatPoints);
    setProcessingStatus('');
  }, [allLogs, startDate, endDate, minOverlap]);

  // Handle log selection for comparison
  const handleLogSelect = useCallback((log, selected) => {
    setSelectedLogs(prev => {
      if (selected) {
        return prev.length < 10 ? [...prev, log] : prev;
      } else {
        return prev.filter(l => l.log_id !== log.log_id);
      }
    });
  }, []);

  // Start comparison mode with road overlap trimming
  const handleCompareNow = useCallback(async () => {
    if (selectedLogs.length === 0) {
      alert('Please select at least one log to compare');
      return;
    }
    
    setComparisonLoading(true);
    
    try {
      // Fetch detailed data for selected logs
      const logDataPromises = selectedLogs.slice(0, 10).map(async log => {
        const response = await fetch(`/api/logs/${log.log_id}/data`);
        if (!response.ok) throw new Error(`Failed to fetch log ${log.log_id}`);
        const data = await response.json();
        
        // ENHANCED: Trim data to overlapping road section if map bounds exist
        let trimmedData = data.data;
        if (mapBounds && data.data.length > 0) {
          const overlappingIndices = [];
          
          data.data.forEach((row, index) => {
            const lat = row.latitude || row.lat;
            const lon = row.longitude || row.lon;
            
            if (typeof lat === 'number' && typeof lon === 'number' && lat !== 0 && lon !== 0) {
              if (isPointInBounds(lat, lon, mapBounds)) {
                overlappingIndices.push(index);
              }
            }
          });
          
          if (overlappingIndices.length > 0) {
            const startIdx = Math.max(0, overlappingIndices[0] - 5); // Include 5 points before
            const endIdx = Math.min(data.data.length - 1, overlappingIndices[overlappingIndices.length - 1] + 5); // Include 5 points after
            trimmedData = data.data.slice(startIdx, endIdx + 1);
          }
        }
        
        return { 
          ...log, 
          data: trimmedData, 
          columns: data.columns,
          trimmed: trimmedData.length < data.data.length,
          originalLength: data.data.length
        };
      });
      
      const logsWithData = await Promise.all(logDataPromises);
      
      // Extract available PIDs from first log
      if (logsWithData.length > 0 && logsWithData[0].columns) {
        setAvailablePIDs(logsWithData[0].columns);
      }
      
      setLogDetails(logsWithData.reduce((acc, log) => {
        acc[log.log_id] = log;
        return acc;
      }, {}));
      
      setShowComparison(true);
    } catch (err) {
      console.error('Error loading comparison data:', err);
      alert('Error loading log data for comparison');
    } finally {
      setComparisonLoading(false);
    }
  }, [selectedLogs, mapBounds]);

  // Render comparison charts (same as before, but now using trimmed data)
  const renderComparison = () => {
    if (!showComparison || selectedLogs.length === 0) return null;
    
    const logsWithData = selectedLogs.map(log => logDetails[log.log_id]).filter(Boolean);
    
    if (chartLayout === 'grid') {
      return (
        <div className="fixed inset-0 bg-gray-900 z-50 overflow-auto">
          <div className="bg-gray-800 p-4 border-b border-gray-700 sticky top-0 z-10">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-cyan-400">
                Road Section Comparison - {logsWithData.length} Logs
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setChartLayout('combined')}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition-colors"
                >
                  Combined View
                </button>
                <button
                  onClick={() => setShowComparison(false)}
                  className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded transition-colors"
                >
                  Back to Map
                </button>
              </div>
            </div>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-fr">
              {logsWithData.map((log) => (
                <div key={log.log_id} className="bg-gray-800 rounded-lg p-4 flex flex-col">
                  <h3 className="text-sm font-semibold text-gray-300 mb-2 truncate">
                    {log.file_name.replace('.csv', '')}
                  </h3>
                  <div className="text-xs text-gray-400 mb-3">
                    <div>Distance: {(parseFloat(log.trip_distance_miles) || 0).toFixed(1)} mi</div>
                    <div>Duration: {Math.round((parseInt(log.trip_duration_seconds) || 0) / 60)} min</div>
                    <div>Overlap: {(log.roadOverlap || 0).toFixed(0)}%</div>
                    {log.trimmed && (
                      <div className="text-yellow-400">
                        Trimmed: {log.data.length} / {log.originalLength} points
                      </div>
                    )}
                  </div>
                  <div className="flex-1" style={{ minHeight: '300px' }}>
                    <Line
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        animation: false,
                        plugins: { 
                          legend: { 
                            display: true,
                            labels: { color: '#9CA3AF', font: { size: 10 } }
                          }
                        },
                        scales: {
                          x: { 
                            ticks: { color: '#9CA3AF', display: false },
                            title: { display: true, text: 'Sequence', color: '#9CA3AF', font: { size: 10 } }
                          },
                          y: { 
                            ticks: { color: '#9CA3AF', font: { size: 9 } },
                            title: { display: true, text: 'Values', color: '#9CA3AF', font: { size: 10 } }
                          }
                        }
                      }}
                      data={{
                        labels: log.data?.map((_, i) => i) || [],
                        datasets: selectedPIDs.slice(0, 2).map((pid, pidIndex) => ({
                          label: pid,
                          data: log.data?.map(row => row[pid]).filter(v => typeof v === 'number') || [],
                          borderColor: chartColors[pidIndex],
                          backgroundColor: chartColors[pidIndex] + '20',
                          pointRadius: 0,
                          borderWidth: 2,
                          tension: 0.1
                        }))
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    
    // Combined view
    return (
      <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
        <div className="bg-gray-800 p-4 border-b border-gray-700 flex-shrink-0">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-cyan-400">
              Road Section Comparison - {logsWithData.length} Logs
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setChartLayout('grid')}
                className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded transition-colors"
              >
                Grid View
              </button>
              <button
                onClick={() => setShowComparison(false)}
                className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded transition-colors"
              >
                Back to Map
              </button>
            </div>
          </div>
          
          <div className="flex gap-4">
            {selectedPIDs.map((pid, index) => (
              <div key={index} className="flex items-center gap-2">
                <span 
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: chartColors[index] }}
                />
                <select
                  value={pid}
                  onChange={(e) => {
                    const newPIDs = [...selectedPIDs];
                    newPIDs[index] = e.target.value;
                    setSelectedPIDs(newPIDs);
                  }}
                  className="bg-gray-700 text-white px-2 py-1 rounded text-sm min-w-0"
                >
                  {availablePIDs.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex-1 p-4 overflow-hidden">
          <Line
            options={{
              responsive: true,
              maintainAspectRatio: false,
              animation: false,
              plugins: {
                legend: { 
                  display: true,
                  labels: { color: '#9CA3AF' }
                }
              },
              scales: {
                x: { 
                  ticks: { color: '#9CA3AF' },
                  title: { display: true, text: 'Data Point Sequence', color: '#9CA3AF' }
                },
                y: { 
                  ticks: { color: '#9CA3AF' },
                  title: { display: true, text: 'PID Values', color: '#9CA3AF' }
                }
              }
            }}
            data={{
              datasets: logsWithData.flatMap((log, logIndex) => 
                selectedPIDs.slice(0, 2).map((pid, pidIndex) => {
                  const values = log.data?.map(row => row[pid]).filter(v => typeof v === 'number') || [];
                  return {
                    label: `${log.file_name.replace('.csv', '')} - ${pid}${log.trimmed ? ' (trimmed)' : ''}`,
                    data: values.map((value, i) => ({ x: i, y: value })),
                    borderColor: chartColors[(logIndex * 2 + pidIndex) % chartColors.length],
                    backgroundColor: chartColors[(logIndex * 2 + pidIndex) % chartColors.length] + '10',
                    pointRadius: 0,
                    borderWidth: 2,
                    tension: 0.1
                  };
                })
              )
            }}
          />
        </div>
      </div>
    );
  };

  if (loading && allLogs.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-gray-400 text-lg">
          <div className="animate-spin w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          Loading GPS data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-red-400 text-lg">Error: {error}</div>
      </div>
    );
  }

  return (
    <>
      {!showComparison && (
        <div className="h-screen relative">
          <MapContainer
            center={homeLocation ? [homeLocation.lat, homeLocation.lon] : [44.9778, -93.2650]}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
              attribution='&copy; CartoDB'
            />
            <MapBoundsTracker onBoundsChange={handleBoundsChange} />
            <HeatmapLayer 
              heatData={heatmapData} 
              intensity={Math.max(1, Math.ceil(heatmapData.length / 20))} 
            />
          </MapContainer>

          {/* Control Panel Overlay */}
          <div className="absolute top-0 left-0 right-0 bg-gray-900 bg-opacity-95 text-white p-4 z-[1000] border-b border-gray-700">
            <div className="flex flex-wrap items-center gap-4 mb-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-300 font-medium">From:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-gray-700 text-white px-3 py-1 rounded text-sm border border-gray-600 focus:border-cyan-500"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-300 font-medium">To:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-gray-700 text-white px-3 py-1 rounded text-sm border border-gray-600 focus:border-cyan-500"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-300 font-medium">Min Overlap:</label>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={minOverlap}
                  onChange={(e) => setMinOverlap(parseInt(e.target.value))}
                  className="w-20"
                />
                <span className="text-sm text-gray-300 w-8">{minOverlap}%</span>
              </div>
              
              <div className="text-sm text-cyan-400 bg-gray-800 px-3 py-1 rounded border">
                {eligibleLogs.length} logs in current view
              </div>
              
              <button
                onClick={handleCompareNow}
                disabled={selectedLogs.length === 0 || comparisonLoading}
                className="bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 px-4 py-2 rounded font-medium flex items-center gap-2 transition-colors"
              >
                {comparisonLoading && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
                Compare Now ({selectedLogs.length}/10)
              </button>
            </div>
            
            {/* Processing Status */}
            {processingStatus && (
              <div className="text-sm text-yellow-400 bg-gray-800 px-3 py-1 rounded mb-2">
                {processingStatus}
              </div>
            )}
            
            {/* Eligible logs with selection */}
            {eligibleLogs.length > 0 && (
              <div className="max-h-32 overflow-y-auto bg-gray-800 rounded p-2 border border-gray-600">
                <div className="text-xs text-gray-400 mb-2 font-medium">
                  Road-filtered logs (click to select for comparison):
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1 text-xs">
                  {eligibleLogs.map(log => (
                    <button
                      key={log.log_id}
                      onClick={() => handleLogSelect(log, !selectedLogs.find(l => l.log_id === log.log_id))}
                      className={`text-left px-2 py-1 rounded flex justify-between items-center ${
                        selectedLogs.find(l => l.log_id === log.log_id)
                          ? 'bg-cyan-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      } transition-colors`}
                    >
                      <span className="truncate flex-1">
                        {log.file_name.replace('.csv', '')}
                      </span>
                      <div className="flex gap-2 ml-2 text-[10px] opacity-75">
                        <span>{log.roadOverlap?.toFixed(0)}%</span>
                        <span>S:{log.similarity?.toFixed(0)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Comparison View */}
      {renderComparison()}
    </>
  );
}