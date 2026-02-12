// --- VERSION 0.1.0 ---
// - Minimal sidebar with navigation links.

import React from 'react';
import { Link } from 'react-router-dom';

export default function Sidebar() {
  return (
    <aside className="bg-gray-800 text-gray-200 w-64 p-4">
      <nav className="space-y-2">
        <Link to="/" className="block hover:text-white">Logs</Link>
        <Link to="/trip-groups" className="block hover:text-white">Trip Groups</Link>
      </nav>
    </aside>
  );
}
