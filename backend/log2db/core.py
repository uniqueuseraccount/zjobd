# FILE: backend/log2db/core.py
#
# --- VERSION 1.2.0 ---
# - Now imports and uses the `classify_operating_states` function from the
#   new `state_detector` module to add context to each data row before ingestion.
# -----------------------------

import os
import csv
import logging
import json
import re
from .utils import parse_start_timestamp, infer_mysql_type
from .state_detector import classify_operating_states

def find_header_row(file_path):
    with open(file_path, 'r', encoding='utf-8-sig', errors='ignore') as f:
        for i, line in enumerate(f):
            line = line.strip()
            if line and not line.startswith('#'):
                reader = csv.reader([line])
                raw_headers = next(reader)
                normalized_headers = []
                for h in raw_headers:
                    no_units = re.sub(r'\s*\([^)]*\)$', '', h)
                    no_extra_space = re.sub(r'\s+', ' ', no_units).strip()
                    final_header = no_extra_space.lower()
                    normalized_headers.append(final_header)
                return i, normalized_headers
    return -1, None

def process_log_file(file_path, db_manager):
    file_name = os.path.basename(file_path)
    logging.info(f"--- Processing file: {file_name} ---")

    if db_manager.is_file_processed(file_name):
        logging.info(f"Skipping '{file_name}', already in database.")
        return True, "skipped"

    start_timestamp = parse_start_timestamp(file_path)
    
    header_row_index, headers = find_header_row(file_path)
    if not headers:
        logging.error(f"Could not find a valid header row in '{file_name}'.")
        return False, "error"
    logging.info(f"Normalized Headers: {headers}")

    data_rows = []
    try:
        with open(file_path, 'r', encoding='utf-8-sig', errors='ignore') as f:
            for _ in range(header_row_index + 1): next(f)
            reader = csv.DictReader(f, fieldnames=headers)
            for row in reader:
                if any(row.values()): data_rows.append(row)
    except Exception as e:
        logging.error(f"Error reading data from '{file_name}': {e}")
        return False, "error"

    if not data_rows:
        logging.warning(f"No data rows found in '{file_name}'.")
        return True, "skipped_no_data"
    logging.info(f"Read {len(data_rows)} data rows from '{file_name}'.")

    # Fallback: If no header timestamp, try to parse from the first data row
    if start_timestamp is None and data_rows:
        first_row_time = data_rows[0].get('time')
        if first_row_time:
            # Try parsing the time column directly
            from datetime import datetime
            import pytz
            cst = pytz.timezone('America/Chicago')
            try:
                # Format: 02/09/2026 01:22:26.1941 AM
                dt = datetime.strptime(first_row_time, "%m/%d/%Y %I:%M:%S.%f %p")
                start_timestamp = cst.localize(dt)
                logging.info(f"Extracted start time from first data row: {start_timestamp}")
            except ValueError:
                logging.warning(f"Could not parse time from first data row: {first_row_time}")

    if start_timestamp is None: return False, "error"

    data_rows = classify_operating_states(data_rows, headers)

    defined_columns = db_manager.get_all_defined_columns()
    
    first_data_row = data_rows[0]
    # Filter out 'time' from headers for DB column creation
    db_headers = [h for h in headers if h.lower() != 'time']
    
    for header in db_headers:
        if header not in defined_columns:
            sample_value = first_data_row.get(header)
            mysql_type = infer_mysql_type(sample_value)
            new_col_info = db_manager.add_new_column(header, mysql_type)
            if new_col_info:
                defined_columns[header] = new_col_info
            else:
                logging.critical(f"Could not add new column '{header}'.")
                return False, "error"

    # Determine normalized time header (case-insensitive check)
    normalized_time_header = next((h for h in headers if h.lower() == 'time'), None)
    
    # Pre-calculate row times to determine duration and for insertion
    from datetime import datetime, timedelta
    import pytz
    cst = pytz.timezone('America/Chicago')

    for row in data_rows:
        time_val_str = row.get(normalized_time_header, '')
        try:
            # Try legacy float offset
            time_offset = float(time_val_str)
            row['row_time'] = start_timestamp + timedelta(seconds=time_offset)
        except (ValueError, TypeError):
            # Try new absolute timestamp
            try:
                dt = datetime.strptime(time_val_str, "%m/%d/%Y %I:%M:%S.%f %p")
                row['row_time'] = cst.localize(dt)
            except (ValueError, TypeError):
                row['row_time'] = start_timestamp

    # Calculate duration from first/last row_time
    duration = 0.0
    if data_rows:
        duration = (data_rows[-1]['row_time'] - data_rows[0]['row_time']).total_seconds()
    
    logging.info(f"Calculated trip duration: {duration:.2f} seconds.")

    current_log_column_ids = [defined_columns[h]['column_id'] for h in db_headers if h in defined_columns]
    column_ids_json = json.dumps(current_log_column_ids)

    log_id = db_manager.insert_log_index(file_name, start_timestamp, duration, column_ids_json)
    if not log_id: return False, "error"

    # Column map should only include columns that actually exist in log_data (excluding row_time/operating_state)
    column_map = {h: defined_columns[h]['sanitized_name'] for h in db_headers if h in defined_columns}

    if data_rows:
        logging.info(f"Row timestamps calculated. First: {data_rows[0]['row_time']}, Last: {data_rows[-1]['row_time']}")

    batch_size = 500
    for i in range(0, len(data_rows), batch_size):
        batch = data_rows[i:i + batch_size]
        db_manager.insert_log_data_batch(log_id, batch, column_map)

    logging.info(f"Successfully processed and ingested '{file_name}'.")
    return True, "processed"