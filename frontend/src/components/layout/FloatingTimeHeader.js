// --- VERSION 1.0.0 ---
// - Floating header for global time selection and navigation
// - Stays fixed to top when scrolled past
// - Displays range, duration, and navigation arrows

import React, { useState, useEffect, useRef } from 'react';
import { useGlobalTime } from '../../context/TimeContext';

export default function FloatingTimeHeader() {
  const { visibleRange, resetRange, advance, reverse, isActive, totalLength } = useGlobalTime();
  const [isSticky, setIsSticky] = useState(false);
  const headerRef = useRef(null);
  const placeholderRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!placeholderRef.current) return;
      const top = placeholderRef.current.getBoundingClientRect().top;
      setIsSticky(top <= 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!isActive) return null;

  const durationSec = Math.floor(visibleRange.max - visibleRange.min); // Assuming 1Hz for simple display, or use timestamps if available
  const windowWidth = visibleRange.max - visibleRange.min;

  return (
    <div ref={placeholderRef} className="my-4">
      <div 
        ref={headerRef}
        className={`${
          isSticky 
            ? 'fixed top-0 left-0 right-0 z-[2000] bg-gray-800 shadow-2xl border-b border-cyan-500/50 py-2 px-8 animate-in slide-in-from-top duration-300' 
            : 'bg-gray-800 rounded-lg border border-gray-700 p-3 shadow-lg'
        } transition-all`}
      >
        <div className={`max-w-7xl mx-auto flex items-center justify-between ${isSticky ? '' : ''}`}>
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => resetRange(totalLength)}
              className="bg-gray-700 hover:bg-gray-600 text-cyan-400 px-3 py-1 rounded text-sm transition-colors border border-gray-600"
            >
              Reset
            </button>
            <div className="flex items-center space-x-2 font-mono text-sm">
              <span className="text-gray-400">{Math.floor(visibleRange.min)}</span>
              <div className="w-48 h-2 bg-gray-900 rounded-full relative overflow-hidden">
                <div 
                  className="absolute h-full bg-cyan-500 rounded-full"
                  style={{
                    left: `${(visibleRange.min / totalLength) * 100}%`,
                    width: `${((visibleRange.max - visibleRange.min) / totalLength) * 100}%`
                  }}
                />
              </div>
              <span className="text-gray-400">{Math.floor(visibleRange.max)}</span>
            </div>
          </div>

          <div className="text-center">
            <span className="text-cyan-400 font-bold">Selected: </span>
            <span className="text-white">{windowWidth} units</span>
            <span className="text-gray-500 mx-2">|</span>
            <span className="text-gray-300">{visibleRange.min} - {visibleRange.max}</span>
          </div>

          <div className="flex items-center space-x-3">
            <button 
              onClick={reverse}
              className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-full border border-gray-600 transition-transform active:scale-90"
              title="Reverse 50%"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button 
              onClick={advance}
              className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-full border border-gray-600 transition-transform active:scale-90"
              title="Advance 50%"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
