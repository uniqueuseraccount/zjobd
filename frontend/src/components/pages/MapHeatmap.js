
import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';

export default function MapHeatmap() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/map/heatmap')
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching map heatmap:", err);
        setLoading(false);
      });
  }, []);

  const geoJsonData = useMemo(() => {
    if (!data || data.length === 0) return null;
    
    // Convert flat list of segments to a GeoJSON FeatureCollection
    return {
      type: "FeatureCollection",
      features: data.map(seg => ({
        type: "Feature",
        properties: { name: seg.name },
        geometry: seg.geometry
      }))
    };
  }, [data]);

  const mapStyle = {
    color: "#ff0000",
    weight: 2,
    opacity: 0.1  // Low opacity for heatmap effect
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Loading map data...</div>;

  return (
    <div className="h-[calc(100vh-100px)] w-full bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
      <MapContainer 
        center={[44.9778, -93.2650]} // Default to Minneapolis
        zoom={10} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {geoJsonData && (
          <GeoJSON 
            data={geoJsonData} 
            style={mapStyle} 
            onEachFeature={(feature, layer) => {
              if (feature.properties && feature.properties.name) {
                layer.bindTooltip(feature.properties.name, { sticky: true });
              }
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
