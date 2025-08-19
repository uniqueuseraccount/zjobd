# FILE: backend/app.py
#
# --- VERSION 1.9.4-ALPHA ---
# - FIXED: Corrected ambiguous column name `trip_duration_seconds` in the SQL 
#   query within the get_log_data function.
# - INFO: This version is a consolidated and corrected version of the app.py file.
# -----------------------------

import os
import time
import logging
import sys
from threading import Thread

from flask import Flask, request, jsonify
from flask_cors import CORS
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

try:
	from db_credentials import DB_CONFIG
	from log2db.utils import setup_logging
	from log2db.db_manager import DatabaseManager
	from log2db.core import process_log_file
	from group_trips import group_trips_logic
except ImportError as e:
	print(f"FATAL: A required file or module could not be imported: {e}", file=sys.stderr)
	sys.exit(1)

app = Flask(__name__)
CORS(app)
logger = logging.getLogger(__name__)

class LogFileHandler(FileSystemEventHandler):
	def __init__(self, db_manager_class, db_config):
		self.db_manager_class = db_manager_class
		self.db_config = db_config

	def on_created(self, event):
		if not event.is_directory and event.src_path.lower().endswith('.csv'):
			app.logger.info(f"WATCHDOG: New file detected: {event.src_path}")
			time.sleep(2)
			db_manager = self.db_manager_class(self.db_config)
			try:
				process_log_file(event.src_path, db_manager)
			finally:
				db_manager.close()

def start_watcher():
	path_to_watch = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'logs'))
	if not os.path.isdir(path_to_watch):
		os.makedirs(path_to_watch)
	app.logger.info(f"WATCHDOG: Starting file watcher on directory: {path_to_watch}")
	event_handler = LogFileHandler(DatabaseManager, DB_CONFIG)
	observer = Observer()
	observer.schedule(event_handler, path_to_watch, recursive=False)
	observer.start()
	app.logger.info("WATCHDOG: File watcher started successfully.")
	try:
		while True: time.sleep(1)
	except KeyboardInterrupt:
		observer.stop()
	observer.join()

@app.route('/api/logs', methods=['GET'])
def get_logs():
	db_manager = DatabaseManager(DB_CONFIG)
	try:
		return jsonify(db_manager.get_all_logs())
	finally:
		db_manager.close()

@app.route('/api/logs/<int:log_id>/data', methods=['GET'])
def get_log_data(log_id):
	db_manager = DatabaseManager(DB_CONFIG)
	try:
		log_data, columns, statistics, _ = db_manager.get_data_for_log(log_id)
		trip_info = db_manager.fetch_one("SELECT li.file_name, t.trip_group_id, t.distance_miles, li.trip_duration_seconds FROM log_index li LEFT JOIN trips t ON li.log_id = t.log_id WHERE li.log_id = %s", (log_id,))
		group_logs = []
		if trip_info and trip_info.get('trip_group_id'):
			group_logs = db_manager.get_logs_for_trip_group(trip_info['trip_group_id'])

		return jsonify({
			"data": log_data, 
			"columns": columns, 
			"statistics": statistics,
			"trip_info": trip_info,
			"group_logs": group_logs
		})
	except Exception as e:
		app.logger.error(f"Error fetching data for log_id {log_id}: {e}", exc_info=True)
		return jsonify({"error": "Could not fetch log data"}), 500
	finally:
		db_manager.close()

@app.route('/api/trip-groups', methods=['GET'])
def get_trip_groups():
	db_manager = DatabaseManager(DB_CONFIG)
	try:
		return jsonify(db_manager.get_all_trip_groups())
	finally:
		db_manager.close()

# FILE: backend/app.py
		# ... (previous code in the file) ...
		
@app.route('/api/trip-groups/<group_id>', methods=['GET'])
def get_trip_group_detail(group_id):
	db_manager = DatabaseManager(DB_CONFIG)
	try:
		logs = db_manager.get_logs_for_trip_group(group_id)
		gps_data_map = {}
		log_data_map = {}
		for log in logs:
			log_id = log['log_id']
			# --- FIX: Capture and include the 'columns' for each log ---
			data, columns, _, _ = db_manager.get_data_for_log(log_id)
			log_data_map[log_id] = {
				"data": data,
				"columns": columns
			}
			# --- END FIX ---
			
			# Find latitude and longitude column names dynamically
			lat_col = next((col for col in columns if 'latitude' in col.lower()), None)
			lon_col = next((col for col in columns if 'longitude' in col.lower()), None)

			if lat_col and lon_col:
				gps_data_map[log_id] = [
					d for d in data if d.get(lat_col) is not None and d.get(lon_col) is not None
				]
			else:
				gps_data_map[log_id] = []


		return jsonify({"logs": logs, "gps_data": gps_data_map, "log_data": log_data_map})
	except Exception as e:
		app.logger.error(f"Error fetching data for trip group {group_id}: {e}", exc_info=True)
		return jsonify({"error": "Could not fetch trip group data"}), 500
	finally:
		db_manager.close()

@app.route('/api/trip-groups/summary', methods=['GET'])
def get_trip_group_summary():
	db_manager = DatabaseManager(DB_CONFIG)
	try:
		return jsonify(db_manager.get_trip_group_summary())
	finally:
		db_manager.close()

@app.route('/api/trip-groups/preview', methods=['POST'])
def preview_trip_groups():
	data = request.get_json()
	sensitivity = data.get('sensitivity', 3)
	groups = group_trips_logic(preview_mode=True, sensitivity=sensitivity)
	
	group_counts = {"groups_of_2": 0, "groups_of_3_4": 0, "groups_of_5_plus": 0}
	total_trips_in_groups = 0
	for group in groups.values():
		count = len(group)
		if count == 2: group_counts["groups_of_2"] += 1
		elif count in [3, 4]: group_counts["groups_of_3_4"] += 1
		elif count >= 5: group_counts["groups_of_5_plus"] += 1
		if count > 1: total_trips_in_groups += count

	summary = {
		"total_groups": len([g for g in groups.values() if len(g) > 1]),
		"total_trips_grouped": total_trips_in_groups,
		"group_counts": group_counts
	}
	return jsonify(summary)

@app.route('/api/trips/apply-grouping', methods=['POST'])
def apply_grouping():
	data = request.get_json()
	sensitivity = data.get('sensitivity', 3)
	try:
		group_trips_logic(preview_mode=False, sensitivity=sensitivity)
		return jsonify({"success": True, "message": f"Successfully applied new grouping with sensitivity {sensitivity}."})
	except Exception as e:
		app.logger.error(f"Error applying trip grouping: {e}", exc_info=True)
		return jsonify({"error": "Failed to apply grouping."}), 500

if __name__ == '__main__':
	if os.environ.get("WERKZEUG_RUN_MAIN") == "true":
		logger = setup_logging() 
		app.logger.handlers.extend(logger.handlers)
		app.logger.setLevel(logging.INFO)
	
	app.logger.info("Verifying database schema before startup...")
	startup_db_manager = DatabaseManager(DB_CONFIG)
	try:
		startup_db_manager.ensure_base_tables_exist()
		app.logger.info("Database schema verified successfully.")
	except Exception as e:
		app.logger.critical(f"Could not verify or create database schema on startup: {e}")
		sys.exit(1)
	finally:
		startup_db_manager.close()
	
	watcher_thread = Thread(target=start_watcher, daemon=True)
	watcher_thread.start()
	
	app.logger.info("Starting Flask web server...")
	app.run(host='0.0.0.0', port=5001, debug=True)