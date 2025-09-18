# File: backend/scripts/create_gpx_tables.py
# Version: 0.1.0.0
# Commit: create waypoints, tracks, track_segments tables

import os, sys
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if PROJECT_ROOT not in sys.path: sys.path.insert(0, PROJECT_ROOT)
import logging
import mysql.connector
from backend.config.db_credentials import DB_CONFIG

# Setup logging
log_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'program_logs'))
os.makedirs(log_dir, exist_ok=True)
logging.basicConfig(
    filename=os.path.join(log_dir, 'create_gpx_tables.log'),
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    # pdb.set_trace()  # breakpoint
    logger.info("Starting GPX tables creation script.")
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()

    # Drop if exists for idempotency
    for tbl in ('track_segments', 'tracks', 'waypoints'):
        logger.info(f"Dropping table if exists: {tbl}")
        cursor.execute(f"DROP TABLE IF EXISTS {tbl};")

    # Create tables
    with open(os.path.abspath(__file__).replace('.py', '.sql'), 'r') as f:
        sql = f.read().strip().split(';')
    for stmt in sql:
        if stmt.strip():
            logger.info(f"Executing SQL: {stmt[:60]}...")
            cursor.execute(stmt + ';')

    conn.commit()
    cursor.close()
    conn.close()
    logger.info("GPX tables creation complete.")

if __name__ == "__main__":
    main()
