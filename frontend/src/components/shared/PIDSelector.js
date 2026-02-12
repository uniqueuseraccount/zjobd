// --- VERSION 0.0.3 ---
// - Dropdown selector with color swatch for PID selection.

import React from 'react';

export default function PIDSelector({ color = '#FFFFFF', options = [], selectedValue = 'none', onChange = () => {} }) {
  const safeOptions = Array.isArray(options) ? options : [];
  return (
    <div className="flex items-center space-x-2 w-[19%]">
      <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
      <select
        className="bg-gray-700 text-gray-100 text-sm px-2 py-1 rounded w-full truncate"
        value={selectedValue}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="none">none</option>
        {safeOptions.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}
