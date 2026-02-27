
from flask import Blueprint, request, jsonify
from services.waypoint_service import WaypointService

tools_bp = Blueprint('tools', __name__)

@tools_bp.route('/api/tools/waypoints/preview', methods=['POST'])
def preview_waypoints():
    try:
        data = request.get_json()
        fuzziness = float(data.get('fuzziness', 100)) # Default 100 meters
        bounds = data.get('bounds') # Optional bounding box
        
        service = WaypointService()
        clusters = service.preview_clusters(fuzziness, bounds)
        
        return jsonify({
            "fuzziness": fuzziness,
            "count": len(clusters),
            "clusters": clusters
        }), 200
    except Exception as e:
        print(f"[tools.py] Error previewing waypoints: {e}")
        return jsonify({"error": str(e)}), 500

@tools_bp.route('/api/tools/waypoints/apply', methods=['POST'])
def apply_waypoints():
    try:
        data = request.get_json()
        fuzziness = float(data.get('fuzziness', 100))
        min_cluster_size = int(data.get('min_cluster_size', 1))
        
        service = WaypointService()
        count = service.apply_clusters(fuzziness, min_cluster_size)
        
        return jsonify({
            "success": True,
            "message": f"Successfully updated waypoints. Created {count} locations."
        }), 200
    except Exception as e:
        print(f"[tools.py] Error applying waypoints: {e}")
        return jsonify({"error": str(e)}), 500
