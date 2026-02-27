
import logging
import sys
import os
import time

# Ensure project root is on PYTHONPATH
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, '..', '..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from config.db_credentials import DB_CONFIG
from log2db.db_manager import DatabaseManager
from services.map_matching_service import MapMatchingService
from log2db.utils import setup_logging

def process_map_matching_batch():
    logger = setup_logging()
    logger.info("Starting Map Matching Batch Process...")
    
    db = DatabaseManager(DB_CONFIG)
    matcher = MapMatchingService()
    
    try:
        # 0. Truncate table for fresh start
        logger.info("Truncating matched_segments table...")
        db.execute_query("TRUNCATE TABLE matched_segments")

        # 1. Fetch all log IDs
        query = """
            SELECT li.log_id, li.file_name 
            FROM log_index li
            ORDER BY li.log_id DESC
        """
        logs_to_process = db.fetch_all(query)
        
        logger.info(f"Found {len(logs_to_process)} logs pending map matching.")
        
        success_count = 0
        error_count = 0
        
        for i, log in enumerate(logs_to_process):
            log_id = log['log_id']
            file_name = log['file_name']
            
            logger.info(f"Processing log {i+1}/{len(logs_to_process)}: {file_name} (ID: {log_id})")
            
            try:
                # 2. Fetch GPS data for this log
                # We need columns: latitude, longitude, row_time
                # Assuming sanitized names 'latitude' and 'longitude' exist
                # If they are different (e.g. GPS Latitude), we rely on db_manager to handle it or we query generically
                # Let's rely on get_data_for_log but only ask for lat/lon
                
                # Check for lat/lon column existence first? 
                # get_data_for_log handles logic
                data_rows, _, _, normalized_names = db.get_data_for_log(log_id, pids_to_fetch=['latitude', 'longitude'])
                
                # Filter for valid GPS points
                gps_points = []
                for row in data_rows:
                    lat = row.get('latitude') or row.get('gps_latitude') # Try generic variants
                    lon = row.get('longitude') or row.get('gps_longitude')
                    
                    if lat and lon and float(lat) != 0 and float(lon) != 0:
                        gps_points.append({
                            'lat': float(lat),
                            'lon': float(lon),
                            'time': row['row_time'], # datetime object
                            'idx': row['data_id'] # Use primary key or index? Service expects index in array.
                        })
                
                if not gps_points:
                    logger.warning(f"No valid GPS points found for log {log_id}. Skipping.")
                    continue
                
                # 3. Send to OSRM
                # The service expects list of dicts with 'lat', 'lon'
                matched_segments = matcher.match_trace(gps_points)
                
                if not matched_segments:
                    logger.warning(f"OSRM returned no matches for log {log_id}.")
                    continue
                
                # 4. Insert results into matched_segments
                insert_query = """
                    INSERT INTO matched_segments 
                    (log_id, osm_way_id, osm_name, start_idx, end_idx, distance_meters, duration_seconds, geometry)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """
                
                cursor = db.connection.cursor()
                for seg in matched_segments:
                    cursor.execute(insert_query, (
                        log_id,
                        seg['osm_way_id'],
                        seg['name'],
                        seg['start_idx'],
                        seg['end_idx'],
                        seg['distance'],
                        seg['duration'],
                        seg.get('geometry')
                    ))
                db.connection.commit()
                cursor.close()
                
                success_count += 1
                logger.info(f"Successfully matched log {log_id}: {len(matched_segments)} segments.")
                
            except Exception as e:
                logger.error(f"Error processing log {log_id}: {e}")
                error_count += 1
                
            # Optional sleep to be nice to the local server? OSRM is fast, probably not needed.
            # time.sleep(0.1) 
            
        logger.info(f"Batch processing complete. Success: {success_count}, Errors: {error_count}")
        
    except Exception as e:
        logger.critical(f"Critical failure in batch script: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    process_map_matching_batch()
