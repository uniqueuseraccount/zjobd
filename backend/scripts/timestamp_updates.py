import os
import sys
import csv
import re
import logging
import datetime
from decimal import Decimal
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

try:
    # This library is used for robust timezone parsing.
    from dateutil.parser import parse
    from dateutil.tz import gettz
except ImportError:
    print("Error: The 'python-dateutil' library is not installed.")
    print("Please install it by running: pip install python-dateutil")
    sys.exit(1)

# --- Configuration & Paths ---
LOG_DIR = os.path.join(ZJOBD_DIR, 'program_logs')
CSV_LOG_DIR = os.path.join(ZJOBD_DIR, 'logs')
PROGRAM_LOG_FILE = os.path.join(LOG_DIR, f'timestamp_updates_{datetime.datetime.now():%Y%m%d_%H%M%S}.log')

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
        # Use the DB_CONFIG dictionary for connection parameters
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

def parse_log_file(file_path):
    """
    Parses a single log file to extract the start time and duration.
    It first searches for a StartTime comment line, and if not found, it
    falls back to the timestamp in the file name.
    Returns a tuple (start_time_iso, duration_seconds) or (None, None) on failure.
    """
    start_time_str = None
    last_row_time = None
    
    logger.info(f"    Processing file: {os.path.basename(file_path)}")

    try:
        # Using 'utf-8-sig' to handle files with a Byte Order Mark (BOM), and ignoring other errors.
        with open(file_path, 'r', encoding='utf-8-sig', errors='ignore') as f:
            lines = f.readlines()
        
        logger.info(f"        Read {len(lines)} lines from the file.")

        if not lines:
            logger.warning("        File is empty.")
            return None, None

        # First, find the start time in a comment line
        for i, line in enumerate(lines):
            line = line.strip()
            if not line.startswith('#'):
                # We've hit the data rows, so stop searching for comments.
                break
            
            logger.info(f"        Checking comment line {i}: '{line}'")
            match = re.search(r'#\s*StartTime\s*[:=]\s*(.*)', line, re.IGNORECASE)
            if match:
                start_time_str = match.group(1).strip().rstrip(';')
                logger.info(f"        Found StartTime in comment: '{start_time_str}'")
                break
        
        # If start_time was not found in a comment, try the filename as a fallback
        if not start_time_str:
            logger.warning("        Start time comment line not found in file. Attempting to parse from filename...")
            filename_match = re.search(r'CSVLog_(\d{8})_(\d{6}).csv', os.path.basename(file_path))
            if filename_match:
                date_str = filename_match.group(1)
                time_str = filename_match.group(2)
                start_time_str = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]} {time_str[:2]}:{time_str[2:4]}:{time_str[4:]}"
                logger.info(f"        Found StartTime in filename: '{start_time_str}'")

        if not start_time_str:
            logger.warning("        Could not find start time in file or filename.")
            return None, None
        
        # Get the last data row
        data_lines = [line for line in lines if not line.strip().startswith('#')]
        
        if not data_lines:
            logger.warning("        Could not read any data rows.")
            return None, None

        last_row_data = data_lines[-1]
        reader = csv.reader([last_row_data])
        last_row = next(reader, [])
        
        if last_row and len(last_row) > 0:
            try:
                # Convert the first column to Decimal to maintain precision
                last_row_time = Decimal(last_row[0])
            except (ValueError, IndexError):
                logger.warning(f"        Could not parse duration from last row: '{last_row[0]}'")
                return None, None
        else:
            logger.warning("        Last data row is empty.")
            return None, None

        # Assuming the logs are in Central Standard Time (CST/CDT)
        tz_cst = gettz("America/Chicago")
        start_datetime_local = parse(start_time_str).replace(tzinfo=tz_cst)
        
        # Convert local time to UTC and make it timezone-naive for MySQL
        start_datetime_utc = start_datetime_local.astimezone(datetime.timezone.utc)
        
        # Format the timestamp with full microseconds, as the database now supports it.
        start_time_iso = start_datetime_utc.strftime('%Y-%m-%d %H:%M:%S.%f')
        
        return start_time_iso, float(last_row_time)
        
    except FileNotFoundError:
        logger.error(f"        File not found: {file_path}")
        return None, None
    except Exception as e:
        logger.error(f"        An unexpected error occurred while processing the file: {e}")
        return None, None

def update_tracks(dry_run=True):
    """
    Main function to orchestrate the database updates.
    If dry_run is True, it only logs the planned changes.
    """
    logger.info(f"Starting the update script. Dry-run mode: {'ON' if dry_run else 'OFF'}.")
    
    conn = get_db_connection()
    if not conn:
        logger.critical("Could not connect to the database. Exiting.")
        return

    cursor = conn.cursor(prepared=True)
    
    # Select all tracks that have an existing source_log_id
    select_query = """
        SELECT track_id, source_log_id, file_name
        FROM tracks
        WHERE source_log_id IS NOT NULL;
    """
    
    total_tracks_checked = 0
    start_times_found_count = 0
    log_file_read_errors = 0
    updated_count = 0

    try:
        cursor.execute(select_query)
        records = cursor.fetchall()
        
        if not records:
            logger.info("No tracks found with an associated source_log_id. Exiting.")
            return
            
        total_tracks_checked = len(records)
        logger.info(f"Found {total_tracks_checked} tracks to process.")
        
        for track_id, source_log_id, file_name in records:
            logger.info(f"    Checking track record {track_id} from source log {source_log_id}.")
            csv_path = os.path.join(CSV_LOG_DIR, file_name)
            
            # Extract data from the CSV
            start_time_iso, duration_seconds = parse_log_file(csv_path)
            
            if start_time_iso is not None and duration_seconds is not None:
                start_times_found_count += 1
                logger.info(f"        Successfully parsed start time: '{start_time_iso}' and duration: {duration_seconds:.4f}")
                
                # The SQL update command and parameters
                update_query = """
                    UPDATE tracks
                    SET start_time = %s, duration_seconds = %s
                    WHERE track_id = %s;
                """
                params = (start_time_iso, duration_seconds, track_id)

                if dry_run:
                    logger.info(f"    PREVIEW: SQL command to be executed:")
                    logger.info(f"    PREVIEW: {update_query.strip()}")
                    logger.info(f"    PREVIEW: With parameters: {params}")
                else:
                    logger.info(f"    Updating track_id {track_id}...")
                    try:
                        cursor.execute(update_query, params)
                        conn.commit()
                        logger.info(f"    SUCCESS: track_id {track_id} updated.")
                        updated_count += 1
                    except mysql.connector.Error as err:
                        logger.error(f"    FAILED: Database update for track_id {track_id} failed: {err}")
                        logger.error(f"    SQL Command: {update_query.strip()}")
                        logger.error(f"    Parameters: {params}")
                        conn.rollback() # Rollback the last failed transaction
            else:
                log_file_read_errors += 1
                logger.warning(f"    SKIPPING: track_id {track_id} due to file parsing errors.")
                
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
    print(f"{total_tracks_checked} tracks checked")
    print(f"{total_tracks_checked} log files matched to tracks")
    print(f"{start_times_found_count} start times found to update")
    print(f"{start_times_found_count} trip durations checked")
    print(f"{start_times_found_count} trip durations to be updated")
    print(f"{log_file_read_errors} log file read errors")
    if not dry_run:
        print(f"\nTracks successfully updated in the database: {updated_count}")
    print("-" * 30)


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description="Update track timestamps and durations from log CSV files.")
    parser.add_argument('--preview', '-p', action='store_true', help="Preview changes without writing to the database.")
    parser.add_argument('--update', '-u', action='store_true', help="Execute the database update. **DANGEROUS**")
    args = parser.parse_args()

    if args.update and args.preview:
        print("Error: Cannot use both --update and --preview flags. Please choose one.")
        sys.exit(1)
    
    if args.update:
        update_tracks(dry_run=False)
    elif args.preview:
        update_tracks(dry_run=True)
    else:
        print("No action specified. Use --preview to see changes or --update to apply them.")
        sys.exit(1)
