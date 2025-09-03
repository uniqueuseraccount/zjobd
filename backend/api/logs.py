# --- VERSION 0.0.1 ---
# - Implements /api/logs/<log_id>/data
# - Calls db_manager.get_data_for_log
# - Returns { columns, data, ... } in JSON

from flask import Blueprint, jsonify
from backend.db_manager import get_data_for_log

logs_bp = Blueprint('logs', __name__)

@logs_bp.route('/api/logs/<int:log_id>/data', methods=['GET'])
def get_log_data(log_id):
    try:
        rows = get_data_for_log(log_id)
        if not rows:
            return jsonify({"columns": [], "data": []}), 200
        columns = list(rows[0].keys())
        return jsonify({
            "columns": columns,
            "data": rows
        }), 200
    except Exception as e:
        # Log to server console for program_logs correlation
        print(f"[logs.py] Error fetching log {log_id}: {e}")
        return jsonify({"error": str(e)}), 500
