import os
import shutil
import logging
from datetime import datetime
from flask import Blueprint, request, jsonify
from log2db.db_manager import DatabaseManager
from config.db_credentials import DB_CONFIG

maintenance_bp = Blueprint('maintenance', __name__)

def get_maintenance_logger():
    """Returns a logger specifically for maintenance tasks, stored in project root."""
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    log_dir = os.path.join(base_dir, 'program_logs')
    
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    
    # We want a persistent maintenance log file for today
    log_file_name = datetime.now().strftime("maintenance_%Y%m%d.log")
    log_file_path = os.path.join(log_dir, log_file_name)

    logger = logging.getLogger('maintenance_logger')
    if not logger.handlers:
        file_handler = logging.FileHandler(log_file_path)
        formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
        logger.setLevel(logging.INFO)
    return logger

@maintenance_bp.route('/api/maintenance/search-by-columns', methods=['POST'])
def search_by_columns():
    data = request.get_json()
    column_names = data.get('column_names', [])
    m_logger = get_maintenance_logger()
    m_logger.info(f"SEARCH: User searching for logs containing columns: {column_names}")
    
    db = DatabaseManager(DB_CONFIG)
    try:
        logs = db.get_logs_by_columns(column_names)
        
        # Hydrate with total row counts for the preview
        for log in logs:
            count_res = db.fetch_one("SELECT COUNT(*) as count FROM log_data WHERE log_id = %s", (log['log_id'],))
            log['total_rows'] = count_res['count'] if count_res else 0
            
        m_logger.info(f"SEARCH: Found {len(logs)} matching logs.")
        return jsonify(logs)
    finally:
        db.close()

@maintenance_bp.route('/api/maintenance/column-stats', methods=['GET'])
def get_column_stats():
    db = DatabaseManager(DB_CONFIG)
    try:
        stats = db.get_all_columns_with_stats()
        return jsonify(stats)
    finally:
        db.close()

@maintenance_bp.route('/api/maintenance/available-pids', methods=['GET'])
def get_available_pids():
    db = DatabaseManager(DB_CONFIG)
    try:
        cols = db.fetch_all("SELECT column_name FROM column_definitions ORDER BY column_name")
        return jsonify([c['column_name'] for c in cols])
    finally:
        db.close()

@maintenance_bp.route('/api/maintenance/archive-logs', methods=['POST'])
def archive_logs():
    data = request.get_json()
    log_ids = data.get('log_ids', [])
    m_logger = get_maintenance_logger()
    m_logger.info(f"ARCHIVE_START: Request to archive {len(log_ids)} logs: {log_ids}")
    
    db = DatabaseManager(DB_CONFIG)
    archive_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'archive', 'unused_logs'))
    os.makedirs(archive_dir, exist_ok=True)
    
    results = []
    try:
        for lid in log_ids:
            log_info = db.fetch_one("SELECT file_name, start_time FROM log_index WHERE log_id = %s", (lid,))
            if not log_info:
                m_logger.warning(f"ARCHIVE_ERR: Log ID {lid} not found in database.")
                continue
            
            file_name = log_info['file_name']
            src_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'logs', file_name))
            dest_path = os.path.join(archive_dir, file_name)
            
            m_logger.info(f"ARCHIVE_PROC: Processing log {lid} | File: {file_name} | Start: {log_info['start_time']}")
            
            # 1. Delete from DB
            # We explicitly log the delete here too for visibility
            m_logger.info(f"ARCHIVE_DB: Deleting all references for log_id {lid} from log_index (Cascading to log_data, trips, tracks)")
            success = db.delete_log_complete(lid)
            
            # 2. Move file
            file_moved = False
            if success:
                if os.path.exists(src_path):
                    try:
                        shutil.move(src_path, dest_path)
                        file_moved = True
                        m_logger.info(f"ARCHIVE_FILE: Successfully moved {file_name} to {archive_dir}")
                    except Exception as e:
                        m_logger.error(f"ARCHIVE_FILE_ERR: Failed to move {file_name}: {e}")
                else:
                    m_logger.warning(f"ARCHIVE_FILE_ERR: Source file not found on disk: {src_path}")
            else:
                m_logger.error(f"ARCHIVE_DB_ERR: Failed to delete log {lid} from database. File not moved.")
            
            results.append({
                "log_id": lid,
                "file_name": file_name,
                "db_deleted": success,
                "file_archived": file_moved
            })
            
        m_logger.info(f"ARCHIVE_COMPLETE: Successfully processed {len([r for r in results if r['db_deleted']])} logs.")
        return jsonify({"results": results, "success": True})
    finally:
        db.close()

@maintenance_bp.route('/api/maintenance/blacklist-pids', methods=['POST'])
def blacklist_pids():
    data = request.get_json()
    pids = data.get('pids', []) # list of column_name
    m_logger = get_maintenance_logger()
    m_logger.info(f"BLACKLIST_START: Request to blacklist {len(pids)} PIDs: {pids}")
    
    db = DatabaseManager(DB_CONFIG)
    results = []
    try:
        for pid in pids:
            m_logger.info(f"BLACKLIST_PROC: Blacklisting PID '{pid}' and dropping column from log_data.")
            success = db.blacklist_column(pid)
            if success:
                m_logger.info(f"BLACKLIST_SUCCESS: PID '{pid}' blacklisted.")
            else:
                m_logger.error(f"BLACKLIST_ERR: Failed to blacklist PID '{pid}'.")
            results.append({"pid": pid, "success": success})
            
        return jsonify({"results": results, "success": True})
    finally:
        db.close()

@maintenance_bp.route('/api/maintenance/blacklist', methods=['GET'])
def get_blacklist():
    db = DatabaseManager(DB_CONFIG)
    try:
        return jsonify(db.get_blacklist())
    finally:
        db.close()

@maintenance_bp.route('/api/maintenance/blacklist/remove', methods=['POST'])
def remove_from_blacklist():
    data = request.get_json()
    pid = data.get('pid')
    m_logger = get_maintenance_logger()
    m_logger.info(f"WHITELIST: Removing '{pid}' from blacklist.")
    
    db = DatabaseManager(DB_CONFIG)
    try:
        success = db.remove_from_blacklist(pid)
        return jsonify({"success": success})
    finally:
        db.close()
