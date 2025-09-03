# --- VERSION 0.0.1 ---
# - Implements /api/trip-groups/<group_id>
# - Returns { logs, log_data } where log_data maps log_id -> list of rows

from flask import Blueprint, jsonify
from backend.db_manager import get_trip_group_logs, get_data_for_log

trips_bp = Blueprint('trips', __name__)

@trips_bp.route('/api/trip-groups/<group_id>', methods=['GET'])
def get_trip_group(group_id):
    try:
        logs = get_trip_group_logs(group_id) or []
        log_data = {}
        for log in logs:
            lid = log.get("log_id")
            if lid is None:
                continue
            rows = get_data_for_log(lid) or []
            log_data[lid] = rows
        return jsonify({
            "logs": logs,
            "log_data": log_data
        }), 200
    except Exception as e:
        print(f"[trips.py] Error fetching trip group {group_id}: {e}")
        return jsonify({"error": str(e)}), 500
