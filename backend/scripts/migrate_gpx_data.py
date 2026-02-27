# File: backend/scripts/migrate_gpx_data.py
# Version: 0.1.0.1
# Commit: seed waypoints, tracks, one segment per track
# Fixing LLM mistakes

import os
import sys

# --------------------------------------------------------------------
# Ensure project root is on PYTHONPATH so that `backend.config` imports
# resolve correctly when run from repo root.
# --------------------------------------------------------------------
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, '..', '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import logging
import mysql.connector
from config.db_credentials import DB_CONFIG

def main():
    # Setup program_logs directory
    log_dir = os.path.join(PROJECT_ROOT, 'program_logs')
    os.makedirs(log_dir, exist_ok=True)
    log_file = os.path.join(log_dir, 'migrate_gpx_data.log')
    logging.basicConfig(
        filename=log_file,
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )
    logger = logging.getLogger(__name__)
    logger.info("=== Starting GPX data migration ===")

    # pdb.set_trace()
    conn = mysql.connector.connect(**DB_CONFIG)
    cur = conn.cursor(dictionary=True)

    # 0) Clear existing data to fix broken IDs
    logger.info("Clearing existing GPX tables...")
    cur.execute("SET FOREIGN_KEY_CHECKS = 0")
    for tbl in ('track_segments', 'tracks', 'waypoints'):
        cur.execute(f"TRUNCATE TABLE {tbl}")
    cur.execute("SET FOREIGN_KEY_CHECKS = 1")

    # 1) Seed waypoints from existing trips table
    logger.info("Inserting start/end waypoints from trips.")
    wayp_insert = """
      INSERT INTO waypoints (latitude, longitude, name)
      SELECT DISTINCT start_lat, start_lon, 'start'
      FROM trips
      WHERE start_lat IS NOT NULL
      ON DUPLICATE KEY UPDATE latitude=VALUES(latitude);
    """
    cur.execute(wayp_insert)

    wayp_insert_end = """
      INSERT INTO waypoints (latitude, longitude, name)
      SELECT DISTINCT end_lat, end_lon, 'end'
      FROM trips
      WHERE end_lat IS NOT NULL
      ON DUPLICATE KEY UPDATE latitude=VALUES(latitude);
    """
    cur.execute(wayp_insert_end)

    # 2) Populate tracks
    logger.info("Populating tracks table from log_index.")
    track_insert = """
      INSERT INTO tracks (source_log_id, file_name, start_time, duration_seconds, column_ids_json)
      SELECT li.log_id,
             li.file_name,
             li.start_time,
             li.trip_duration_seconds,
             li.column_ids_json
      FROM log_index li
      ON DUPLICATE KEY UPDATE file_name=VALUES(file_name);
    """
    cur.execute(track_insert)

    # 3) Link start/end waypoints back into tracks
    logger.info("Updating tracks with waypoint IDs.")
    update_tracks = """
      UPDATE tracks t
      JOIN trips tr ON tr.log_id = t.source_log_id
      JOIN waypoints ws ON ws.latitude=tr.start_lat AND ws.longitude=tr.start_lon
      JOIN waypoints we ON we.latitude=tr.end_lat   AND we.longitude=tr.end_lon
      SET t.start_waypoint_id = ws.waypoint_id,
          t.end_waypoint_id   = we.waypoint_id;
    """
    cur.execute(update_tracks)

    # 4) One default segment per track
    logger.info("Seeding one default track_segment per track.")
    seg_insert = """
      INSERT INTO track_segments (track_id, segment_index, start_waypoint_id, end_waypoint_id, segment_length, segment_duration_seconds)
      SELECT t.track_id, 1, t.start_waypoint_id, t.end_waypoint_id, tr.distance_miles, t.duration_seconds
      FROM tracks t
      JOIN trips tr ON tr.log_id = t.source_log_id
      ON DUPLICATE KEY UPDATE start_waypoint_id=VALUES(start_waypoint_id);
    """
    cur.execute(seg_insert)

    conn.commit()
    cur.close()
    conn.close()
    logger.info("GPX data migration complete.")

if __name__ == "__main__":
    main()
