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
    """Configures the logging for the application, ensuring logs are in the project root."""
    # Absolute path to the project root program_logs
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    log_dir = os.path.join(base_dir, 'program_logs')
    
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
    """Converts a CSV header into a valid SQL column name with a 64-char limit."""
    s = re.sub(r'[^a-zA-Z0-9_]', '_', header)
    s = s.strip('_')
    if s and s[0].isdigit():
        s = '_' + s
    
    # MySQL limit is 64 chars
    if len(s) > 64:
        # Use a hash or just truncate. Truncate is simpler for human readability.
        s = s[:64].strip('_')
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
                        "%m/%d/%Y %I:%M:%S.%f %p",  # MM/DD/YYYY HH:MM:SS.SSSS AM/PM (New 2026 format)
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
                    logging.info(f"  > Parsed as CST datetime: {cst_dt}")
                    return cst_dt
                
                # If we hit a line that isn't a comment...
                if line.strip() and not line.strip().startswith('#'):
                    # Only stop searching if it looks like the actual CSV header (contains a comma)
                    # This allows us to skip non-commented instructions/notes at the top.
                    if ',' in line:
                        logging.info(f"  INFO: Reached CSV header line. Checking first data row for timestamp before fallback.")
                        
                        # Try to read the NEXT line for a timestamp
                        try:
                            next_line = next(f, None)
                            if next_line:
                                first_col = next_line.split(',')[0].strip()
                                logging.info(f"  > Checking first data row, first column: '{first_col}'")
                                
                                data_formats = [
                                    "%m/%d/%Y %I:%M:%S.%f %p",
                                    "%m/%d/%Y %I:%M:%S %p",
                                    "%Y-%m-%d %H:%M:%S",
                                ]
                                
                                for fmt in data_formats:
                                    try:
                                        local_dt = datetime.strptime(first_col, fmt)
                                        cst_dt = cst.localize(local_dt)
                                        logging.info(f"  SUCCESS: Extracted start time from first data row: {cst_dt}")
                                        return cst_dt
                                    except ValueError:
                                        continue
                        except Exception as e:
                            logging.warning(f"  > Failed to peek at first data row: {e}")
                        
                        logging.info(f"  INFO: No timestamp in first data row. Trying filename fallback.")
                        break
    except Exception as e:
        logging.error(f"  ERROR: An exception occurred while reading {file_path}: {e}")
    
    # --- Filename Fallback ---
    # Pattern 1: CSVLog_20220907_213158.csv
    filename_match1 = re.search(r"CSVLog_(\d{8})_(\d{6})", file_name)
    if filename_match1:
        date_str = filename_match1.group(1)
        time_str = filename_match1.group(2)
        try:
            local_dt = datetime.strptime(f"{date_str}_{time_str}", "%Y%m%d_%H%M%S")
            cst_dt = cst.localize(local_dt)
            logging.info(f"  SUCCESS: Extracted start time from filename (Pattern 1): {cst_dt}")
            return cst_dt
        except ValueError: pass

    # Pattern 2: OBD2_Log_08-08-2025_02_15_51_AM.csv
    filename_match2 = re.search(r"OBD2_Log_(\d{2}-\d{2}-\d{4}_\d{2}_\d{2}_\d{2}_(?:AM|PM))", file_name, re.IGNORECASE)
    if filename_match2:
        ts_str = filename_match2.group(1)
        try:
            local_dt = datetime.strptime(ts_str, "%m-%d-%Y_%I_%M_%S_%p")
            cst_dt = cst.localize(local_dt)
            logging.info(f"  SUCCESS: Extracted start time from filename (Pattern 2): {cst_dt}")
            return cst_dt
        except ValueError: pass
        
    return None
