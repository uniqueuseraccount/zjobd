# FILE: backend/backfill_trips.py
#
# --- VERSION 1.4.0 ---
# - This is a new, one-time utility script to populate the new `trips` table.
# - It iterates through all logs, finds the first and last GPS coordinates,
#   and creates a corresponding entry in the `trips` table.
# -----------------------------

import logging
import sys

sys.path.append('..')

from db_credentials import DB_CONFIG
from log2db.db_manager import DatabaseManager
from log2db.utils import setup_logging

def backfill():
	logger = setup_logging()
	logger.info("--- Starting Backfill Process for Trips Table ---")

	db_manager = None
	try:
		db_manager = DatabaseManager(DB_CONFIG)
		db_manager.ensure_base_tables_exist()

		all_logs = db_manager.get_all_logs()
		if not all_logs:
			logger.info("No logs found to process. Exiting.")
			return

		total_logs = len(all_logs)
		logger.info(f"Found {total_logs} logs to process for the trips table.")

		for i, log in enumerate(all_logs):
			log_id = log['log_id']
			
			# Check if a trip entry already exists for this log_id
			existing_trip = db_manager.fetch_one("SELECT trip_id FROM trips WHERE log_id = %s", (log_id,))
			if existing_trip:
				logger.info(f"Log {i+1}/{total_logs} (ID: {log_id}) already has a trip entry. Skipping.")
				continue

			logger.info(f"Processing log {i+1}/{total_logs} (ID: {log_id})...")

			try:
				data_rows, pids, _ = db_manager.get_data_for_log(log_id)
				if not data_rows:
					logger.warning(f"  Log ID {log_id} has no data. Creating trip entry with NULL coordinates.")
					db_manager.execute_query("INSERT INTO trips (log_id) VALUES (%s)", (log_id,))
					continue

				lat_pid = next((p for p in pids if 'latitude' in p), None)
				lon_pid = next((p for p in pids if 'longitude' in p), None)

				if not lat_pid or not lon_pid:
					logger.warning(f"  Log ID {log_id} is missing GPS PIDs. Creating trip entry with NULL coordinates.")
					db_manager.execute_query("INSERT INTO trips (log_id) VALUES (%s)", (log_id,))
					continue

				start_lat = data_rows[0].get(lat_pid)
				start_lon = data_rows[0].get(lon_pid)
				end_lat = data_rows[-1].get(lat_pid)
				end_lon = data_rows[-1].get(lon_pid)

				insert_query = """
				INSERT INTO trips (log_id, start_lat, start_lon, end_lat, end_lon)
				VALUES (%s, %s, %s, %s, %s)
				"""
				params = (log_id, start_lat, start_lon, end_lat, end_lon)
				if db_manager.execute_query(insert_query, params):
					logger.info(f"  Successfully created trip entry for log ID {log_id}.")

			except Exception as e:
				logger.error(f"  An error occurred processing log ID {log_id}: {e}", exc_info=True)

	except Exception as e:
		logger.critical(f"A critical error occurred during the backfill process: {e}", exc_info=True)
	finally:
		if db_manager:
			db_manager.close()
		logger.info("--- Trips Backfill Process Finished ---")

if __name__ == "__main__":
	backfill()