#  FILE: backend/db_manager.py
#
# --- VERSION 1.9.7-ALPHA ---
# - FIXED: This file has been restored to its complete, functional state.
# - All methods, including `is_file_processed`, `add_new_column`,
#   `insert_log_index`, and `insert_log_data_batch`, have been re-implemented,
#   fixing the `AttributeError` that broke the file ingestion process.
# -----------------------------

import mysql.connector
from mysql.connector import Error
import logging
import json

from .utils import sanitize_column_name

class DatabaseManager:
    def __init__(self, db_config):
        self.db_config = db_config
        self.connection = None
        try:
            self.connection = mysql.connector.connect(**self.db_config)
        except Error as e:
            logging.critical(f"DATABASE CONNECTION FAILED: {e}")
            raise

    def execute_query(self, query, params=None):
        cursor = self.connection.cursor()
        try:
            # Log the query for audit/rollback purposes
            logging.info(f"DB_EXEC: {query} | PARAMS: {params or '()'}")
            cursor.execute(query, params or ())
            self.connection.commit()
            return True
        except Error as e:
            logging.error(f"DB_ERROR: {e} | QUERY: {query}")
            self.connection.rollback()
            return False
        finally:
            if cursor.with_rows:
                try: cursor.fetchall()
                except Error: pass
            cursor.close()

    def fetch_all(self, query, params=None):
        cursor = self.connection.cursor(dictionary=True)
        try:
            # Log fetches at debug level to avoid noise, but keep them for traceability
            logging.debug(f"DB_FETCH_ALL: {query} | PARAMS: {params or '()'}")
            cursor.execute(query, params or ())
            return cursor.fetchall()
        finally:
            cursor.close()

    def fetch_one(self, query, params=None):
        cursor = self.connection.cursor(dictionary=True)
        try:
            logging.debug(f"DB_FETCH_ONE: {query} | PARAMS: {params or '()'}")
            cursor.execute(query, params or ())
            return cursor.fetchone()
        finally:
            cursor.close()

    def _column_exists(self, table_name, column_name):
        query = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND COLUMN_NAME = %s"
        cursor = self.connection.cursor()
        cursor.execute(query, (self.db_config['database'], table_name, column_name))
        exists = cursor.fetchone()[0] > 0
        cursor.close()
        return exists

    def ensure_base_tables_exist(self):
        logging.info("Ensuring base tables exist...")
        log_index_query = """
        CREATE TABLE IF NOT EXISTS log_index (
            log_id INT AUTO_INCREMENT PRIMARY KEY,
            file_name VARCHAR(255) UNIQUE NOT NULL,
            start_time DATETIME(6) NOT NULL,
            trip_duration_seconds FLOAT NOT NULL,
            column_ids_json TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;
        """
        column_definitions_query = """
        CREATE TABLE IF NOT EXISTS column_definitions (
            column_id INT AUTO_INCREMENT PRIMARY KEY,
            column_name VARCHAR(255) UNIQUE NOT NULL,
            sanitized_name VARCHAR(255) UNIQUE NOT NULL,
            mysql_data_type VARCHAR(50) NOT NULL,
            is_ignored BOOLEAN DEFAULT FALSE
        ) ENGINE=InnoDB;
        """
        log_data_query = """
        CREATE TABLE IF NOT EXISTS log_data (
            data_id BIGINT AUTO_INCREMENT PRIMARY KEY,
            log_id INT NOT NULL,
            row_time DATETIME(6) NOT NULL,
            INDEX (log_id),
            INDEX idx_row_time (row_time),
            FOREIGN KEY (log_id) REFERENCES log_index(log_id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
        """
        self.execute_query(log_index_query)
        self.execute_query(column_definitions_query)
        
        # Ensure is_ignored column exists if table was already created
        if not self._column_exists('column_definitions', 'is_ignored'):
            self.execute_query("ALTER TABLE column_definitions ADD COLUMN is_ignored BOOLEAN DEFAULT FALSE")

        self.execute_query(log_data_query)

        # 1. log_data_raw: Identical to log_data, but ignores blacklists
        log_data_raw_query = """
        CREATE TABLE IF NOT EXISTS log_data_raw (
            data_id BIGINT AUTO_INCREMENT PRIMARY KEY,
            log_id INT NOT NULL,
            row_time DATETIME(6) NOT NULL,
            INDEX (log_id),
            INDEX idx_row_time (row_time),
            FOREIGN KEY (log_id) REFERENCES log_index(log_id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
        """
        self.execute_query(log_data_raw_query)

        # 2. log_data_calculated: Canonical/derived metrics
        log_data_calculated_query = """
        CREATE TABLE IF NOT EXISTS log_data_calculated (
            calc_id BIGINT AUTO_INCREMENT PRIMARY KEY,
            data_id BIGINT NOT NULL UNIQUE,
            log_id INT NOT NULL,
            max_speed FLOAT,
            engine_power FLOAT,
            engine_torque FLOAT,
            hard_accel_count INT,
            hard_brake_count INT,
            idling_count INT,
            instant_co2_rate FLOAT,
            avg_trip_co2_rate FLOAT,
            seconds_idling INT,
            total_fuel_economy FLOAT,
            trip_duration FLOAT,
            trip_fuel_economy FLOAT,
            vehicle_speed FLOAT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (data_id) REFERENCES log_data(data_id) ON DELETE CASCADE,
            FOREIGN KEY (log_id) REFERENCES log_index(log_id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
        """
        self.execute_query(log_data_calculated_query)

        # Blacklist table
        blacklist_query = """
        CREATE TABLE IF NOT EXISTS column_blacklist (
            blacklist_id INT AUTO_INCREMENT PRIMARY KEY,
            column_name VARCHAR(255) UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;
        """
        self.execute_query(blacklist_query)

        trips_table_query = """
        CREATE TABLE IF NOT EXISTS trips (
            trip_id INT AUTO_INCREMENT PRIMARY KEY,
            log_id INT NOT NULL UNIQUE,
            start_lat DECIMAL(9, 6),
            start_lon DECIMAL(9, 6),
            end_lat DECIMAL(9, 6),
            end_lon DECIMAL(9, 6),
            trip_group_id VARCHAR(64),
            distance_miles FLOAT,
            notes TEXT,
            tags JSON,
            FOREIGN KEY (log_id) REFERENCES log_index(log_id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
        """
        self.execute_query(trips_table_query)

        waypoints_query = """
        CREATE TABLE IF NOT EXISTS waypoints (
            waypoint_id    INT AUTO_INCREMENT PRIMARY KEY,
            latitude       DECIMAL(9,6) NOT NULL,
            longitude      DECIMAL(9,6) NOT NULL,
            elevation      FLOAT,
            name           VARCHAR(255),
            sym            VARCHAR(100),
            notes          TEXT,
            is_tagged      BOOLEAN DEFAULT FALSE,
            created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;
        """
        self.execute_query(waypoints_query)

        tracks_query = """
        CREATE TABLE IF NOT EXISTS tracks (
            track_id            INT AUTO_INCREMENT PRIMARY KEY,
            source_log_id       INT UNIQUE,
            file_name           VARCHAR(255),
            start_time          DATETIME,
            duration_seconds    FLOAT,
            column_ids_json     TEXT,
            start_waypoint_id   INT,
            end_waypoint_id     INT,
            bounds_json         JSON,
            created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (source_log_id)     REFERENCES log_index(log_id)     ON DELETE CASCADE,
            FOREIGN KEY (start_waypoint_id) REFERENCES waypoints(waypoint_id),
            FOREIGN KEY (end_waypoint_id)   REFERENCES waypoints(waypoint_id)
        ) ENGINE=InnoDB;
        """
        self.execute_query(tracks_query)

        track_segments_query = """
        CREATE TABLE IF NOT EXISTS track_segments (
            segment_id         INT AUTO_INCREMENT PRIMARY KEY,
            track_id           INT NOT NULL,
            segment_index      INT DEFAULT 1,
            segment_length     FLOAT,
            segment_duration_seconds FLOAT,
            start_waypoint_id  INT,
            end_waypoint_id    INT,
            created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (track_id)           REFERENCES tracks(track_id) ON DELETE CASCADE,
            FOREIGN KEY (start_waypoint_id)  REFERENCES waypoints(waypoint_id),
            FOREIGN KEY (end_waypoint_id)    REFERENCES waypoints(waypoint_id)
        ) ENGINE=InnoDB;
        """
        self.execute_query(track_segments_query)
        
        logging.info("Base tables verification complete.")

    def get_pid_statistics(self, sanitized_pids):
        if not sanitized_pids:
            return {}
        stats = {}
        for pid in sanitized_pids:
            query = f"""
                SELECT AVG(`{pid}`) as mean, STDDEV(`{pid}`) as std_dev
                FROM log_data WHERE `{pid}` IS NOT NULL
            """
            try:
                row = self.fetch_one(query)
                if row:
                    stats[pid] = {'mean': row['mean'], 'std_dev': row['std_dev']}
            except Error as e:
                logging.error(f"Could not calculate statistics for PID '{pid}': {e}")
        return stats
    
    def get_all_defined_columns(self):
        query = "SELECT column_id, column_name, sanitized_name, mysql_data_type FROM column_definitions"
        return {row['column_name'].lower(): row for row in self.fetch_all(query)}

    def add_new_column(self, column_name, data_type):
        sanitized = sanitize_column_name(column_name)
        logging.info(f"New column '{column_name}' detected. Checking schema for '{sanitized}'.")
        
        # 1. Ensure it's in column_definitions
        check_def = self.fetch_one("SELECT column_id FROM column_definitions WHERE column_name = %s", (column_name,))
        if not check_def:
            insert_query = "INSERT INTO column_definitions (column_name, sanitized_name, mysql_data_type) VALUES (%s, %s, %s)"
            if not self.execute_query(insert_query, (column_name, sanitized, data_type)):
                return None
        
        # 2. Ensure it's in log_data and log_data_raw tables
        for table in ['log_data', 'log_data_raw']:
            if not self._column_exists(table, sanitized):
                logging.info(f"MAINTENANCE: Adding column '{sanitized}' to {table} table with type {data_type}.")
                alter_query = f"ALTER TABLE {table} ADD COLUMN `{sanitized}` {data_type}"
                if not self.execute_query(alter_query):
                    logging.error(f"MAINTENANCE: Failed to add column '{sanitized}' to {table} table.")
                    return None
            else:
                logging.info(f"MAINTENANCE: Column '{sanitized}' already exists in {table} table.")

        return self.fetch_one("SELECT * FROM column_definitions WHERE column_name = %s", (column_name,))

    def is_file_processed(self, file_name):
        return self.fetch_one("SELECT 1 FROM log_index WHERE file_name = %s", (file_name,)) is not None

    def insert_log_index(self, file_name, start_time, duration, column_ids_json):
        query = "INSERT INTO log_index (file_name, start_time, trip_duration_seconds, column_ids_json) VALUES (%s, %s, %s, %s)"
        cursor = self.connection.cursor()
        try:
            cursor.execute(query, (file_name, start_time, duration, column_ids_json))
            self.connection.commit()
            log_id = cursor.lastrowid
            logging.info(f"Indexed file '{file_name}' with log_id: {log_id}.")
            return log_id
        except Error as e:
            logging.error(f"Failed to index file {file_name}: {e}")
            self.connection.rollback()
            return None
        finally:
            cursor.close()

    def insert_log_data_batch(self, log_id, data_rows, column_map, raw_column_map=None):
        if not data_rows: return
        
        # 1. Insert into Filtered table (log_data)
        self._insert_to_table('log_data', log_id, data_rows, column_map)
        
        # 2. Insert into Raw table (log_data_raw)
        if raw_column_map:
            self._insert_to_table('log_data_raw', log_id, data_rows, raw_column_map)

    def _insert_to_table(self, table_name, log_id, data_rows, col_map):
        sanitized_headers = list(col_map.values())
        cols_str = ", ".join([f"`{h}`" for h in sanitized_headers])
        placeholders = ", ".join(["%s"] * len(sanitized_headers))
        query = f"INSERT INTO {table_name} (log_id, row_time, {cols_str}) VALUES (%s, %s, {placeholders})"
        
        insert_tuples = []
        for row in data_rows:
            data_tuple = [log_id, row['row_time']]
            for header in col_map.keys():
                data_tuple.append(row.get(header, None))
            insert_tuples.append(tuple(data_tuple))
            
        cursor = self.connection.cursor()
        try:
            cursor.executemany(query, insert_tuples)
            self.connection.commit()
            logging.info(f"INGEST: Inserted {cursor.rowcount} rows into {table_name} for log_id {log_id}.")
        except Error as e:
            logging.error(f"INGEST_ERR: Failed batch insert into {table_name}: {e}")
            self.connection.rollback()
        finally:
            cursor.close()

    def get_first_valid_coord(self, log_id, lat_pid, lon_pid):
        query = f"SELECT `{lat_pid}`, `{lon_pid}` FROM log_data WHERE log_id = %s AND `{lat_pid}` != 0 AND `{lon_pid}` != 0 ORDER BY row_time ASC LIMIT 1"
        return self.fetch_one(query, (log_id,))

    def get_last_valid_coord(self, log_id, lat_pid, lon_pid):
        query = f"SELECT `{lat_pid}`, `{lon_pid}` FROM log_data WHERE log_id = %s AND `{lat_pid}` != 0 AND `{lon_pid}` != 0 ORDER BY row_time DESC LIMIT 1"
        return self.fetch_one(query, (log_id,))

    def get_all_logs(self):
        query = "SELECT li.log_id, li.file_name, li.start_time, UNIX_TIMESTAMP(li.start_time) as start_timestamp, li.trip_duration_seconds, t.distance_miles FROM log_index li LEFT JOIN trips t ON li.log_id = t.log_id ORDER BY li.start_time DESC"
        return self.fetch_all(query)
    
    def get_data_for_log(self, log_id, pids_to_fetch=None):
        log_index_entry = self.fetch_one("SELECT column_ids_json FROM log_index WHERE log_id = %s", (log_id,))
        if not log_index_entry: raise ValueError(f"No log found with log_id: {log_id}")
        column_ids_json = log_index_entry.get('column_ids_json')
        if not column_ids_json: return [], [], {}, {}
        column_ids = json.loads(column_ids_json)
        if not column_ids: return [], [], {}, {}
        format_strings = ','.join(['%s'] * len(column_ids))
        cols_query = f"SELECT sanitized_name, column_name FROM column_definitions WHERE column_id IN ({format_strings})"
        cursor = self.connection.cursor(dictionary=True)
        cursor.execute(cols_query, tuple(column_ids))
        column_info = cursor.fetchall()
        cursor.close()
        sanitized_names = [c['sanitized_name'] for c in column_info]
        normalized_names = {c['sanitized_name']: c['column_name'] for c in column_info}
        if not sanitized_names: return [], [], {}, {}
        
        if pids_to_fetch:
            requested_sanitized = [s for s, n in normalized_names.items() if n in pids_to_fetch]
            sanitized_names = requested_sanitized
        
        statistics = self.get_pid_statistics(sanitized_names)
        cols_for_select = ", ".join([f"`{name}`" for name in sanitized_names])
        # Include timestamp in milliseconds for frontend compatibility
        data_query = f"SELECT data_id, row_time, (UNIX_TIMESTAMP(row_time) * 1000 + MICROSECOND(row_time) / 1000) as timestamp, {cols_for_select} FROM log_data WHERE log_id = %s ORDER BY row_time ASC"
        data_rows = self.fetch_all(data_query, (log_id,))
        return data_rows, ['data_id', 'row_time', 'timestamp'] + sanitized_names, statistics, normalized_names

    def get_all_trip_groups(self):
        query = "SELECT trip_group_id, COUNT(trip_id) as trip_count, AVG(start_lat) as avg_start_lat, AVG(start_lon) as avg_start_lon, AVG(end_lat) as avg_end_lat, AVG(end_lon) as avg_end_lon FROM trips WHERE trip_group_id IS NOT NULL GROUP BY trip_group_id HAVING trip_count > 1 ORDER BY trip_count DESC;"
        return self.fetch_all(query)

    def get_logs_for_trip_group(self, group_id):
        query = "SELECT li.log_id, li.file_name, li.start_time, UNIX_TIMESTAMP(li.start_time) as start_timestamp, li.trip_duration_seconds FROM log_index li JOIN trips t ON li.log_id = t.log_id WHERE t.trip_group_id = %s ORDER BY li.start_time ASC;"
        return self.fetch_all(query, (group_id,))

    def get_trip_group_summary(self):
        query = "SELECT trip_group_id, COUNT(trip_id) as count FROM trips WHERE trip_group_id IS NOT NULL GROUP BY trip_group_id"
        groups = self.fetch_all(query)
        total_logs_query = "SELECT COUNT(log_id) as total FROM log_index"
        total_logs = self.fetch_one(total_logs_query)['total']
        group_counts = {"groups_of_2": 0, "groups_of_3_4": 0, "groups_of_5_plus": 0}
        total_trips_in_groups = 0
        for group in groups:
            count = group['count']
            if count == 2: group_counts["groups_of_2"] += 1
            elif count in [3, 4]: group_counts["groups_of_3_4"] += 1
            elif count >= 5: group_counts["groups_of_5_plus"] += 1
            if count > 1: total_trips_in_groups += count
        return {"total_groups": len([g for g in groups if g['count'] > 1]), "total_trips_grouped": total_trips_in_groups, "total_logs": total_logs, "group_counts": group_counts}

    def get_track_groups(self):
        """
        Groups tracks by start/end waypoint IDs.
        """
        query = """
            SELECT 
                t.start_waypoint_id,
                t.end_waypoint_id,
                ws.name as start_location,
                we.name as end_location,
                COUNT(t.track_id) as trip_count,
                AVG(t.duration_seconds) as avg_duration,
                AVG(tr.distance_miles) as avg_distance
            FROM tracks t
            JOIN waypoints ws ON t.start_waypoint_id = ws.waypoint_id
            JOIN waypoints we ON t.end_waypoint_id = we.waypoint_id
            LEFT JOIN trips tr ON t.source_log_id = tr.log_id
            GROUP BY t.start_waypoint_id, t.end_waypoint_id
            HAVING trip_count > 1
            ORDER BY trip_count DESC
        """
        return self.fetch_all(query)

    def get_logs_for_track_group(self, start_id, end_id):
        """
        Fetches logs belonging to a specific track group (start/end pair).
        """
        query = """
            SELECT 
                li.log_id, 
                li.file_name, 
                li.start_time, 
                UNIX_TIMESTAMP(li.start_time) as start_timestamp,
                li.trip_duration_seconds,
                tr.distance_miles
            FROM log_index li
            JOIN tracks t ON li.log_id = t.source_log_id
            LEFT JOIN trips tr ON li.log_id = tr.log_id
            WHERE t.start_waypoint_id = %s AND t.end_waypoint_id = %s
            ORDER BY li.start_time ASC
        """
        return self.fetch_all(query, (start_id, end_id))

    def close(self):
        if self.connection and self.connection.is_connected():
            self.connection.close()

    # --- MAINTENANCE METHODS ---

    def get_logs_by_columns(self, column_names):
        """Finds logs that contain any of the specified column names by checking metadata and then data directly."""
        if not column_names:
            return []
        
        db_cols = self.fetch_all(f"SELECT column_id, sanitized_name FROM column_definitions WHERE column_name IN ({','.join(['%s']*len(column_names))})", tuple(column_names))
        col_ids = [row['column_id'] for row in db_cols]
        sanitized_names = [row['sanitized_name'] for row in db_cols]
        
        if not col_ids:
            return []

        # 1. Quick check via metadata
        all_logs = self.get_all_logs()
        matching_log_ids = set()
        for log in all_logs:
            if log.get('column_ids_json'):
                log_col_ids = json.loads(log['column_ids_json'])
                if any(cid in log_col_ids for cid in col_ids):
                    matching_log_ids.add(log['log_id'])
        
        # 2. Robust check via data table (if metadata was out of sync or missing)
        for s_name in sanitized_names:
            query = f"SELECT DISTINCT log_id FROM log_data WHERE `{s_name}` IS NOT NULL"
            res = self.fetch_all(query)
            for row in res:
                matching_log_ids.add(row['log_id'])

        return [log for log in all_logs if log['log_id'] in matching_log_ids]

    def delete_log_complete(self, log_id):
        """
        Permanently deletes a log and all its associated data from the DB.
        """
        log_info = self.fetch_one("SELECT file_name FROM log_index WHERE log_id = %s", (log_id,))
        if not log_info:
            return False
        
        logging.info(f"MAINTENANCE: Permanently deleting log {log_id} ({log_info['file_name']}) from database.")
        
        # We manually delete from log_data_raw since it might not have FK cascade if it was manually cloned
        self.execute_query("DELETE FROM log_data_raw WHERE log_id = %s", (log_id,))
        
        # Cascades will handle log_data, log_data_calculated, trips, tracks
        return self.execute_query("DELETE FROM log_index WHERE log_id = %s", (log_id,))

    def get_all_columns_with_stats(self):
        """Returns all column definitions with 'zero-data' statistics relative to the ENTIRE table."""
        # Get total row count for the denominator
        total_rows_res = self.fetch_one("SELECT COUNT(*) as count FROM log_data")
        total_table_rows = total_rows_res['count'] if total_rows_res else 1
        
        cols = self.fetch_all("SELECT * FROM column_definitions ORDER BY column_name")
        for col in cols:
            sanitized = col['sanitized_name']
            
            try:
                # Count non-zero, non-null values
                query = f"SELECT COUNT(*) as count FROM log_data WHERE `{sanitized}` IS NOT NULL AND `{sanitized}` != 0 AND `{sanitized}` != ''"
                res = self.fetch_one(query)
                col['populated_rows'] = res['count'] if res else 0
                
                # Total rows this column appears in (not used for fill % denominator anymore, but good for context)
                present_query = f"SELECT COUNT(*) as count FROM log_data WHERE `{sanitized}` IS NOT NULL"
                res_present = self.fetch_one(present_query)
                col['rows_present'] = res_present['count'] if res_present else 0
                
                # USE GLOBAL DENOMINATOR AS REQUESTED
                col['total_rows'] = total_table_rows
                
            except Error as e:
                logging.warning(f"MAINTENANCE: Could not fetch stats for column {sanitized}: {e}")
                col['populated_rows'] = 0
                col['rows_present'] = 0
                col['total_rows'] = total_table_rows
            
            col['is_blacklisted'] = self.fetch_one("SELECT 1 FROM column_blacklist WHERE column_name = %s", (col['column_name'],)) is not None
            
        return cols

    def blacklist_column(self, column_name):
        """Blacklists a column, removes it from definitions, and drops it from log_data."""
        col_info = self.fetch_one("SELECT sanitized_name FROM column_definitions WHERE column_name = %s", (column_name,))
        
        logging.info(f"MAINTENANCE: Blacklisting column '{column_name}'.")
        
        # 1. Add to blacklist table
        self.execute_query("INSERT IGNORE INTO column_blacklist (column_name) VALUES (%s)", (column_name,))
        
        if col_info:
            sanitized = col_info['sanitized_name']
            logging.info(f"MAINTENANCE: Dropping column `{sanitized}` from log_data table.")
            # 2. Drop from data table
            self.execute_query(f"ALTER TABLE log_data DROP COLUMN `{sanitized}`")
            # 3. Remove from definitions
            self.execute_query("DELETE FROM column_definitions WHERE column_name = %s", (column_name,))
            
        return True

    def get_blacklist(self):
        return [row['column_name'] for row in self.fetch_all("SELECT column_name FROM column_blacklist")]

    def remove_from_blacklist(self, column_name):
        logging.info(f"MAINTENANCE: Removing '{column_name}' from blacklist.")
        return self.execute_query("DELETE FROM column_blacklist WHERE column_name = %s", (column_name,))

    def get_all_waypoints(self):
        """Returns all waypoints for maintenance/naming."""
        query = "SELECT * FROM waypoints ORDER BY waypoint_id"
        return self.fetch_all(query)

    def update_waypoint_name(self, waypoint_id, name):
        """Updates the human-readable name for a waypoint."""
        logging.info(f"MAINTENANCE: Updating waypoint {waypoint_id} name to '{name}'")
        query = "UPDATE waypoints SET name = %s WHERE waypoint_id = %s"
        return self.execute_query(query, (name, waypoint_id))