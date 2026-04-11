// --- VERSION 1.0.0 ---
// - Global TimeContext for synchronized time selection across components
// - Includes navigation functions for advancing/reversing by 50% window width

import React, { createContext, useContext, useState, useCallback } from 'react';

const TimeContext = createContext();

export const useGlobalTime = () => {
  const context = useContext(TimeContext);
  if (!context) {
    throw new Error('useGlobalTime must be used within a TimeProvider');
  }
  return context;
};

export const TimeProvider = ({ children }) => {
  const [visibleRange, setVisibleRange] = useState({ min: 0, max: 0 });
  const [totalLength, setTotalLength] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const updateRange = useCallback((newRange) => {
    setVisibleRange(newRange);
    setIsActive(true);
  }, []);

  const resetRange = useCallback((length) => {
    setVisibleRange({ min: 0, max: length - 1 });
    setTotalLength(length);
    setIsActive(false);
  }, []);

  const advance = useCallback(() => {
    setVisibleRange(prev => {
      const size = prev.max - prev.min;
      const shift = Math.floor(size / 2);
      const newMin = Math.min(totalLength - size - 1, prev.min + shift);
      return { min: newMin, max: newMin + size };
    });
  }, [totalLength]);

  const reverse = useCallback(() => {
    setVisibleRange(prev => {
      const size = prev.max - prev.min;
      const shift = Math.floor(size / 2);
      const newMin = Math.max(0, prev.min - shift);
      return { min: newMin, max: newMin + size };
    });
  }, []);

  return (
    <TimeContext.Provider value={{
      visibleRange,
      setVisibleRange: updateRange,
      resetRange,
      advance,
      reverse,
      isActive,
      totalLength
    }}>
      {children}
    </TimeContext.Provider>
  );
};
