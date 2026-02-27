
import mysql.connector
from mysql.connector import Error
import sys
import os

# Add project root to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, '..'))
sys.path.append(project_root)

from config.db_credentials import DB_CONFIG

def reset_database():
    print(f"Connecting to {DB_CONFIG['host']}...")
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        print("Dropping existing tables for clean reset...")
        cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
        tables = ["track_segments", "waypoints", "tracks", "trips", "log_data", "log_index", "column_definitions"]
        for table in tables:
            cursor.execute(f"DROP TABLE IF EXISTS {table}")
        cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
        
        print("Creating new high-precision schema...")
        
        # 1. column_definitions (Unchanged)
        cursor.execute("""
        CREATE TABLE column_definitions (
            column_id INT AUTO_INCREMENT PRIMARY KEY,
            column_name VARCHAR(255) UNIQUE NOT NULL,
            sanitized_name VARCHAR(255) UNIQUE NOT NULL,
            mysql_data_type VARCHAR(50) NOT NULL
        ) ENGINE=InnoDB;
        """)

        # 2. log_index (Changed: start_time DATETIME(6))
        cursor.execute("""
        CREATE TABLE log_index (
            log_id INT AUTO_INCREMENT PRIMARY KEY,
            file_name VARCHAR(255) UNIQUE NOT NULL,
            start_time DATETIME(6) NOT NULL,
            trip_duration_seconds FLOAT NOT NULL,
            column_ids_json TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;
        """)

        # 3. log_data (Changed: row_time DATETIME(6), dropped timestamp/time)
        cursor.execute("""
        CREATE TABLE log_data (
            data_id BIGINT AUTO_INCREMENT PRIMARY KEY,
            log_id INT NOT NULL,
            row_time DATETIME(6) NOT NULL,
            operating_state VARCHAR(50),
            INDEX (log_id),
            INDEX idx_row_time (row_time),
            INDEX idx_operating_state (operating_state),
            FOREIGN KEY (log_id) REFERENCES log_index(log_id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
        """)

        # 4. trips (Unchanged)
        cursor.execute("""
        CREATE TABLE trips (
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
        """)

        conn.commit()
        print("Database reset and new schema applied successfully.")
        
    except Error as e:
        print(f"Error during database reset: {e}")
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

if __name__ == "__main__":
    confirm = input("This will WIPE all data in your OBD2 database. Are you sure? (y/N): ")
    if confirm.lower() == 'y':
        reset_database()
    else:
        print("Aborted.")
