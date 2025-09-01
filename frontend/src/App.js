// FILE: frontend/src/App.js
//
// --- VERSION 1.8.0 ---
// - Added new route for the "Tools" page.
// - Added a navigation link to the new "Tools" page in the header.
// -----------------------------

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import LogList from './components/pages/LogList';
import LogDetail from './components/pages/LogDetail';
import TripGroupList from './components/pages/TripGroupList';
import TripGroupDetail from './components/pages/TripGroupDetail';
import Tools from './components/pages/Tools'; // New

function App() {
  return (
    <Router>
      <div className="bg-gray-900 text-white min-h-screen font-sans">
        <div className="container mx-auto p-4 md:p-8">
          <header className="mb-8 flex justify-between items-center border-b border-gray-700 pb-4">
            <Link to="/" className="text-4xl font-bold text-cyan-400 hover:text-cyan-300 no-underline">
              Jeep Diagnostics Dashboard
            </Link>
            <nav className="flex items-center space-x-6">
              <Link to="/trip-groups" className="text-lg text-gray-300 hover:text-cyan-400">
                Trip Groups
              </Link>
              <Link to="/tools" className="text-lg text-gray-300 hover:text-cyan-400">
                Tools
              </Link>
            </nav>
          </header>
          <main>
            <Routes>
              <Route path="/" element={<LogList />} />
              <Route path="/logs/:logId" element={<LogDetail />} />
              <Route path="/trip-groups" element={<TripGroupList />} />
              <Route path="/trip-groups/:groupId" element={<TripGroupDetail />} />
              <Route path="/tools" element={<Tools />} />
            </Routes>
          </main>
          <footer className="text-center mt-8 text-gray-500 text-sm">
            <p>Jeep Log Processor v1.8.0</p>
          </footer>
        </div>
      </div>
    </Router>
  );
}

export default App;