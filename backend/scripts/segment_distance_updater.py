import os
import sys
import csv
import re
import logging
import datetime
import math
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
CSV_LOG_DIR = os.path.join(ZJOBD_DIR, 'logs')
PROGRAM_LOG_FILE = os.path.join(LOG_DIR, f'segment_distance_updates_{datetime.datetime.now():%Y%m%d_%H%M%S}.log')

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

def find_header_row(file_path):
    """Finds and returns the row number and headers of the first non-commented line."""
    with open(file_path, 'r', encoding='utf-8-sig', errors='ignore') as f:
        reader = csv.reader(f)
        for i, row in enumerate(reader):
            if row and not row[0].strip().startswith('#'):
                return i, row
    return -1, None

def parse_log_file_distance(file_path):
    """
    Parses a single log file to extract the 'Trip Distance' from the last data row.
    Returns a tuple (distance, error_message) or (None, error_message) on failure.
    """
    try:
        logger.info(f"    Processing file: {os.path.basename(file_path)}")

        # Find the header to get the column index
        header_row_index, headers = find_header_row(file_path)
        if headers is None:
            logger.warning("        Could not find a header row in the file.")
            return None, "Could not find a header row."
        
        # Determine the index of the "Trip Distance (miles)" or "Trip Distance" column
        distance_index = -1
        header_options = ["trip distance (miles)", "trip distance"]
        for header_option in header_options:
            try:
                distance_index = [h.strip().lower() for h in headers].index(header_option)
                logger.info(f"        Found distance column with header: '{headers[distance_index]}'")
                break
            except ValueError:
                continue

        if distance_index == -1:
            logger.warning("        Neither 'Trip Distance (miles)' nor 'Trip Distance' column found in file headers.")
            return None, "Neither 'Trip Distance (miles)' nor 'Trip Distance' column found in file headers."

        # Read all data lines
        with open(file_path, 'r', encoding='utf-8-sig', errors='ignore') as f:
            lines = f.readlines()

        data_lines = [line for line in lines if not line.strip().startswith('#') and line.strip()]
        
        if not data_lines:
            logger.warning("        Could not read any data rows.")
            return None, "Could not read any data rows."

        last_row_data = data_lines[-1]
        reader = csv.reader([last_row_data])
        last_row = next(reader, [])
        
        if len(last_row) > distance_index:
            try:
                # Get the value from the correct column and convert to float
                distance = float(last_row[distance_index])
                logger.info(f"        Found distance value: {distance:.4f}")
                return distance, None
            except (ValueError, IndexError):
                logger.warning(f"        Could not parse distance from last row: '{last_row[distance_index]}'")
                return None, f"Could not parse distance from last row: '{last_row[distance_index]}'"
        else:
            logger.warning("        Last row does not contain enough columns.")
            return None, "Last row does not contain enough columns."

    except FileNotFoundError:
        logger.error(f"        File not found: {file_path}")
        return None, "File not found."
    except Exception as e:
        logger.error(f"        An unexpected error occurred while processing the file: {e}")
        return None, f"An unexpected error occurred: {e}"

def update_segments(dry_run=True):
    """
    Main function to orchestrate the database updates for segment lengths.
    If dry_run is True, it only logs the planned changes.
    """
    logger.info(f"Starting the segment update script. Dry-run mode: {'ON' if dry_run else 'OFF'}.")
    
    conn = get_db_connection()
    if not conn:
        logger.critical("Could not connect to the database. Exiting.")
        return

    cursor = conn.cursor(prepared=True)
    
    # Select all track_segments and join with tracks to get the file name
    select_query = """
        SELECT ts.track_id, t.file_name
        FROM track_segments ts
        JOIN tracks t ON ts.track_id = t.track_id;
    """
    
    total_segments_checked = 0
    distances_found_count = 0
    updated_count = 0
    failed_logs = []

    try:
        cursor.execute(select_query)
        records = cursor.fetchall()
        
        if not records:
            logger.info("No track segments found to process. Exiting.")
            return
            
        total_segments_checked = len(records)
        logger.info(f"Found {total_segments_checked} track segments to process.")
        
        for track_id, file_name in records:
            logger.info(f"    Checking segment for track_id {track_id} linked to file '{file_name}'.")
            csv_path = os.path.join(CSV_LOG_DIR, file_name)
            
            # Extract distance from the CSV
            distance_miles, error_message = parse_log_file_distance(csv_path)
            
            if distance_miles is not None:
                distances_found_count += 1
                
                logger.info(f"        Found distance value: {distance_miles:.4f}")
                
                # The SQL update command and parameters
                update_query = """
                    UPDATE track_segments
                    SET segment_length = %s
                    WHERE track_id = %s;
                """
                params = (distance_miles, track_id)

                if dry_run:
                    logger.info(f"    PREVIEW: SQL command to be executed:")
                    logger.info(f"    PREVIEW: {update_query.strip()}")
                    logger.info(f"    PREVIEW: With parameters: {params}")
                else:
                    logger.info(f"    Updating segment for track_id {track_id}...")
                    try:
                        cursor.execute(update_query, params)
                        conn.commit()
                        logger.info(f"    SUCCESS: track_id {track_id} updated.")
                        updated_count += 1
                    except mysql.connector.Error as err:
                        logger.error(f"    FAILED: Database update for track_id {track_id} failed: {err}")
                        logger.error(f"    SQL Command: {update_query.strip()}")
                        logger.error(f"    Parameters: {params}")
                        conn.rollback()
            else:
                failed_logs.append((file_name, error_message))
                logger.warning(f"    SKIPPING: segment for track_id {track_id} due to file parsing errors.")
                
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
    print(f"{total_segments_checked} segments checked")
    print(f"{distances_found_count} trip distances found to be updated")
    print(f"{len(failed_logs)} log file read errors")

    if failed_logs:
        print("\nDetails of logs with errors:")
        for file, error in failed_logs:
            print(f"  - {file}: {error}")

    if not dry_run:
        print(f"\nSegments successfully updated in the database: {updated_count}")
    else:
        print(f"\nSegments to be updated: {distances_found_count}")
        print("Note: No changes were made in preview mode.")
    print("-" * 30)


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description="Update track segments with trip distance from log CSV files.")
    parser.add_argument('--preview', '-p', action='store_true', help="Preview changes without writing to the database.")
    parser.add_argument('--update', '-u', action='store_true', help="Execute the database update. **DANGEROUS**")
    args = parser.parse_args()

    if args.update and args.preview:
        print("Error: Cannot use both --update and --preview flags. Please choose one.")
        sys.exit(1)
    
    if args.update:
        update_segments(dry_run=False)
    elif args.preview:
        update_segments(dry_run=True)
    else:
        print("No action specified. Use --preview to see changes or --update to apply them.")
        sys.exit(1)
