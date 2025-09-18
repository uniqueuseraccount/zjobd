# File: backend/scripts/migrate_gpx_data.py
# Version: 0.1.0.0
# Commit: seed waypoints, tracks, one segment per track

import os
import logging
import mysql.connector
from config.db_credentials import DB_CONFIG

# Setup logging
log_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'program_logs'))
os.makedirs(log_dir, exist_ok=True)
logging.basicConfig(
    filename=os.path.join(log_dir, 'migrate_gpx_data.log'),
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    # pdb.set_trace()
    logger.info("Starting GPX data migration.")
    conn = mysql.connector.connect(**DB_CONFIG)
    cur = conn.cursor(dictionary=True)

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
             FROM_UNIXTIME(li.start_timestamp),
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
      INSERT INTO track_segments (track_id, segment_index, start_waypoint_id, end_waypoint_id)
      SELECT t.track_id, 1, t.start_waypoint_id, t.end_waypoint_id
      FROM tracks t
      ON DUPLICATE KEY UPDATE start_waypoint_id=VALUES(start_waypoint_id);
    """
    cur.execute(seg_insert)

    conn.commit()
    cur.close()
    conn.close()
    logger.info("GPX data migration complete.")

if __name__ == "__main__":
    main()
