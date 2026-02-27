
import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function StatCard({ title, value, color = "text-cyan-400" }) {
  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow border border-gray-700 text-center">
      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">{title}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default function TrackGroupList() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/track-groups')
      .then(res => {
        setGroups(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching track groups:", err);
        setLoading(false);
      });
  }, []);

  const stats = useMemo(() => {
    return {
      total: groups.length,
      gt2: groups.filter(g => g.trip_count >= 2).length,
      gt5: groups.filter(g => g.trip_count >= 5).length,
      gt10: groups.filter(g => g.trip_count >= 10).length,
      gt20: groups.filter(g => g.trip_count >= 20).length,
    };
  }, [groups]);

  if (loading) return <div className="p-4 text-gray-400">Loading track groups...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Track Groups (Waypoint-Based)</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title="Total Groups" value={stats.total} color="text-white" />
        <StatCard title="2+ Trips" value={stats.gt2} />
        <StatCard title="5+ Trips" value={stats.gt5} color="text-green-400" />
        <StatCard title="10+ Trips" value={stats.gt10} color="text-yellow-400" />
        <StatCard title="20+ Trips" value={stats.gt20} color="text-red-400" />
      </div>

      <div className="bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-700">
        <table className="w-full text-left text-gray-300">
          <thead className="bg-gray-700 text-gray-400 uppercase font-semibold text-sm">
            <tr>
              <th className="p-4">Start Location</th>
              <th className="p-4">End Location</th>
              <th className="p-4 text-center">Trip Count</th>
              <th className="p-4 text-right">Avg Duration</th>
              <th className="p-4 text-right">Avg Distance</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {groups.map((group, idx) => (
              <tr key={idx} className="hover:bg-gray-750 transition-colors">
                <td className="p-4 font-medium text-white">{group.start_location}</td>
                <td className="p-4 font-medium text-white">{group.end_location}</td>
                <td className="p-4 text-center">
                  <span className="bg-blue-900 text-blue-200 py-1 px-3 rounded-full text-xs font-bold">
                    {group.trip_count}
                  </span>
                </td>
                <td className="p-4 text-right">
                  {group.avg_duration ? `${(group.avg_duration / 60).toFixed(1)} min` : '-'}
                </td>
                <td className="p-4 text-right">
                  {group.avg_distance ? `${group.avg_distance.toFixed(2)} mi` : '-'}
                </td>
                <td className="p-4 text-right">
                  <Link 
                    to={`/track-groups/${group.start_waypoint_id}/${group.end_waypoint_id}`}
                    className="text-cyan-400 hover:text-cyan-300 font-medium"
                  >
                    View Details →
                  </Link>
                </td>
              </tr>
            ))}
            {groups.length === 0 && (
              <tr>
                <td colSpan="6" className="p-8 text-center text-gray-500">
                  No grouped tracks found. Try adjusting waypoint fuzziness in Tools.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
