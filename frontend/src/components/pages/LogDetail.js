// --- VERSION 1.3.0 ---
// - Integrated Real-time Playback controls and Gauge Overlay
// - Added Play/Pause and Speed selector to the UI
// - Synchronized with Global TimeContext and PlaybackProvider

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import TripChart from '../charts/TripChart';
import TripMap from '../maps/TripMap';
import ElevationMap from '../maps/ElevationMap';
import InfoBar from '../shared/InfoBar';
import GaugeOverlay from '../shared/GaugeOverlay';
import { useGlobalTime } from '../../context/TimeContext';
import { usePlayback } from '../../context/PlaybackContext';

export default function LogDetail() {
  const { logId } = useParams();
  const { visibleRange, resetRange } = useGlobalTime();
  const { isPlaying, togglePlay, playbackSpeed, setPlaybackSpeed, currentFrame } = usePlayback();
  
  const [log, setLog] = useState(null);
  const [tripInfo, setTripInfo] = useState(null);
  const [groupLogs, setGroupLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [vizMode, setVizMode] = useState('standard');

  const [selectedPIDs, setSelectedPIDs] = useState([
    'engine_rpm',
    'gps_speed', 
    'none',
    'none',
    'none'
  ]);
  
  const chartColors = ['#FF4D4D', '#00E676', '#38BDF8', '#F59E0B', '#A78BFA'];

  const handlePIDChange = useCallback((index, value) => {
    setSelectedPIDs(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  }, []);

  const handleExportGPX = () => {
    window.location.href = `/api/logs/${logId}/export/gpx`;
  };

  useEffect(() => {
    if (!logId) return;
    setLoading(true);
    const fetchLogData = async () => {
      try {
        const response = await fetch(`/api/logs/${logId}/data`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        setLog({ data: data.data, columns: data.columns });
        setTripInfo(data.trip_info || null);
        setGroupLogs(data.group_logs || []);
        resetRange(data.data.length);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchLogData();
  }, [logId, resetRange]);

  if (loading) return <div className="p-20 text-center text-gray-400">Loading log data...</div>;
  if (error) return <div className="p-20 text-center text-red-400">Error: {error}</div>;
  if (!log) return null;

  return (
    <div className="space-y-4 relative">
      <div className="flex justify-between items-center bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-xl">
        <InfoBar tripInfo={tripInfo} groupLogs={groupLogs} logData={log.data} />
        
        <div className="flex items-center gap-4">
          {/* Playback Controls */}
          <div className="flex items-center bg-gray-900 rounded-lg p-1 border border-gray-700">
            <button 
              onClick={togglePlay}
              className={`p-2 rounded-md transition-all ${isPlaying ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'}`}
            >
              {isPlaying ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
              )}
            </button>
            
            <select 
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-gray-400 px-2 outline-none"
            >
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={5}>5x</option>
              <option value={10}>10x</option>
            </select>
          </div>

          <button 
            onClick={handleExportGPX}
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg font-bold text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            GPX
          </button>
        </div>
      </div>
      
      <div className="relative">
        <TripChart
          log={log}
          selectedPIDs={selectedPIDs}
          onPIDChange={handlePIDChange}
          chartColors={chartColors}
        />
        <GaugeOverlay data={log.data} />
      </div>

      <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden border border-gray-700">
        <div className="p-2 bg-gray-900/50 border-b border-gray-700 flex justify-between items-center">
          <div className="flex gap-2 p-1 bg-gray-800 rounded-md text-xs">
            <button 
              onClick={() => setVizMode('standard')}
              className={`px-3 py-1 rounded transition-colors ${vizMode === 'standard' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
            >Standard Map</button>
            <button 
              onClick={() => setVizMode('heatmap')}
              className={`px-3 py-1 rounded transition-colors ${vizMode === 'heatmap' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
            >PID Heatmap</button>
          </div>
          <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
            {vizMode === 'heatmap' ? 'Color: Altitude | Width: Load' : `Frame: ${currentFrame}`}
          </div>
        </div>
        
        <div className="h-[500px]">
          {vizMode === 'standard' ? (
            <TripMap
              primaryPath={log.data}
              columns={['latitude', 'longitude']}
              visibleRange={visibleRange}
              showDataPoints={true}
            />
          ) : (
            <ElevationMap
              data={log.data}
              visibleRange={visibleRange}
            />
          )}
        </div>
      </div>
    </div>
  );
}
