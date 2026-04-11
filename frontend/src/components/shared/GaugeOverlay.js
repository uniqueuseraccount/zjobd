// --- VERSION 1.0.0 ---
// - Real-time Gauge Overlay for log playback
// - Displays Speed, RPM, and Load in high-contrast SVG gauges
// - Semi-transparent background for minimal chart obstruction

import React from 'react';
import { usePlayback } from '../../context/PlaybackContext';

const Gauge = ({ label, value, min, max, unit, color = "#22d3ee" }) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center p-2 bg-gray-900/80 rounded-xl border border-gray-700 shadow-2xl backdrop-blur-sm">
      <div className="relative w-24 h-24 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-gray-800" />
          <circle 
            cx="48" cy="48" r={radius} stroke={color} strokeWidth="6" fill="transparent" 
            strokeDasharray={circumference}
            style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 0.3s ease' }}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-white">{Math.round(value)}</span>
          <span className="text-[10px] text-gray-500 uppercase">{unit}</span>
        </div>
      </div>
      <span className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-tighter">{label}</span>
    </div>
  );
};

export default function GaugeOverlay({ data = [] }) {
  const { currentFrame, isPlaying } = usePlayback();
  
  if (!isPlaying || !data[currentFrame]) return null;
  
  const current = data[currentFrame];
  const speed = current.vehicle_speed || current.gps_speed || 0;
  const rpm = current.engine_rpm || 0;
  const load = current.calculated_load_value || 0;

  return (
    <div className="absolute bottom-20 right-6 z-[1500] flex gap-4 animate-in zoom-in fade-in duration-300 pointer-events-none">
      <Gauge label="Speed" value={speed} min={0} max={100} unit="mph" color="#38bdf8" />
      <Gauge label="RPM" value={rpm} min={0} max={6000} unit="rpm" color="#f87171" />
      <Gauge label="Load" value={load} min={0} max={100} unit="%" color="#fbbf24" />
    </div>
  );
}
