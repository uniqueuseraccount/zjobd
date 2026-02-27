
import mysql.connector
import sys
import os

# Add project root to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, '..', '..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from config.db_credentials import DB_CONFIG

def update_trip_distances():
    print("Connecting to database...")
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor(dictionary=True)
        
        # 1. Get all logs
        cursor.execute("SELECT log_id FROM log_index")
        logs = cursor.fetchall()
        print(f"Found {len(logs)} logs. Starting distance update...")
        
        updated_count = 0
        
        for log in logs:
            log_id = log['log_id']
            
            # 2. Get max trip_distance for this log
            # We check if the column exists in the context of this specific log query
            # but simpler is just to run the query. If the log doesn't have that column
            # it might return NULL or 0.
            
            # Check if this log actually has the trip_distance column mapped?
            # Actually, `log_data` has the column `trip_distance` if it was added.
            # But if a specific log doesn't have data for it, it will be NULL.
            
            try:
                # We need to check if the column `trip_distance` even exists in the table schema first
                # (We know it does from previous check, but good practice)
                
                query = "SELECT MAX(trip_distance) as max_dist FROM log_data WHERE log_id = %s"
                cursor.execute(query, (log_id,))
                result = cursor.fetchone()
                
                max_dist = result['max_dist']
                
                if max_dist is not None and max_dist > 0:
                    # 3. Update trips table
                    update_query = "UPDATE trips SET distance_miles = %s WHERE log_id = %s"
                    cursor.execute(update_query, (max_dist, log_id))
                    updated_count += 1
                    
            except mysql.connector.Error as err:
                # Column might not exist if no logs had it? Unlikely given previous check.
                print(f"Error processing log {log_id}: {err}")
                
        conn.commit()
        print(f"Successfully updated distance for {updated_count} trips.")
        
    except mysql.connector.Error as e:
        print(f"Database error: {e}")
    finally:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()

if __name__ == "__main__":
    update_trip_distances()
