import os
import sys
import logging
import datetime
import mysql.connector
from mysql.connector import errorcode

# Add the 'backend' directory to the Python path to allow importing config files
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
ZJOBD_DIR = os.path.dirname(BACKEND_DIR)
sys.path.append(os.path.join(BACKEND_DIR, 'config'))

try:
    import db_credentials
except ImportError:
    print("Error: db_credentials.py not found in the config directory.")
    print("Please create this file with your database connection details.")
    sys.exit(1)

# --- Configuration & Paths ---
LOG_DIR = os.path.join(ZJOBD_DIR, 'program_logs')
PROGRAM_LOG_FILE = os.path.join(LOG_DIR, f'end_time_updates_{datetime.datetime.now():%Y%m%d_%H%M%S}.log')

# Ensure the log directory exists
os.makedirs(LOG_DIR, exist_ok=True)

# --- Logging Setup ---
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Create file handler which logs even debug messages
fh = logging.FileHandler(PROGRAM_LOG_FILE)
fh.setLevel(logging.INFO)

# Create console handler with a higher log level
ch = logging.StreamHandler()
ch.setLevel(logging.INFO)

# Create a formatter and add it to the handlers
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
fh.setFormatter(formatter)
ch.setFormatter(formatter)

# Add the handlers to the logger
logger.addHandler(fh)
logger.addHandler(ch)

def get_db_connection():
    """Establishes a connection to the MySQL database."""
    try:
        conn = mysql.connector.connect(
            user=db_credentials.DB_CONFIG['user'],
            password=db_credentials.DB_CONFIG['password'],
            host=db_credentials.DB_CONFIG['host'],
            database=db_credentials.DB_CONFIG['database'],
            auth_plugin='mysql_native_password'
        )
        return conn
    except mysql.connector.Error as err:
        if err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
            logger.error("Database connection error: Something is wrong with your user name or password")
        elif err.errno == errorcode.ER_BAD_DB_ERROR:
            logger.error(f"Database connection error: Database {db_credentials.DB_CONFIG['database']} does not exist")
        else:
            logger.error(f"Database connection error: {err}")
        return None

def update_end_times(dry_run=True):
    """
    Main function to orchestrate the database updates for track end times.
    If dry_run is True, it only logs the planned changes.
    """
    logger.info(f"Starting the end time update script. Dry-run mode: {'ON' if dry_run else 'OFF'}.")

    conn = get_db_connection()
    if not conn:
        logger.critical("Could not connect to the database. Exiting.")
        return

    cursor = conn.cursor(prepared=True)

    # Select tracks that have start_time and duration_seconds
    select_query = """
        SELECT track_id, start_time, duration_seconds
        FROM tracks
        WHERE start_time IS NOT NULL AND duration_seconds IS NOT NULL;
    """

    total_tracks_checked = 0
    end_times_calculated = 0
    updated_count = 0
    skipped_tracks = []

    try:
        cursor.execute(select_query)
        records = cursor.fetchall()

        if not records:
            logger.info("No tracks found with both start_time and duration_seconds. Exiting.")
            return

        total_tracks_checked = len(records)
        logger.info(f"Found {total_tracks_checked} tracks with both start time and duration to process.")

        for track_id, start_time, duration_seconds in records:
            logger.info(f"    Processing track ID {track_id}...")

            try:
                # Add duration to start_time to get end_time
                end_time = start_time + datetime.timedelta(seconds=duration_seconds)
                end_times_calculated += 1

                logger.info(f"        Calculated end_time: {end_time}")

                # The SQL update command and parameters
                update_query = """
                    UPDATE tracks
                    SET end_time = %s
                    WHERE track_id = %s;
                """
                params = (end_time, track_id)

                if dry_run:
                    logger.info(f"    PREVIEW: SQL command to be executed:")
                    logger.info(f"    PREVIEW: {update_query.strip()}")
                    logger.info(f"    PREVIEW: With parameters: {params}")
                else:
                    logger.info(f"    Updating end_time for track ID {track_id}...")
                    try:
                        cursor.execute(update_query, params)
                        conn.commit()
                        logger.info(f"    SUCCESS: track ID {track_id} updated.")
                        updated_count += 1
                    except mysql.connector.Error as err:
                        logger.error(f"    FAILED: Database update for track ID {track_id} failed: {err}")
                        logger.error(f"    SQL Command: {update_query.strip()}")
                        logger.error(f"    Parameters: {params}")
                        conn.rollback()

            except (TypeError, ValueError) as e:
                logger.warning(f"    SKIPPING: track ID {track_id} due to invalid data types: {e}")
                skipped_tracks.append(track_id)

    except mysql.connector.Error as err:
        logger.error(f"Error executing database query: {err}")
    finally:
        cursor.close()
        conn.close()
        logger.info("Database connection closed.")
        logger.info("Script execution finished.")

    # Print summary after the run is complete, regardless of flags.
    print("-" * 30)
    print(f"Update Summary ({'Preview' if dry_run else 'Update'} Mode)")
    print("-" * 30)
    print(f"Total tracks checked: {total_tracks_checked}")
    print(f"End times calculated: {end_times_calculated}")
    print(f"Tracks skipped due to missing/invalid data: {len(skipped_tracks)}")

    if not dry_run:
        print(f"\nTracks successfully updated in the database: {updated_count}")
    else:
        print(f"\nTracks to be updated: {end_times_calculated}")
        print("Note: No changes were made in preview mode.")
    print("-" * 30)


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description="Calculate and update end_time for tracks based on start_time and duration_seconds.")
    parser.add_argument('--preview', '-p', action='store_true', help="Preview changes without writing to the database.")
    parser.add_argument('--update', '-u', action='store_true', help="Execute the database update. **DANGEROUS**")
    args = parser.parse_args()

    if args.update and args.preview:
        print("Error: Cannot use both --update and --preview flags. Please choose one.")
        sys.exit(1)

    if args.update:
        update_end_times(dry_run=False)
    elif args.preview:
        update_end_times(dry_run=True)
    else:
        print("No action specified. Use --preview to see changes or --update to apply them.")
        sys.exit(1)
