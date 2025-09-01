// FILE: frontend/src/components/shared/SamplingIndicator.js
//
// --- VERSION 0.1.0 ---
// - Shows "Data Sampled" in lime green if active, "Full Data" in dim grey if not.

import React from 'react';

export default function SamplingIndicator({ active }) {
  return (
    <div
      className={`text-xs text-right ${
        active ? 'text-lime-400' : 'text-gray-500'
      }`}
    >
      {active ? 'Data Sampled' : 'Full Data'}
    </div>
  );
}
