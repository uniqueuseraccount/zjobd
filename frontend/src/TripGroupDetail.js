// FILE: frontend/src/TripGroupDetail.js
//
// --- VERSION 1.9.7-ALPHA ---
// - FIXED: Passes `primaryPath` instead of `positions` to TripMap to match prop signature.
// - CLEANUP: Columns array passed explicitly.
// - NO OTHER LOGIC CHANGES.
//
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import TripMap from './TripMap';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const CHART_COLORS = [
  '#38BDF8', '#F59E0B', '#4ADE80', '#F472B6', '#A78BFA',
  '#2DD4BF', '#FB7185', '#FACC15', '#818CF8', '#FDE047'
];

function TripGroupDetail() {
  const { groupId } = useParams();
  const [groupData, setGroupData] = useState(null);
  const [availablePIDs, setAvailablePIDs] = useState([]);
  const [selectedPID, setSelectedPID] = useState('engine_rpm');
  const [status, setStatus] = useState('Loading group data...');

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

  const chartData = useMemo(() => {
    if (!groupData || !selectedPID) return null;

    const datasets = groupData.logs.map((log, index) => {
      const logData = groupData.log_data[log.log_id] || [];
      return {
        label: new Date(log.start_timestamp * 1000).toLocaleDateString(),
        data: logData.map(row => ({
          x: row.timestamp - log.start_timestamp,
          y: row[selectedPID]
        })),
        borderColor: CHART_COLORS[index % CHART_COLORS.length],
        backgroundColor: `${CHART_COLORS[index % CHART_COLORS.length]}80`,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2,
      };
    });
    return { datasets };
  }, [groupData, selectedPID]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      title: {
        display: true,
        text: `Comparison for PID: ${selectedPID}`,
        color: '#FFFFFF',
        font: { size: 18 }
      },
      legend: { position: 'bottom', labels: { color: '#FFFFFF' } },
    },
    scales: {
      x: {
        type: 'linear',
        title: { display: true, text: 'Time since trip start (seconds)', color: '#9CA3AF' },
        ticks: { color: '#9CA3AF' }
      },
      y: {
        title: { display: true, text: selectedPID.replace(/_/g, ' '), color: '#9CA3AF' },
        ticks: { color: '#9CA3AF' }
      },
    },
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-3 bg-gray-800 rounded-lg shadow-xl p-4 h-[70vh]">
          {chartData ? (
            <Line options={chartOptions} data={chartData} />
          ) : (
            <p className="flex items-center justify-center h-full text-gray-400">{status}</p>
          )}
        </div>
        <div className="md:col-span-1 bg-gray-800 rounded-lg shadow-xl p-4">
          <h3 className="text-lg font-bold border-b-2 border-cyan-500 pb-2 mb-3">Logs in this Group</h3>
          <div className="flex flex-col space-y-1 max-h-[30vh] overflow-y-auto">
            {groupData?.logs.map(log => (
              <Link
                key={log.log_id}
                to={`/logs/${log.log_id}`}
                className="text-left p-2 rounded-md text-sm hover:bg-gray-700 text-cyan-400"
              >
                {log.file_name}
              </Link>
            ))}
          </div>
          <h3 className="text-lg font-bold border-b-2 border-cyan-500 pb-2 my-3">Select PID to Compare</h3>
          <div className="flex flex-col space-y-1 max-h-[30vh] overflow-y-auto">
            {availablePIDs.map(pid => (
              <button
                key={pid}
                onClick={() => setSelectedPID(pid)}
                className={`text-left p-2 rounded-md text-sm ${
                  selectedPID === pid ? 'bg-cyan-600 font-bold' : 'hover:bg-gray-700'
                }`}
              >
                {pid.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>
      {groupData && groupData.gps_data && (
        <div className="bg-gray-800 rounded-lg shadow-xl p-4 h-[60vh]">
          <TripMap
            primaryPath={Object.values(groupData.gps_data)}
            multiRoute={true}
            columns={['latitude', 'longitude', 'operating_state']}
            labels={groupData.logs.map(l =>
              new Date(l.start_timestamp * 1000).toLocaleDateString()
            )}
          />
        </div>
      )}
    </div>
  );
}

export default TripGroupDetail;
