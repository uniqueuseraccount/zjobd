# File: backend/scripts/create_gpx_tables.py
# Version: 0.1.0.0
# Commit: create waypoints, tracks, track_segments tables

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
from backend.config.db_credentials import DB_CONFIG

def main():
    # Setup program_logs directory
    log_dir = os.path.join(PROJECT_ROOT, 'program_logs')
    os.makedirs(log_dir, exist_ok=True)
    log_file = os.path.join(log_dir, 'create_gpx_tables.log')
    logging.basicConfig(
        filename=log_file,
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )
    logger = logging.getLogger(__name__)
    logger.info("=== Starting GPX tables creation script ===")

    # Connect to database
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()

    # 1) Drop existing tables for idempotency
    for tbl in ('track_segments', 'tracks', 'waypoints'):
        logger.info(f"Dropping table if exists: {tbl}")
        cursor.execute(f"DROP TABLE IF EXISTS {tbl};")

    # 2) Locate and read SQL file
    sql_file = os.path.join(
        PROJECT_ROOT,
        'backend',
        'migrations',
        '2025_09_add_migrations_tables.sql'
    )
    if not os.path.isfile(sql_file):
        logger.critical(f"SQL file not found: {sql_file}")
        sys.exit(1)

    with open(sql_file, 'r') as f:
        raw = f.read()
    # Split on semicolon—each fragment is one statement
    statements = [s.strip() for s in raw.split(';') if s.strip()]

    # 3) Execute each CREATE TABLE statement
    for stmt in statements:
        logger.info(f"Executing SQL: {stmt[:60]}...")
        cursor.execute(stmt + ';')

    conn.commit()
    cursor.close()
    conn.close()
    logger.info("=== GPX tables creation complete ===")

if __name__ == '__main__':
    main()
