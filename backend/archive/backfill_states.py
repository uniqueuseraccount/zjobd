# FILE: backend/backfill_states.py
#
# --- VERSION 1.3.0 ---
# - No functional changes are needed in this script. It is designed to work
#   with the updated `state_detector` and `db_manager` modules.
# - Running this script will erase the old, simple operating states from your
#   database and replace them with the new, more intelligent classifications.
# -----------------------------

import logging
import sys

# Add the parent directory to the path to allow sibling imports
sys.path.append('..')

from config.db_credentials import DB_CONFIG
from log2db.db_manager import DatabaseManager
from log2db.state_detector import classify_operating_states
from log2db.utils import setup_logging

def backfill():
	"""
	One-time script to iterate through all existing log data,
	classify operating states, and update the database.
	"""
	logger = setup_logging()
	logger.info("--- Starting Backfill Process for Operating States ---")

	db_manager = None
	try:
		db_manager = DatabaseManager(DB_CONFIG)
		
		db_manager.ensure_base_tables_exist()

		all_logs = db_manager.get_all_logs()
		if not all_logs:
			logger.info("No logs found in the database. Exiting.")
			return

		total_logs = len(all_logs)
		logger.info(f"Found {total_logs} logs to process.")

		for i, log in enumerate(all_logs):
			log_id = log['log_id']
			logger.info(f"Processing log {i+1}/{total_logs} (ID: {log_id})...")

			try:
				data_rows, pids, _ = db_manager.get_data_for_log(log_id) # We don't need stats here
				if not data_rows:
					logger.warning(f"  Log ID {log_id} has no data rows. Skipping.")
					continue

				classified_rows = classify_operating_states(data_rows, pids)

				updates = []
				for row in classified_rows:
					if 'data_id' not in row:
						logger.error(f"  Row in log {log_id} is missing 'data_id'. Cannot update.")
						continue
					updates.append((row['operating_state'], row['data_id']))

				if not updates:
					logger.warning(f"  No rows to update for log ID {log_id}.")
					continue

				cursor = db_manager.connection.cursor()
				update_query = "UPDATE log_data SET operating_state = %s WHERE data_id = %s"
				cursor.executemany(update_query, updates)
				db_manager.connection.commit()
				logger.info(f"  Successfully updated {cursor.rowcount} rows for log ID {log_id}.")
				cursor.close()

			except Exception as e:
				logger.error(f"  An error occurred processing log ID {log_id}: {e}", exc_info=True)

	except Exception as e:
		logger.critical(f"A critical error occurred during the backfill process: {e}", exc_info=True)
	finally:
		if db_manager:
			db_manager.close()
		logger.info("--- Backfill Process Finished ---")

if __name__ == "__main__":
	backfill()