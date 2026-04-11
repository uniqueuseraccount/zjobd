# FILE: backend/app.py

import os
import time
import logging
import sys
import queue
from threading import Thread

from flask import Flask, request, jsonify
from flask_cors import CORS
from watchdog.observers.polling import PollingObserver as Observer
from watchdog.events import FileSystemEventHandler

try:
	from config.db_credentials import DB_CONFIG
	from log2db.utils import setup_logging
	from log2db.db_manager import DatabaseManager
	from log2db.core import process_log_file
	from archive.group_trips import group_trips_logic
	from api.tools import tools_bp
	from api.groups import groups_bp
	from api.map import map_bp
	from api.maintenance import maintenance_bp
	from services.fit_scoring_service import FitScoringService
	from utils.gpx_exporter import generate_gpx
except ImportError as e:
	print(f"FATAL: A required file or module could not be imported: {e}", file=sys.stderr)
	sys.exit(1)

app = Flask(__name__)
CORS(app)
logger = logging.getLogger(__name__)

# Register Blueprints
app.register_blueprint(tools_bp)
app.register_blueprint(groups_bp)
app.register_blueprint(map_bp)
app.register_blueprint(maintenance_bp)

# Global queue for files waiting to be processed
processing_queue = queue.Queue()

class LogFileHandler(FileSystemEventHandler):
	def on_created(self, event):
		if not event.is_directory and event.src_path.lower().endswith('.csv'):
			app.logger.info(f"WATCHDOG: New file detected and queued: {event.src_path}")
			processing_queue.put(event.src_path)

def processing_worker(db_manager_class, db_config):
	"""
	Background worker that pulls files from the queue and processes them in batches.
	"""
	app.logger.info("WORKER: Ingestion worker thread started.")
	while True:
		try:
			# Wait for at least one item
			file_path = processing_queue.get()
			batch = [file_path]
			
			# Try to grab up to 4 more items immediately (to make a batch of 5)
			for _ in range(4):
				try:
					batch.append(processing_queue.get_nowait())
				except queue.Empty:
					break
			
			app.logger.info(f"WORKER: Starting batch processing of {len(batch)} files...")
			
			db_manager = db_manager_class(db_config)
			try:
				for path in batch:
					try:
						app.logger.info(f"WORKER: Processing {os.path.basename(path)}")
						process_log_file(path, db_manager)
					except Exception as e:
						app.logger.error(f"WORKER: Error processing {path}: {e}")
					finally:
						processing_queue.task_done()
			finally:
				db_manager.close()
				
			app.logger.info(f"WORKER: Batch processing complete.")
			
		except Exception as e:
			app.logger.error(f"WORKER: Critical failure in worker thread: {e}")
			time.sleep(5) 

def start_watcher():
	path_to_watch = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'logs'))
	if not os.path.isdir(path_to_watch):
		os.makedirs(path_to_watch)
	
	# Start worker thread
	worker = Thread(target=processing_worker, args=(DatabaseManager, DB_CONFIG), daemon=True)
	worker.start()
	
	# Initial scan for unprocessed files
	app.logger.info(f"WATCHDOG: Performing initial scan of {path_to_watch}...")
	db_manager = DatabaseManager(DB_CONFIG)
	try:
		import glob
		all_csvs = glob.glob(os.path.join(path_to_watch, "*.csv"))
		queued_count = 0
		for f in all_csvs:
			if not db_manager.is_file_processed(os.path.basename(f)):
				processing_queue.put(f)
				queued_count += 1
		app.logger.info(f"WATCHDOG: Initial scan complete. Queued {queued_count} pending files.")
	finally:
		db_manager.close()
	
	app.logger.info(f"WATCHDOG: Starting file watcher on directory: {path_to_watch}")
	event_handler = LogFileHandler()
	observer = Observer()
	observer.schedule(event_handler, path_to_watch, recursive=False)
	observer.start()
	app.logger.info("WATCHDOG: File watcher and worker thread started successfully.")
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
		# Log the request for auditing
		app.logger.info(f"API_REQUEST: Fetching log data for log_id {log_id}")
		
		log_data, columns, statistics, _ = db_manager.get_data_for_log(log_id)
		
		# Better trip_info query including start_time from log_index
		query = """
			SELECT 
				li.file_name, 
				li.start_time, 
				li.trip_duration_seconds as duration_seconds,
				t.trip_group_id, 
				t.distance_miles
			FROM log_index li 
			LEFT JOIN trips t ON li.log_id = t.log_id 
			WHERE li.log_id = %s
		"""
		trip_info = db_manager.fetch_one(query, (log_id,))
		
		# Fallback: if distance_miles is None/0, check log_data for 'trip_distance' PIDs
		if not trip_info or not trip_info.get('distance_miles'):
			# Find if there's a column like 'trip_distance' in the log_data
			# We'll check column_definitions first to see which sanitized name to use
			distance_col_res = db_manager.fetch_one("""
				SELECT sanitized_name 
				FROM column_definitions 
				WHERE column_name LIKE 'trip_distance%' OR sanitized_name LIKE 'trip_distance%'
				LIMIT 1
			""")
			
			if distance_col_res:
				sanitized_dist_col = distance_col_res['sanitized_name']
				# Get the maximum value for this log
				dist_query = f"SELECT MAX(`{sanitized_dist_col}`) as max_dist FROM log_data WHERE log_id = %s"
				dist_val_res = db_manager.fetch_one(dist_query, (log_id,))
				if dist_val_res and dist_val_res['max_dist']:
					if not trip_info:
						trip_info = {'distance_miles': dist_val_res['max_dist']}
					else:
						trip_info['distance_miles'] = dist_val_res['max_dist']

		# Ensure we have at least basic info from log_index
		if trip_info and trip_info.get('start_time'):
			# Convert datetime to ISO format for better JS parsing
			if hasattr(trip_info['start_time'], 'isoformat'):
				trip_info['start_time'] = trip_info['start_time'].isoformat()
		
		group_logs = []
		if trip_info and trip_info.get('trip_group_id'):
			group_logs = db_manager.get_logs_for_trip_group(trip_info['trip_group_id'])

		app.logger.info(f"API_SUCCESS: Returned {len(log_data)} rows for log_id {log_id}. Distance: {trip_info.get('distance_miles') if trip_info else 'N/A'}")

		return jsonify({
			"data": log_data, 
			"columns": columns, 
			"statistics": statistics,
			"trip_info": trip_info,
			"group_logs": group_logs
		})
	except Exception as e:
		app.logger.error(f"API_ERROR: Error fetching data for log_id {log_id}: {e}", exc_info=True)
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

@app.route('/api/trip-groups/<group_id>', methods=['GET'])
def get_trip_group_detail(group_id):
	db_manager = DatabaseManager(DB_CONFIG)
	try:
		logs = db_manager.get_logs_for_trip_group(group_id)
		gps_data_map = {}
		log_data_map = {}
		for log in logs:
			log_id = log['log_id']
			data, _, _, _ = db_manager.get_data_for_log(log_id)
			log_data_map[log_id] = data
			gps_data_map[log_id] = [d for d in data if d.get('latitude') and d.get('longitude')]

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

@app.route('/api/logs/<int:log_id>/comparable', methods=['GET'])
def get_comparable_logs(log_id):
	db_manager = DatabaseManager(DB_CONFIG)
	try:
		scorer = FitScoringService(db_manager)
		matches = scorer.find_best_matches(log_id)
		return jsonify(matches)
	except Exception as e:
		app.logger.error(f"Error finding comparable logs for {log_id}: {e}", exc_info=True)
		return jsonify({"error": "Failed to find comparable logs"}), 500
	finally:
		db_manager.close()

@app.route('/api/logs/<int:log_id>/export/gpx', methods=['GET'])
def export_log_gpx(log_id):
	db_manager = DatabaseManager(DB_CONFIG)
	try:
		# Fetch the full data rows for this log
		data, _, _, _ = db_manager.get_data_for_log(log_id)
		log_info = db_manager.fetch_one("SELECT file_name FROM log_index WHERE log_id = %s", (log_id,))
		
		if not data or not log_info:
			return jsonify({"error": "Log not found or empty"}), 404
			
		gpx_xml = generate_gpx(log_id, log_info['file_name'], data)
		
		# Return as a downloadable file
		from flask import Response
		return Response(
			gpx_xml,
			mimetype='application/gpx+xml',
			headers={"Content-Disposition": f"attachment;filename=log_{log_id}.gpx"}
		)
	except Exception as e:
		app.logger.error(f"Error exporting GPX for log {log_id}: {e}", exc_info=True)
		return jsonify({"error": "Export failed"}), 500
	finally:
		db_manager.close()

if __name__ == '__main__':
	# Initialize logging immediately on startup
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
	# WATCHDOG: Starting file watcher on directory: /Users/markpotter/zjobd/logs
	app.run(host='0.0.0.0', port=5001, debug=True, use_reloader=False)