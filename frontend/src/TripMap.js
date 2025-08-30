// FILE: frontend/src/TripMap.js
//
// --- VERSION 1.9.7-ALPHA ---
// - FIXED: Removed unused `Tooltip` import to resolve console warning.
// ---------------------------

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const STATE_COLORS = { "Closed Loop (Idle)": "#34D399", "Closed Loop (City)": "#60A5FA", "Closed Loop (Highway)": "#38BDF8", "Open Loop (WOT Accel)": "#F87171", "Open Loop (Decel Fuel Cut)": "#FBBF24", "Open Loop (Cold Start)": "#A78BFA", "default": "#9CA3AF" };
const COMPARISON_COLOR = "#6B7280";

const CHART_COLORS = [ '#38BDF8', '#F59E0B', '#4ADE80', '#F472B6', '#A78BFA', '#2DD4BF', '#FB7185', '#FACC15', '#818CF8', '#FDE047' ];

function MapController({ bounds }) {
	const map = useMap();
	useEffect(() => {
		if (bounds && bounds.length === 2 && bounds[0][0] !== Infinity) {
			map.fitBounds(bounds, { padding: [50, 50] });
		}
	}, [bounds, map]);
	return null;
}

function TripMap({ primaryPath, comparisonPath, columns, visibleRange, multiRoute = false, labels = [] }) {
	const latCol = columns.find(c => c.includes('latitude'));
	const lonCol = columns.find(c => c.includes('longitude'));

	const getPathSegments = (path) => {
		if (!path || !latCol || !lonCol) return [];
		const segments = [];
		let currentSegment = { color: STATE_COLORS.default, points: [] };
		path.forEach(row => {
			const stateColor = STATE_COLORS[row.operating_state] || STATE_COLORS.default;
			const point = [row[latCol], row[lonCol]];
			if (point[0] && point[1] && point[0] !== 0) {
				if (stateColor !== currentSegment.color && currentSegment.points.length > 0) {
					segments.push(currentSegment);
					currentSegment = { color: stateColor, points: [currentSegment.points[currentSegment.points.length - 1]] };
				}
				currentSegment.color = stateColor;
				currentSegment.points.push(point);
			}
		});
		if (currentSegment.points.length > 1) segments.push(currentSegment);
		return segments;
	};
	
	const getBounds = () => {
    	if (!primaryPath) return [[44.97, -93.26], [44.98, -93.27]];

    	if (multiRoute) {
        	const allPoints = Array.isArray(primaryPath) && typeof primaryPath.flat === 'function'
            	? primaryPath.flat().filter(p => p[0] && p[1] && p[0] !== 0)
            	: [];
        	if (allPoints.length === 0) return [[44.97, -93.26], [44.98, -93.27]];
        		const latitudes = allPoints.map(p => p[0]);
        		const longitudes = allPoints.map(p => p[1]);
        	return [[Math.min(...latitudes), Math.min(...longitudes)], [Math.max(...latitudes), Math.max(...longitudes)]];
    	}

    	const path = primaryPath.slice(visibleRange?.min ?? 0, (visibleRange?.max ?? primaryPath.length - 1) + 1);
    	const points = path.map(row => [row[latCol], row[lonCol]]).filter(p => p[0] && p[1] && p[0] !== 0);
    	if (points.length === 0) return [[44.97, -93.26], [44.98, -93.27]];
    		const latitudes = points.map(p => p[0]);
    		const longitudes = points.map(p => p[1]);
    	return [[Math.min(...latitudes), Math.min(...longitudes)], [Math.max(...latitudes), Math.max(...longitudes)]];
	};


	const bounds = getBounds();
	const primarySegments = multiRoute ? [] : getPathSegments(primaryPath);
	const comparisonSegments = comparisonPath ? getPathSegments(comparisonPath) : [];




	return (
			<MapContainer bounds={bounds} style={{ height: '100%', width: '100%', backgroundColor: '#1F2937', borderRadius: '0.5rem' }}>
			<MapController bounds={bounds} />
			<TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
			
			{multiRoute ? (
				primaryPath.map((path, index) => (
					<Polyline key={`multi-${index}`} positions={path.map(p => [p.latitude, p.longitude])} color={CHART_COLORS[index % CHART_COLORS.length]} />
				))
			) : (
				<>
					{comparisonPath && comparisonSegments.map((segment, index) => <Polyline key={`comp-${index}`} positions={segment.points} color={COMPARISON_COLOR} weight={5} opacity={0.6} dashArray="5, 10" />)}
					{primarySegments.map((segment, index) => <Polyline key={index} positions={segment.points} color={segment.color} weight={5} />)}
				</>
			)}
		</MapContainer>
	);
}

export default TripMap;