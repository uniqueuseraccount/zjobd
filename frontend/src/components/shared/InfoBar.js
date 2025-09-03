// --- VERSION 0.0.1 ---
// - Minimal info/status bar placeholder.

import React from 'react';

export default function InfoBar({ message }) {
  return (
    <div className="bg-gray-700 text-gray-100 text-sm px-3 py-2">
      {message || 'Ready'}
    </div>
  );
}
