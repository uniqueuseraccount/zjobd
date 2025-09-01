// FILE: frontend/src/TripGroupDetail.js
//
// --- VERSION 1.9.7-ALPHA ---
// - UPDATED: Passes `logs` array to TripChart to enable multi-log mode.
// - REMOVED: Flattened mergedData; TripChart now handles per-log datasets.
// - Map mirrors LogDetail config: chart→map sync enabled, map→chart sync disabled.
//

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import TripChart from '../charts/TripChart';
import TripMap from '../maps/TripMap';

const CHART_COLORS = [
  '#38BDF8', '#F59E0B', '#4ADE80', '#F472B6', '#A78BFA',
  '#2DD4BF', '#FB7185', '#FACC15', '#818CF8', '#FDE047'
];

function TripGroupDetail() {
  const { groupId } = useParams();
  const [groupData, setGroupData] = useState(null);
  const [availablePIDs, setAvailablePIDs] = useState([]);
  const [selectedPIDs, setSelectedPIDs] = useState(['engine_rpm', 'vehicle_speed', 'none', 'none', 'none']);
  const [status, setStatus] = useState('Loading group data...');
  const [visibleRange, setVisibleRange] = useState({ min: 0, max: 0 });

  useEffect(() => {
    const fetchGroupData = async () => {
      try {
        const response = await axios.get(`http://localhost:5001/api/trip-groups/${groupId}`);
        setGroupData(response.data);

        const firstLogData = Object.values(response.data.log_data)[0] || [];
        if (firstLogData.length > 0) {
          const uniquePids = Object.keys(firstLogData[0] || {})
            .filter(p => !['data_id', 'timestamp', 'operating_state'].includes(p));
          setAvailablePIDs(uniquePids.sort());
        }
      } catch (error) {
        console.error("Error fetching group detail:", error);
        setStatus('Failed to load group data.');
      }
    };
    fetchGroupData();
  }, [groupId]);

  const handlePidChange = (index, value) => {
    const newPids = [...selectedPIDs];
    newPids[index] = value === 'none' ? 'none' : value;
    setSelectedPIDs(newPids);
  };

  if (!groupData) {
    return <p className="flex items-center justify-center h-full text-gray-400">{status}</p>;
  }

  // Build logs array for TripChart multi-log mode
  const logsForChart = groupData.logs.map(log => ({
    log_id: log.log_id,
    start_timestamp: log.start_timestamp,
    data: groupData.log_data[log.log_id] || [],
    columns: Object.keys((groupData.log_data[log.log_id] || [])[0] || [])
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Chart */}
        <div className="md:col-span-3 bg-gray-800 rounded-lg shadow-xl p-4 h-[70vh]">
          <TripChart
            logs={logsForChart}                // multi-log mode
            selectedPIDs={selectedPIDs}
            onPIDChange={handlePidChange}
            chartColors={CHART_COLORS}
            comparisonColors={[]}              // unused in group view
            visibleRange={visibleRange}
            setVisibleRange={setVisibleRange}
          />
        </div>

        {/* Sidebar */}
        <div className="md:col-span-1 bg-gray-800 rounded-lg shadow-xl p-4">
          <h3 className="text-lg font-bold border-b-2 border-cyan-500 pb-2 mb-3">Logs in this Group</h3>
          <div className="flex flex-col space-y-1 max-h-[30vh] overflow-y-auto">
            {groupData.logs.map(log => (
              <Link
                key={log.log_id}
                to={`/logs/${log.log_id}`}
                className="text-left p-2 rounded-md text-sm hover:bg-gray-700 text-cyan-400"
              >
                {log.file_name}
              </Link>
            ))}
          </div>
          <h3 className="text-lg font-bold border-b-2 border-cyan-500 pb-2 my-3">Select PIDs to Compare</h3>
          <div className="flex flex-col space-y-1 max-h-[30vh] overflow-y-auto">
            {availablePIDs.map(pid => (
              <button
                key={pid}
                onClick={() => handlePidChange(
                  selectedPIDs.indexOf(pid) !== -1
                    ? selectedPIDs.indexOf(pid)
                    : selectedPIDs.indexOf('none'),
                  pid
                )}
                className={`text-left p-2 rounded-md text-sm ${
                  selectedPIDs.includes(pid) ? 'bg-cyan-600 font-bold' : 'hover:bg-gray-700'
                }`}
              >
                {pid.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Map */}
      {groupData.gps_data && (
        <div className="bg-gray-800 rounded-lg shadow-xl p-4 h-[60vh]">
          <TripMap
            primaryPath={Object.values(groupData.gps_data)}
            multiRoute={true}
            columns={['latitude', 'longitude', 'operating_state']}
            labels={groupData.logs.map(l =>
              new Date(l.start_timestamp * 1000).toLocaleDateString()
            )}
            visibleRange={visibleRange}
            onBoundsRangeChange={() => { /* no-op for now */ }}
          />
        </div>
      )}
    </div>
  );
}

export default TripGroupDetail;