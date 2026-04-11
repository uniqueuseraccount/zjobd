// FILE: frontend/src/App.js
//
// --- VERSION 1.10.0 ---
// - Integrated Global TimeProvider and PlaybackProvider.
// - Added FloatingTimeHeader for global time navigation.
// -----------------------------

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { TimeProvider } from './context/TimeContext';
import { PlaybackProvider } from './context/PlaybackContext';
import FloatingTimeHeader from './components/layout/FloatingTimeHeader';
import LogList from './components/pages/LogList';
import LogDetail from './components/pages/LogDetail';
import TripGroupList from './components/pages/TripGroupList';
import TripGroupDetail from './components/pages/TripGroupDetail';
import TrackGroupList from './components/pages/TrackGroupList'; 
import TrackGroupDetail from './components/pages/TrackGroupDetail'; 
import MapHeatmap from './components/pages/MapHeatmap';
import Tools from './components/pages/Tools';
import Maintenance from './components/pages/Maintenance';

function App() {
  return (
    <Router>
      <TimeProvider>
        <PlaybackProvider>
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
                  <Link to="/track-groups" className="text-lg text-gray-300 hover:text-cyan-400">
                    Track Groups
                </Link>
                  <Link to="/map" className="text-lg text-gray-300 hover:text-cyan-400">
                    Map Heatmap
                </Link>
                  <Link to="/tools" className="text-lg text-gray-300 hover:text-cyan-400">
                    Tools
                </Link>
                  <Link to="/maintenance" className="text-lg text-gray-300 hover:text-cyan-400">
                    Maintenance
                </Link>
                </nav>
              </header>

              <FloatingTimeHeader />

              <main>
                <Routes>
                  <Route path="/" element={<LogList />} />
                  <Route path="/logs/:logId" element={<LogDetail />} />
                  <Route path="/trip-groups" element={<TripGroupList />} />
                  <Route path="/trip-groups/:groupId" element={<TripGroupDetail />} />
                  <Route path="/track-groups" element={<TrackGroupList />} />
                  <Route path="/track-groups/:startId/:endId" element={<TrackGroupDetail />} />
                  <Route path="/map" element={<MapHeatmap />} />
                  <Route path="/tools" element={<Tools />} />
                  <Route path="/maintenance" element={<Maintenance />} />
                </Routes>
              </main>
              <footer className="text-center mt-8 text-gray-500 text-sm">
                <p>Jeep Log Processor v1.9.1</p>
              </footer>
            </div>
          </div>
        </PlaybackProvider>
      </TimeProvider>
    </Router>
  );
}

export default App;
