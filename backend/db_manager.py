# FILE: backend/db_manager.py
#
# --- VERSION 1.9.8-ALPHA ---
# - FIXED: Restored to the last known-good complete version of the file.
# - All methods are fully implemented to prevent AttributeErrors.
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
            cursor.execute(query, params or ())
            self.connection.commit()
            return True
        except Error as e:
            logging.error(f"Error executing query: {e}")
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
            cursor.execute(query, params or ())
            return cursor.fetchall()
        finally:
            cursor.close()

    def fetch_one(self, query, params=None):
        cursor = self.connection.cursor(dictionary=True)
        try:
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
            start_timestamp BIGINT NOT NULL,
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
            mysql_data_type VARCHAR(50) NOT NULL
        ) ENGINE=InnoDB;
        """
        log_data_query = """
        CREATE TABLE IF NOT EXISTS log_data (
            data_id BIGINT AUTO_INCREMENT PRIMARY KEY,
            log_id INT NOT NULL,
            timestamp BIGINT NOT NULL,
            INDEX (log_id),
            FOREIGN KEY (log_id) REFERENCES log_index(log_id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
        """
        self.execute_query(log_index_query)
        self.execute_query(column_definitions_query)
        self.execute_query(log_data_query)

        if not self._column_exists('log_data', 'operating_state'):
            self.execute_query("ALTER TABLE log_data ADD COLUMN operating_state VARCHAR(50), ADD INDEX idx_operating_state (operating_state);")

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

        if not self._column_exists('trips', 'distance_miles'):
            self.execute_query("ALTER TABLE trips ADD COLUMN distance_miles FLOAT;")
        
        logging.info("Base tables verification complete.")

    def get_pid_statistics(self, sanitized_pids):
        if not sanitized_pids:
            return {}
        stats = {}
        for pid in sanitized_pids:
            query = f"""
                SELECT operating_state, AVG(`{pid}`) as mean, STDDEV(`{pid}`) as std_dev
                FROM log_data WHERE operating_state IS NOT NULL AND `{pid}` IS NOT NULL
                GROUP BY operating_state
            """
            try:
                results = self.fetch_all(query)
                pid_stats = {row['operating_state']: {'mean': row['mean'], 'std_dev': row['std_dev']} for row in results}
                stats[pid] = pid_stats
            except Error as e:
                logging.error(f"Could not calculate statistics for PID '{pid}': {e}")
        return stats
    
    def get_all_defined_columns(self):
        query = "SELECT column_id, column_name, sanitized_name, mysql_data_type FROM column_definitions"
        return {row['column_name'].lower(): row for row in self.fetch_all(query)}

    def add_new_column(self, column_name, data_type):
        sanitized = sanitize_column_name(column_name)
        logging.info(f"New column '{column_name}' detected. Adding to schema as '{sanitized}' with type {data_type}.")
        insert_query = "INSERT INTO column_definitions (column_name, sanitized_name, mysql_data_type) VALUES (%s, %s, %s)"
        if not self.execute_query(insert_query, (column_name, sanitized, data_type)):
            return None
        alter_query = f"ALTER TABLE log_data ADD COLUMN `{sanitized}` {data_type}"
        if not self.execute_query(alter_query):
            logging.error(f"Failed to add column '{sanitized}' to log_data table.")
            return None
        return self.fetch_one("SELECT * FROM column_definitions WHERE column_name = %s", (column_name,))

    def is_file_processed(self, file_name):
        return self.fetch_one("SELECT 1 FROM log_index WHERE file_name = %s", (file_name,)) is not None

    def insert_log_index(self, file_name, start_timestamp, duration, column_ids_json):
        query = "INSERT INTO log_index (file_name, start_timestamp, trip_duration_seconds, column_ids_json) VALUES (%s, %s, %s, %s)"
        cursor = self.connection.cursor()
        try:
            cursor.execute(query, (file_name, start_timestamp, duration, column_ids_json))
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

    def insert_log_data_batch(self, log_id, data_rows, column_map):
        if not data_rows: return
        sanitized_headers = list(column_map.values())
        cols_str = ", ".join([f"`{h}`" for h in sanitized_headers])
        placeholders = ", ".join(["%s"] * len(sanitized_headers))
        query = f"INSERT INTO log_data (log_id, timestamp, operating_state, {cols_str}) VALUES (%s, %s, %s, {placeholders})"
        insert_tuples = []
        for row in data_rows:
            data_tuple = [log_id, row['row_timestamp'], row['operating_state']]
            for header in column_map.keys():
                data_tuple.append(row.get(header, None))
            insert_tuples.append(tuple(data_tuple))
        cursor = self.connection.cursor()
        try:
            cursor.executemany(query, insert_tuples)
            self.connection.commit()
            logging.info(f"Inserted {cursor.rowcount} data rows for log_id {log_id}.")
        except Error as e:
            logging.error(f"Failed to batch insert data for log_id {log_id}: {e}")
            self.connection.rollback()
        finally:
            cursor.close()

    def get_first_valid_coord(self, log_id, lat_pid, lon_pid):
        query = f"SELECT `{lat_pid}`, `{lon_pid}` FROM log_data WHERE log_id = %s AND `{lat_pid}` != 0 AND `{lon_pid}` != 0 ORDER BY timestamp ASC LIMIT 1"
        return self.fetch_one(query, (log_id,))

    def get_last_valid_coord(self, log_id, lat_pid, lon_pid):
        query = f"SELECT `{lat_pid}`, `{lon_pid}` FROM log_data WHERE log_id = %s AND `{lat_pid}` != 0 AND `{lon_pid}` != 0 ORDER BY timestamp DESC LIMIT 1"
        return self.fetch_one(query, (log_id,))

    def get_all_logs(self):
        query = "SELECT li.log_id, li.file_name, li.start_timestamp, li.trip_duration_seconds, t.distance_miles FROM log_index li LEFT JOIN trips t ON li.log_id = t.log_id ORDER BY li.start_timestamp DESC"
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
        data_query = f"SELECT data_id, timestamp, operating_state, {cols_for_select} FROM log_data WHERE log_id = %s ORDER BY timestamp ASC"
        data_rows = self.fetch_all(data_query, (log_id,))
        return data_rows, ['data_id', 'timestamp', 'operating_state'] + sanitized_names, statistics, normalized_names

    def get_all_trip_groups(self):
        query = "SELECT trip_group_id, COUNT(trip_id) as trip_count, AVG(start_lat) as avg_start_lat, AVG(start_lon) as avg_start_lon, AVG(end_lat) as avg_end_lat, AVG(end_lon) as avg_end_lon FROM trips WHERE trip_group_id IS NOT NULL GROUP BY trip_group_id HAVING trip_count > 1 ORDER BY trip_count DESC;"
        return self.fetch_all(query)

    def get_logs_for_trip_group(self, group_id):
        query = "SELECT li.log_id, li.file_name, li.start_timestamp, li.trip_duration_seconds FROM log_index li JOIN trips t ON li.log_id = t.log_id WHERE t.trip_group_id = %s ORDER BY li.start_timestamp ASC;"
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

    def close(self):
        if self.connection and self.connection.is_connected():
            self.connection.close()