
from flask import Blueprint, jsonify
from log2db.db_manager import DatabaseManager
from config.db_credentials import DB_CONFIG

groups_bp = Blueprint('groups', __name__)

@groups_bp.route('/api/track-groups', methods=['GET'])
def get_track_groups():
    db = DatabaseManager(DB_CONFIG)
    try:
        groups = db.get_track_groups()
        return jsonify(groups)
    finally:
        db.close()

@groups_bp.route('/api/track-groups/<int:start_id>/<int:end_id>', methods=['GET'])
def get_track_group_detail(start_id, end_id):
    db = DatabaseManager(DB_CONFIG)
    try:
        logs = db.get_logs_for_track_group(start_id, end_id)
        
        # Hydrate with full log data for the chart/map
        gps_data_map = {}
        log_data_map = {}
        for log in logs:
            log_id = log['log_id']
            data, _, _, _ = db.get_data_for_log(log_id)
            log_data_map[log_id] = data
            gps_data_map[log_id] = [d for d in data if d.get('latitude') and d.get('longitude')]

        return jsonify({
            "logs": logs,
            "gps_data": gps_data_map,
            "log_data": log_data_map
        })
    finally:
        db.close()
