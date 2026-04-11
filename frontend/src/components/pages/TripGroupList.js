// --- VERSION 1.6.0 ---
// - Redesigned TripGroupList to match TrackGroupList aesthetic
// - Added summary statistics cards
// - Improved table layout with average stats

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

function StatCard({ title, value, color = "text-cyan-400" }) {
  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow border border-gray-700 text-center">
      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">{title}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default function TripGroupList() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await axios.get('/api/trip-groups');
        setGroups(response.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching trip groups:", err);
        setError("Could not load trip groups.");
        setLoading(false);
      }
    };
    fetchGroups();
  }, []);

  const stats = useMemo(() => {
    return {
      total: groups.length,
      multiTrip: groups.filter(g => g.trip_count > 1).length,
      largeGroups: groups.filter(g => g.trip_count >= 5).length,
      totalTrips: groups.reduce((sum, g) => sum + g.trip_count, 0)
    };
  }, [groups]);

  if (loading) return <div className="p-8 text-gray-400 text-center">Loading trip groups...</div>;
  if (error) return <div className="p-8 text-red-400 text-center">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-white">Trip Groups (Coordinate-Based)</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Groups" value={stats.total} color="text-white" />
        <StatCard title="Recurring" value={stats.multiTrip} color="text-cyan-400" />
        <StatCard title="Large (5+)" value={stats.largeGroups} color="text-green-400" />
        <StatCard title="Total Trips" value={stats.totalTrips} color="text-blue-400" />
      </div>

      <div className="bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-700">
        <table className="w-full text-left text-gray-300">
          <thead className="bg-gray-700 text-gray-400 uppercase font-semibold text-sm">
            <tr>
              <th className="p-4">Group Hash</th>
              <th className="p-4 text-center">Trip Count</th>
              <th className="p-4 text-right">Avg Start Coord</th>
              <th className="p-4 text-right">Avg End Coord</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {groups.map((group) => (
              <tr key={group.trip_group_id} className="hover:bg-gray-750 transition-colors">
                <td className="p-4 font-mono text-cyan-500/80 text-sm">
                  {group.trip_group_id.substring(0, 16)}...
                </td>
                <td className="p-4 text-center">
                  <span className="bg-blue-900 text-blue-200 py-1 px-3 rounded-full text-xs font-bold">
                    {group.trip_count}
                  </span>
                </td>
                <td className="p-4 text-right text-xs text-gray-400">
                  {parseFloat(group.avg_start_lat).toFixed(4)}, {parseFloat(group.avg_start_lon).toFixed(4)}
                </td>
                <td className="p-4 text-right text-xs text-gray-400">
                  {parseFloat(group.avg_end_lat).toFixed(4)}, {parseFloat(group.avg_end_lon).toFixed(4)}
                </td>
                <td className="p-4 text-right">
                  <Link 
                    to={`/trip-groups/${group.trip_group_id}`}
                    className="text-cyan-400 hover:text-cyan-300 font-medium"
                  >
                    View Details →
                  </Link>
                </td>
              </tr>
            ))}
            {groups.length === 0 && (
              <tr>
                <td colSpan="5" className="p-8 text-center text-gray-500">
                  No grouped trips found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
