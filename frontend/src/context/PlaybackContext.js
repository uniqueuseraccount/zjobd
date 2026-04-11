// --- VERSION 1.0.0 ---
// - Playback engine context for synchronized log review
// - Supports variable speeds (1x to 10x)
// - Integrates with Global TimeContext for boundary enforcement

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useGlobalTime } from './TimeContext';

const PlaybackContext = createContext();

export const usePlayback = () => {
  const context = useContext(PlaybackContext);
  if (!context) throw new Error('usePlayback must be used within a PlaybackProvider');
  return context;
};

export const PlaybackProvider = ({ children }) => {
  const { visibleRange } = useGlobalTime();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const requestRef = useRef();
  const lastUpdateTimeRef = useRef();

  // Ensure currentFrame stays within visibleRange
  useEffect(() => {
    if (currentFrame < visibleRange.min || currentFrame > visibleRange.max) {
      setCurrentFrame(visibleRange.min);
    }
  }, [visibleRange, currentFrame]);

  const animate = useCallback(time => {
    if (lastUpdateTimeRef.current !== undefined) {
      const deltaTime = time - lastUpdateTimeRef.current;
      
      // Update frame based on speed (assuming ~1Hz base log rate, adjust if needed)
      // We advance 1 frame per second * playbackSpeed
      if (deltaTime >= (1000 / playbackSpeed)) {
        setCurrentFrame(prev => {
          const next = prev + 1;
          if (next > visibleRange.max) {
            setIsPlaying(false);
            return visibleRange.min;
          }
          return next;
        });
        lastUpdateTimeRef.current = time;
      }
    } else {
      lastUpdateTimeRef.current = time;
    }
    requestRef.current = requestAnimationFrame(animate);
  }, [playbackSpeed, visibleRange]);

  useEffect(() => {
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(requestRef.current);
      lastUpdateTimeRef.current = undefined;
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying, animate]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  const seek = (frame) => setCurrentFrame(Math.max(visibleRange.min, Math.min(visibleRange.max, frame)));

  return (
    <PlaybackContext.Provider value={{
      isPlaying,
      togglePlay,
      currentFrame,
      playbackSpeed,
      setPlaybackSpeed,
      seek
    }}>
      {children}
    </PlaybackContext.Provider>
  );
};
