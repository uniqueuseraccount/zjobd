// --- VERSION 0.1.0 ---
// - Shows a small badge when adaptive sampling is active.

import React from 'react';

export default function SamplingIndicator({ active = false }) {
  if (!active) return null;
  return (
    <div className="text-xs text-yellow-400 mb-1">
      Sampling active — data reduced for performance
    </div>
  );
}
