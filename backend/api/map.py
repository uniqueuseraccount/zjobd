
from flask import Blueprint, jsonify
from log2db.db_manager import DatabaseManager
from config.db_credentials import DB_CONFIG
import json

map_bp = Blueprint('map', __name__)

@map_bp.route('/api/map/heatmap', methods=['GET'])
def get_map_heatmap():
    db = DatabaseManager(DB_CONFIG)
    try:
        # Fetch matched segments with geometry
        # We limit to valid geometries. 
        # Optimize: If dataset is huge, we might need simplification or bounding box.
        # For now, fetch all.
        query = """
            SELECT segment_id, log_id, osm_name, geometry 
            FROM matched_segments 
            WHERE geometry IS NOT NULL AND geometry != ''
        """
        rows = db.fetch_all(query)
        
        results = []
        for row in rows:
            try:
                # Parse the stored JSON string back to an object
                geo = json.loads(row['geometry'])
                results.append({
                    "id": row['segment_id'],
                    "name": row['osm_name'],
                    "geometry": geo
                })
            except json.JSONDecodeError:
                continue
                
        return jsonify(results) 
    finally:
        db.close()
