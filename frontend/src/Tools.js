// FILE: frontend/src/Tools.js

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

function StatCard({ title, value }) {
	return (
		<div className="bg-gray-700 p-4 rounded-lg text-center">
			<p className="text-sm text-gray-400">{title}</p>
			<p className="text-2xl font-bold text-cyan-400">{value}</p>
		</div>
	);
}

function Tools() {
	const [sensitivity, setSensitivity] = useState(3);
	const [preview, setPreview] = useState(null);
	const [currentStats, setCurrentStats] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [applyStatus, setApplyStatus] = useState('');

	const fetchCurrentStats = useCallback(async () => {
		setIsLoading(true);
		try {
			const response = await axios.get('http://localhost:5001/api/trip-groups/summary');
			setCurrentStats(response.data);
		} catch (error) {
			console.error("Error fetching current stats:", error);
		}
		setIsLoading(false);
	}, []);

	useEffect(() => {
		fetchCurrentStats();
	}, [fetchCurrentStats]);

	const handlePreview = useCallback(async () => {
		setIsLoading(true);
		setApplyStatus('');
		try {
			const response = await axios.post('http://localhost:5001/api/trip-groups/preview', { sensitivity });
			setPreview(response.data);
		} catch (error) {
			console.error("Error fetching preview:", error);
			setPreview({ error: "Could not fetch preview." });
		}
		setIsLoading(false);
	}, [sensitivity]);

	const handleApply = async () => {
		setIsLoading(true);
		setApplyStatus('Applying new grouping...');
		try {
			const response = await axios.post('http://localhost:5001/api/trips/apply-grouping', { sensitivity });
			setApplyStatus(response.data.message || 'Grouping applied successfully!');
			fetchCurrentStats();
		} catch (error) {
			setApplyStatus('An error occurred while applying the new grouping.');
		}
		setIsLoading(false);
	};

	return (
		<div className="bg-gray-800 rounded-lg shadow-xl p-6 space-y-6">
			<div>
				<h3 className="text-xl font-semibold">Trip Grouping Sensitivity</h3>
				<p className="text-gray-400 mt-1 mb-4">
					Adjust the "fuzziness" for automatic trip grouping. A higher number is more strict (less fuzzy). The default is 3. A lower number is less strict (more fuzzy).
				</p>
				<div className="flex items-center space-x-4">
					<input type="range" min="2" max="5" step="1" value={sensitivity} onChange={(e) => setSensitivity(parseInt(e.target.value))} className="w-64" />
					<span className="font-mono text-lg">{sensitivity}</span>
					<button onClick={handlePreview} disabled={isLoading} className="bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded-md disabled:opacity-50">
						{isLoading ? 'Loading...' : 'Preview'}
					</button>
					<button onClick={handleApply} disabled={isLoading} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-md disabled:opacity-50">
						Apply
					</button>
				</div>
				{applyStatus && <p className="mt-4 text-yellow-400">{applyStatus}</p>}
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div>
					<h4 className="font-bold text-lg mb-2">Current Stats</h4>
					{currentStats ? (
						<div className="grid grid-cols-2 gap-4">
							<StatCard title="Total Groups (>1 trip)" value={currentStats.total_groups} />
							<StatCard title="Trips in Groups" value={`${currentStats.total_trips_grouped} / ${currentStats.total_logs}`} />
							<StatCard title="Groups of 2" value={currentStats.group_counts.groups_of_2} />
							<StatCard title="Groups of 5+" value={currentStats.group_counts.groups_of_5_plus} />
						</div>
					) : <p>Loading...</p>}
				</div>
				<div>
					<h4 className="font-bold text-lg mb-2">Preview Stats (Sensitivity: {sensitivity})</h4>
					{preview ? (
						<div className="grid grid-cols-2 gap-4">
							<StatCard title="Total Groups (>1 trip)" value={preview.total_groups} />
							<StatCard title="Trips in Groups" value={preview.total_trips_grouped} />
							<StatCard title="Groups of 2" value={preview.group_counts.groups_of_2} />
							<StatCard title="Groups of 5+" value={preview.group_counts.groups_of_5_plus} />
						</div>
					) : <p className="text-gray-400">Press Preview to see results.</p>}
				</div>
			</div>
		</div>
	);
}

export default Tools;