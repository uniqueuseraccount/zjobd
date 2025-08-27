// FILE: frontend/src/TripGroupList.js
//
// --- VERSION 1.5.0 ---
// - This is a new page component that fetches and displays a list of all
//   trip groups that have more than one trip.
// - Each group is a clickable link to the comparison view.
// -----------------------------

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function TripGroupList() {
	const [groups, setGroups] = useState([]);
	const [status, setStatus] = useState('Loading trip groups...');
	const navigate = useNavigate();

	useEffect(() => {
		const fetchGroups = async () => {
			try {
				const response = await axios.get('http://localhost:5001/api/trip-groups');
				setGroups(response.data);
				if (response.data.length === 0) {
					setStatus('No trip groups found. Run the grouping script or add more logs with similar start/end points.');
				}
			} catch (error) {
				console.error("Error fetching trip groups:", error);
				setStatus('Could not connect to the backend.');
			}
		};
		fetchGroups();
	}, []);

	const handleGroupClick = (groupId) => {
		navigate(`/trip-groups/${groupId}`);
	};
	
	// A simple function to create a human-readable name for a group
	const getGroupName = (group) => {
		const lat1 = parseFloat(group.avg_start_lat).toFixed(2);
		const lon1 = parseFloat(group.avg_start_lon).toFixed(2);
		const lat2 = parseFloat(group.avg_end_lat).toFixed(2);
		const lon2 = parseFloat(group.avg_end_lon).toFixed(2);
		return `Trip from (${lat1}, ${lon1}) to (${lat2}, ${lon2})`;
	};

	return (
		<div className="bg-gray-800 rounded-lg shadow-xl p-4">
			<h2 className="text-2xl font-bold mb-4 text-cyan-400">Recurring Trip Groups</h2>
			<div className="overflow-x-auto">
				{groups.length > 0 ? (
					<table className="w-full text-left">
						<thead className="border-b-2 border-cyan-500">
							<tr>
								<th className="p-3">Trip Route</th>
								<th className="p-3 text-right">Number of Trips</th>
							</tr>
						</thead>
						<tbody>
							{groups.map((group) => (
								<tr 
									key={group.trip_group_id} 
									className="border-b border-gray-700 hover:bg-gray-700/50 cursor-pointer"
									onClick={() => handleGroupClick(group.trip_group_id)}
								>
									<td className="p-3 font-mono">{getGroupName(group)}</td>
									<td className="p-3 text-right font-mono">{group.trip_count}</td>
								</tr>
							))}
						</tbody>
					</table>
				) : (
					<p className="text-center text-gray-400 py-8">{status}</p>
				)}
			</div>
		</div>
	);
}

export default TripGroupList;