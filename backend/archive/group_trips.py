# FILE: backend/group_trips.py
#
# --- VERSION 1.9.7-ALPHA ---
# - This is the complete, corrected, and fully implemented file.
# - It uses the optimized `get_first/last_valid_coord` methods from the
#   db_manager to ensure high performance.
# - It correctly uses `INSERT ... ON DUPLICATE KEY UPDATE` to be safely
#   re-runnable.
# -----------------------------

import logging
import sys
import hashlib
from math import radians, cos, sin, asin, sqrt

sys.path.append('..')

from config.db_credentials import DB_CONFIG
from log2db.db_manager import DatabaseManager
from log2db.utils import setup_logging

def haversine(lon1, lat1, lon2, lat2):
	try:
		lon1, lat1, lon2, lat2 = map(radians, [float(lon1), float(lat1), float(lon2), float(lat2)])
		dlon = lon2 - lon1 
		dlat = lat2 - lat1 
		a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
		c = 2 * asin(sqrt(a)) 
		r_miles = 3956
		return c * r_miles
	except (ValueError, TypeError):
		return 0.0

def generate_group_id(lat1, lon1, lat2, lon2, sensitivity=3):
	if any(v is None for v in [lat1, lon1, lat2, lon2]): return None
	try:
		p1 = (round(float(lat1), sensitivity), round(float(lon1), sensitivity))
		p2 = (round(float(lat2), sensitivity), round(float(lon2), sensitivity))
		sorted_points = sorted([p1, p2])
		s = f"{sorted_points[0][0]}:{sorted_points[0][1]}|{sorted_points[1][0]}:{sorted_points[1][1]}"
		return hashlib.sha256(s.encode()).hexdigest()
	except (ValueError, TypeError):
		return None

def group_trips_logic(preview_mode=False, sensitivity=3):
	logger = logging.getLogger(__name__)
	db_manager = None
	try:
		db_manager = DatabaseManager(DB_CONFIG)
		all_logs = db_manager.get_all_logs()
		if not all_logs:
			logger.info("No logs found to process.")
			return {} if preview_mode else None

		all_cols = db_manager.get_all_defined_columns()
		lat_pid_info = next((info for name, info in all_cols.items() if 'latitude' in name), None)
		lon_pid_info = next((info for name, info in all_cols.items() if 'longitude' in name), None)

		if not lat_pid_info or not lon_pid_info:
			logger.error("Could not find latitude/longitude PIDs.")
			return {} if preview_mode else None
		
		lat_pid = lat_pid_info['sanitized_name']
		lon_pid = lon_pid_info['sanitized_name']
		
		updates = []
		groups_preview = {}

		for log in all_logs:
			log_id = log['log_id']
			start_coords = db_manager.get_first_valid_coord(log_id, lat_pid, lon_pid)
			end_coords = db_manager.get_last_valid_coord(log_id, lat_pid, lon_pid)

			if not start_coords or not end_coords: continue
			
			start_lat, start_lon = start_coords[lat_pid], start_coords[lon_pid]
			end_lat, end_lon = end_coords[lat_pid], end_coords[lon_pid]

			group_id = generate_group_id(start_lat, start_lon, end_lat, end_lon, sensitivity)
			distance = haversine(start_lon, start_lat, end_lon, end_lat)

			if preview_mode:
				if group_id:
					if group_id not in groups_preview:
						groups_preview[group_id] = []
					groups_preview[group_id].append(log_id)
			else:
				updates.append((log_id, start_lat, start_lon, end_lat, end_lon, group_id, distance))

		if preview_mode:
			return groups_preview

		if updates:
			cursor = db_manager.connection.cursor()
			query = "INSERT INTO trips (log_id, start_lat, start_lon, end_lat, end_lon, trip_group_id, distance_miles) VALUES (%s, %s, %s, %s, %s, %s, %s) ON DUPLICATE KEY UPDATE start_lat=VALUES(start_lat), start_lon=VALUES(start_lon), end_lat=VALUES(end_lat), end_lon=VALUES(end_lon), trip_group_id=VALUES(trip_group_id), distance_miles=VALUES(distance_miles)"
			cursor.executemany(query, updates)
			db_manager.connection.commit()
			logger.info(f"Successfully inserted/updated trip data for {len(updates)} logs. Rows affected: {cursor.rowcount}")
			cursor.close()
	finally:
		if db_manager:
			db_manager.close()

def main():
	setup_logging()
	logger = logging.getLogger(__name__)
	logger.info("--- Starting Trip Grouping Process (v1.9.7-ALPHA) ---")
	group_trips_logic()
	logger.info("--- Trip Grouping Process Finished ---")

if __name__ == "__main__":
	main()