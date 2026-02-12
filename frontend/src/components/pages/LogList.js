// FILE: frontend/src/LogList.js
//
// --- VERSION 1.0.0 ---
// - This is the new home for the log list component, previously in App.js.
// - It now uses `useNavigate` from `react-router-dom` to make each row
//   a clickable link that navigates to the detail page for that log.
// -----------------------------

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function LogList() {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('Loading...');
  const navigate = useNavigate();

  useEffect(() => {
	const fetchLogs = async () => {
	  try {
		const response = await axios.get('http://localhost:5001/api/logs');
		setLogs(response.data);
		if (response.data.length === 0) {
		  setStatus('No logs found. Add CSV files to the logs folder!');
		}
	  } catch (error) {
		console.error("Error fetching logs:", error);
		setStatus('Could not connect to the backend. Is the Flask server running?');
	  }
	};
	fetchLogs();
  }, []);

  const formatTimestamp = (unixTimestamp) => new Date(unixTimestamp * 1000).toLocaleString();
  const formatDuration = (seconds) => {
	if (seconds < 0) return '00:00';
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = Math.floor(seconds % 60);
	return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  const handleRowClick = (logId) => {
	navigate(`/logs/${logId}`);
  };

  return (
	<div className="bg-gray-800 rounded-lg shadow-xl p-4">
	  <div className="overflow-x-auto">
		{logs.length > 0 ? (
		  <table className="w-full text-left">
			<thead className="border-b-2 border-cyan-500">
			  <tr>
				<th className="p-3">Log File</th>
				<th className="p-3">Trip Start Time</th>
				<th className="p-3 text-right">Duration (min:sec)</th>
			  </tr>
			</thead>
			<tbody>
			  {logs.map((log) => (
				<tr 
				  key={log.log_id} 
				  className="border-b border-gray-700 hover:bg-gray-700/50 cursor-pointer"
				  onClick={() => handleRowClick(log.log_id)}
				>
				  <td className="p-3 font-mono">{log.file_name}</td>
				  <td className="p-3">{formatTimestamp(log.start_timestamp)}</td>
				  <td className="p-3 text-right font-mono">{formatDuration(log.trip_duration_seconds)}</td>
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

export default LogList;