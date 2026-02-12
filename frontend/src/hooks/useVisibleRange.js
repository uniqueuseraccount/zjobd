// --- VERSION 0.1.0 ---
// - Centralized visibleRange state logic.

import { useState, useCallback } from 'react';
import { getDefaultVisibleRange, DEFAULT_WINDOW_SECONDS } from '../utils/rangeUtils';

export function useVisibleRange(initialData = []) {
  const [visibleRange, setVisibleRange] = useState(
    getDefaultVisibleRange(initialData, DEFAULT_WINDOW_SECONDS)
  );

  const resetRange = useCallback((data) => {
    setVisibleRange(getDefaultVisibleRange(data, DEFAULT_WINDOW_SECONDS));
  }, []);

  const panLeft = useCallback((totalLength) => {
    setVisibleRange((prev) => {
      const size = prev.max - prev.min;
      const min = Math.max(0, prev.min - Math.floor(size / 2));
      return { min, max: Math.min(totalLength - 1, min + size) };
    });
  }, []);

  const panRight = useCallback((totalLength) => {
    setVisibleRange((prev) => {
      const size = prev.max - prev.min;
      const max = Math.min(totalLength - 1, prev.max + Math.floor(size / 2));
      return { min: Math.max(0, max - size), max };
    });
  }, []);

  return { visibleRange, setVisibleRange, resetRange, panLeft, panRight };
}
