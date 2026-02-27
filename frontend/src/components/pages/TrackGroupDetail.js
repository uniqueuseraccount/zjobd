
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TripMap from '../maps/TripMap';
import TripChart from '../charts/TripChart';
import axios from 'axios';

export default function TrackGroupDetail() {
  const { startId, endId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  
  // State for chart interaction
  const [visibleRange, setVisibleRange] = React.useState({ min: 0, max: 0 });
  const [selectedPIDs, setSelectedPIDs] = React.useState(['speed', 'rpm']); 
  // const [chartColors, setChartColors] = React.useState(['#38BDF8', '#34D399']); // Unused

  React.useEffect(() => {
    axios.get(`/api/track-groups/${startId}/${endId}`)
      .then(res => {
        setData(res.data);
        // Initialize range based on the first log (longest?)
        if (res.data.logs && res.data.logs.length > 0) {
            const firstLogId = res.data.logs[0].log_id;
            const logData = res.data.log_data[firstLogId];
            if (logData) {
                setVisibleRange({ min: 0, max: logData.length - 1 });
            }
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [startId, endId]);

  if (loading) return <div className="p-8 text-center text-gray-400">Loading details...</div>;
  if (!data) return <div className="p-8 text-center text-red-400">Failed to load data.</div>;

  // Prepare data for TripMap and TripChart
  // TripMap expects: { logs: [...], gps_data: { log_id: [...] } } -> Matches API response structure!
  
  // TripChart expects: logs array where each object has { id, name, data: [...], columns: [...] }
  const chartLogs = data.logs.map(log => {
    const rows = data.log_data[log.log_id] || [];
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    return {
        id: log.log_id,
        name: `${new Date(log.start_timestamp * 1000).toLocaleDateString()} ${new Date(log.start_timestamp * 1000).toLocaleTimeString()}`,
        data: rows,
        columns: columns
    };
  });

  return (
    <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
      <div className="flex items-center space-x-4 shrink-0">
        <button 
          onClick={() => navigate('/track-groups')}
          className="text-gray-400 hover:text-white"
        >
          ← Back
        </button>
        <h2 className="text-xl font-bold">
            Track Group Details (Start: {startId} → End: {endId})
        </h2>
        <span className="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-sm">
            {data.logs.length} Trips
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        {/* MAP */}
        <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden h-full">
           <TripMap 
             data={data} 
             mode="group" 
             visibleRange={visibleRange}
           />
        </div>

        {/* CHART */}
        <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden h-full flex flex-col">
           <div className="p-4 flex-1 min-h-0">
             <TripChart 
                mode="comparison"
                logs={chartLogs}
                selectedPIDs={selectedPIDs}
                onPIDChange={(idx, val) => {
                    const newPids = [...selectedPIDs];
                    newPids[idx] = val;
                    setSelectedPIDs(newPids);
                }}
                visibleRange={visibleRange}
                setVisibleRange={setVisibleRange}
             />
           </div>
        </div>
      </div>
    </div>
  );
}
