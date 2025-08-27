// In frontend/src/LogDetail.js

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import TripMap from './TripMap';
import DataChart from './DataChart';

const LogDetail = () => {
    const { logId } = useParams();
    const [logDetails, setLogDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [timeRange, setTimeRange] = useState({ min: 0, max: 600 });

    useEffect(() => {
        const fetchLogData = async () => {
            setLoading(true);
            try {
                const response = await axios.get(`http://localhost:5001/api/logs/${logId}/data`);
                const { data, columns, statistics, trip_info, normalized_names } = response.data;
                
                if (!data || !columns || !trip_info || !normalized_names) {
                    throw new Error("Incomplete data received from server.");
                }

                const formattedData = {
                    logs: [{
                        log_id: logId,
                        file_name: trip_info.file_name,
                        start_timestamp: trip_info.start_timestamp,
                        trip_duration_seconds: trip_info.trip_duration_seconds,
                    }],
                    all_data: { [logId]: data },
                    all_columns: { [logId]: columns },
                    // --- FIX: Provide the full normalized_names map for this log ---
                    normalized_names: { [logId]: normalized_names },
                    // Create the complete list of PIDs from the map keys
                    combined_pids: Object.keys(normalized_names),
                    statistics: { [logId]: statistics }
                };
                setLogDetails(formattedData);

            } catch (err) {
                setError(err.message || 'Failed to fetch log details.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchLogData();
    }, [logId]);

    if (loading) return <div>Loading log details...</div>;
    if (error) return <div>ERROR: {error}</div>;
    if (!logDetails) return <div>No data found for this log.</div>;

    return (
        <div className="log-detail-container">
            <h2>Log Detail: {logDetails.logs[0].file_name}</h2>
            <div className="data-chart-section">
                <DataChart
                    groupData={logDetails}
                    onTimeRangeChange={setTimeRange}
                />
            </div>
            <div className="map-section" style={{marginTop: '20px'}}>
                <TripMap
                    groupData={logDetails}
                    timeRange={timeRange}
                />
            </div>
        </div>
    );
};

export default LogDetail;