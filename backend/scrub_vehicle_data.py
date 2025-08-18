# FILE: backend/scrub_vehicle_data.py
#
# --- VERSION 1.6.1 ---
# - FIXED: A NameError caused by attempting to use the `json` module
#   without importing it first. Added `import json`.
# -----------------------------

import logging
import sys
import json # <-- FIX: Added missing import

sys.path.append('..')

from db_credentials import DB_CONFIG
from log2db.db_manager import DatabaseManager
from log2db.utils import setup_logging

# --- CONFIGURATION ---
# Add the exact, normalized (lowercase, no units) names of PIDs that are
# unique to the vehicles you want to REMOVE.
# For your XJ/WJ, this would include the Bank 2 sensors.
MARKER_PIDS = [
	'seconds idling',
]
# ---------------------

def scrub_data():
	logger = setup_logging()
	logger.info("--- Starting Vehicle Data Scrubbing Process ---")
	logger.warning("This is a destructive operation. Please back up your database first.")
	
	# Confirm with the user before proceeding
	confirm = input(f"This will delete all logs containing {len(MARKER_PIDS)} marker PIDs. Are you sure? (yes/no): ").lower()
	if confirm != 'yes':
		logger.info("Operation cancelled by user.")
		return

	db_manager = None
	try:
		db_manager = DatabaseManager(DB_CONFIG)

		# 1. Find all column_ids for our marker PIDs
		format_strings = ','.join(['%s'] * len(MARKER_PIDS))
		query = f"SELECT column_id FROM column_definitions WHERE column_name IN ({format_strings})"
		marker_col_ids = [row['column_id'] for row in db_manager.fetch_all(query, tuple(MARKER_PIDS))]
		
		if not marker_col_ids:
			logger.info("No column definitions found for the specified marker PIDs. Nothing to scrub.")
			return

		logger.info(f"Found {len(marker_col_ids)} column definitions matching marker PIDs.")

		# 2. Find all log_ids that contain any of these column_ids
		log_ids_to_delete = set()
		all_logs = db_manager.fetch_all("SELECT log_id, column_ids_json FROM log_index")
		for log in all_logs:
			log_col_ids = json.loads(log['column_ids_json'] or '[]')
			if any(cid in marker_col_ids for cid in log_col_ids):
				log_ids_to_delete.add(log['log_id'])

		if not log_ids_to_delete:
			logger.info("No logs found containing the marker PIDs. Nothing to delete.")
			return

		logger.warning(f"Identified {len(log_ids_to_delete)} logs to be permanently deleted.")
		log_id_list = list(log_ids_to_delete)
		format_strings = ','.join(['%s'] * len(log_id_list))

		# 3. Perform cascading deletes in the correct order
		logger.info("Deleting associated trips...")
		db_manager.execute_query(f"DELETE FROM trips WHERE log_id IN ({format_strings})", tuple(log_id_list))
		
		logger.info("Deleting associated log data rows...")
		db_manager.execute_query(f"DELETE FROM log_data WHERE log_id IN ({format_strings})", tuple(log_id_list))

		logger.info("Deleting log index entries...")
		db_manager.execute_query(f"DELETE FROM log_index WHERE log_id IN ({format_strings})", tuple(log_id_list))
		
		logger.info("Deletion complete.")

		# 4. Clean up orphaned column definitions
		logger.info("Scanning for and cleaning up orphaned column definitions...")
		all_cols = db_manager.fetch_all("SELECT column_id FROM column_definitions")
		all_col_ids = {row['column_id'] for row in all_cols}

		remaining_logs = db_manager.fetch_all("SELECT column_ids_json FROM log_index")
		used_col_ids = set()
		for log in remaining_logs:
			used_col_ids.update(json.loads(log['column_ids_json'] or '[]'))
		
		orphaned_ids = list(all_col_ids - used_col_ids)
		if orphaned_ids:
			logger.info(f"Found {len(orphaned_ids)} orphaned column definitions to remove.")
			format_strings = ','.join(['%s'] * len(orphaned_ids))
			db_manager.execute_query(f"DELETE FROM column_definitions WHERE column_id IN ({format_strings})", tuple(orphaned_ids))
		else:
			logger.info("No orphaned column definitions found.")

	except Exception as e:
		logger.critical(f"A critical error occurred during the scrubbing process: {e}", exc_info=True)
	finally:
		if db_manager:
			db_manager.close()
		logger.info("--- Vehicle Data Scrubbing Finished ---")

if __name__ == "__main__":
	scrub_data()