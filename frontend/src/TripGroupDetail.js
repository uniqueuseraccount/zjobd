// In frontend/src/TripGroupDetail.js

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import TripMap from './TripMap';
import DataChart from './DataChart';

const TripGroupDetail = () => {
    const { groupId } = useParams();
    const [groupData, setGroupData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    // --- FIX: Initialize timeRange to the default 10-minute (600 seconds) window ---
    const [timeRange, setTimeRange] = useState({ min: 0, max: 600 });

    useEffect(() => {
        const fetchGroupData = async () => {
            setLoading(true);
            try {
                const response = await axios.get(`http://localhost:5001/api/trip-groups/${groupId}`);
                setGroupData(response.data);
            } catch (err) {
                setError('Failed to fetch trip group details.');
            } finally {
                setLoading(false);
            }
        };

        fetchGroupData();
    }, [groupId]);

    if (loading) return <div>Loading...</div>;
    if (error) return <div style={{color: 'red'}}>ERROR: {error}</div>;
    if (!groupData) return <div>No data available for this trip group.</div>;

    return (
        <div className="trip-group-detail-container">
            <h2>Trip Group: {groupId}</h2>
            
            <div className="log-summary-section" style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}>
                <h4>Logs in this Group:</h4>
                <ul style={{ listStyle: 'none', paddingLeft: '0' }}>
                    {groupData.logs.map(log => (
                        <li key={log.log_id} style={{ marginBottom: '5px' }}>
                            <Link to={`/logs/${log.log_id}`} style={{ textDecoration: 'none', color: '#007bff' }}>
                                <strong>{log.file_name}</strong>
                            </Link>
                            <span style={{ marginLeft: '15px', color: '#666' }}>
                                - Started: {new Date(log.start_timestamp * 1000).toLocaleString()}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
            
            <div className="data-chart-section">
                <DataChart 
                    groupData={groupData} 
                    onTimeRangeChange={setTimeRange}
                />
            </div>
            
            <div className="map-section" style={{marginTop: '20px'}}>
                <TripMap 
                    groupData={groupData} 
                    timeRange={timeRange} 
                />
            </div>
        </div>
    );
};

export default TripGroupDetail;