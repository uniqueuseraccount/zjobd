# FILE: log2db/utils.py
#
# Contains utility and helper functions for the application.
#
# --- VERSION 0.8.3 CHANGE ---
# - `parse_start_timestamp` is now much more robust.
#   - It now handles multiple date formats (YYYY-MM-DD and MM/DD/YYYY with AM/PM).
#   - The regex now accepts either ':' or '=' as a separator.
# - All `open()` calls now use `encoding='utf-8-sig'` to automatically handle
#   and strip the UTF-8 Byte Order Mark (BOM) character from the start of files.
# -----------------------------

import logging
import os
import re
from datetime import datetime
import pytz

def setup_logging():
    """Configures the logging for the application."""
    log_dir = 'program_logs'
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    
    log_file_name = datetime.now().strftime("log2db_%Y%m%d_%H%M%S.log")
    log_file_path = os.path.join(log_dir, log_file_name)

    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)-8s - %(message)s',
        handlers=[
            logging.FileHandler(log_file_path),
            logging.StreamHandler()
        ]
    )
    logging.getLogger('mysql.connector').setLevel(logging.WARNING)
    return logging.getLogger(__name__)

def sanitize_column_name(header):
    """Converts a CSV header into a valid SQL column name."""
    s = re.sub(r'[^a-zA-Z0-9_]', '_', header)
    s = s.strip('_')
    if s and s[0].isdigit():
        s = '_' + s
    return s

def infer_mysql_type(value_sample):
    """Infers the MySQL data type from a sample value."""
    if value_sample is None or value_sample.strip() == '':
        return 'VARCHAR(255)'
    try:
        float(value_sample)
        return 'FLOAT'
    except (ValueError, TypeError):
        return 'VARCHAR(255)'

def parse_start_timestamp(file_path):
    """
    Scans the top of a CSV file for a timestamp line and converts it to Unix time.
    This version is robust and handles multiple formats.
    """
    file_name = os.path.basename(file_path)
    logging.info(f"Scanning for timestamp in: {file_name}")
    cst = pytz.timezone('America/Chicago')
    # Flexible regex: matches "StartTime" or "Start Time", case-insensitive, with ':' or '='.
    timestamp_pattern = re.compile(r"#\s*Start\s?Time\s*[:=]\s*(.*)", re.IGNORECASE)
    
    try:
        # Use 'utf-8-sig' to automatically handle the BOM character.
        with open(file_path, 'r', encoding='utf-8-sig', errors='ignore') as f:
            for i, line in enumerate(f):
                if i < 5:
                    logging.info(f"  > Scanning line {i+1}: '{line.strip()}'")
                
                match = timestamp_pattern.search(line)
                if match:
                    timestamp_str = match.group(1).strip()
                    logging.info(f"  SUCCESS: Found raw timestamp string: '{timestamp_str}'")
                    
                    # List of possible formats to try parsing.
                    possible_formats = [
                        "%m/%d/%Y %I:%M:%S.%f %p",  # MM/DD/YYYY HH:MM:SS.ms AM/PM
                        "%m/%d/%Y %I:%M:%S %p",     # MM/DD/YYYY HH:MM:SS AM/PM
                        "%Y-%m-%d %H:%M:%S",       # YYYY-MM-DD HH:MM:SS (24-hour)
                    ]
                    
                    local_dt = None
                    for dt_format in possible_formats:
                        try:
                            local_dt = datetime.strptime(timestamp_str, dt_format)
                            logging.info(f"    > Matched format: '{dt_format}'")
                            break  # Success, exit the format-trying loop
                        except ValueError:
                            continue # Failed, try the next format
                    
                    if local_dt is None:
                        logging.error(f"    > FAILED: Could not parse '{timestamp_str}' with any known format.")
                        return None

                    cst_dt = cst.localize(local_dt)
                    unix_timestamp = int(cst_dt.timestamp())
                    logging.info(f"  > Converted to Unix timestamp (UTC): {unix_timestamp}")
                    return unix_timestamp
                
                if line.strip() and not line.strip().startswith('#'):
                    logging.warning(f"  STOP: Reached non-comment line without finding timestamp.")
                    break
    except Exception as e:
        logging.error(f"  ERROR: An exception occurred while reading {file_path}: {e}")
        
    return None
