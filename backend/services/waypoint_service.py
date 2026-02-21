import math
from backend.log2db.db_manager import DatabaseManager
from backend.config.db_credentials import DB_CONFIG

class WaypointService:
    def __init__(self):
        self.db_config = DB_CONFIG

    def _haversine_distance(self, lat1, lon1, lat2, lon2):
        """
        Calculate the great circle distance between two points 
        on the earth (specified in decimal degrees) in meters.
        """
        R = 6371000  # Radius of Earth in meters
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = math.sin(delta_phi / 2.0) ** 2 + \
            math.cos(phi1) * math.cos(phi2) * \
            math.sin(delta_lambda / 2.0) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        return R * c

    def preview_clusters(self, fuzziness_meters, bounds=None):
        """
        Groups waypoints based on the fuzziness threshold (in meters).
        Returns a list of clusters, where each cluster has a 'center' 
        and a list of 'points' that belong to it.
        
        bounds: Optional dict { 'minLat': float, 'maxLat': float, 'minLon': float, 'maxLon': float }
        """
        db = DatabaseManager(self.db_config)
        try:
            # Build query with optional bounds filter
            where_clause_start = "start_lat IS NOT NULL"
            where_clause_end = "end_lat IS NOT NULL"
            params = []
            
            if bounds:
                # Add bounding box constraints
                # For start points
                where_clause_start += " AND start_lat BETWEEN %s AND %s AND start_lon BETWEEN %s AND %s"
                # For end points
                where_clause_end += " AND end_lat BETWEEN %s AND %s AND end_lon BETWEEN %s AND %s"
                
                # Params order: minLat, maxLat, minLon, maxLon (twice, once for start, once for end)
                bbox_params = [bounds['minLat'], bounds['maxLat'], bounds['minLon'], bounds['maxLon']]
                params = bbox_params + bbox_params

            query = f"""
                SELECT log_id, start_lat as lat, start_lon as lon, 'start' as type FROM trips WHERE {where_clause_start}
                UNION ALL
                SELECT log_id, end_lat as lat, end_lon as lon, 'end' as type FROM trips WHERE {where_clause_end}
            """
            points = db.fetch_all(query, tuple(params))
        finally:
            db.close()

        # Simple Greedy Clustering
        # 1. Pick a point, make it a cluster center.
        # 2. Find all points within 'fuzziness_meters' of this center.
        # 3. Add them to cluster, remove from pool.
        # 4. Repeat.
        
        # Note: A more advanced approach would be to recalculate the centroid 
        # as points are added, but for a "preview" of "fuzziness", 
        # greedy leader is often what users expect (first point wins or simple overlap).
        # Let's try a centroid-based greedy approach for better accuracy.
        
        clusters = []
        processed_indices = set()
        
        # Convert to list of dicts with index for easier handling
        point_list = []
        for i, p in enumerate(points):
            p['id'] = i
            p['lat'] = float(p['lat'])
            p['lon'] = float(p['lon'])
            point_list.append(p)

    def _cluster_points(self, points, fuzziness_meters):
        """
        Internal method to perform the greedy clustering on a list of points.
        """
        clusters = []
        processed_indices = set()
        
        # Convert to list of dicts with index for easier handling
        point_list = []
        for i, p in enumerate(points):
            p['id'] = i
            p['lat'] = float(p['lat'])
            p['lon'] = float(p['lon'])
            point_list.append(p)

        for i, point in enumerate(point_list):
            if i in processed_indices:
                continue
            
            # Start a new cluster with this point
            current_cluster = {
                'center': {'lat': point['lat'], 'lon': point['lon']},
                'points': [point]
            }
            processed_indices.add(i)
            
            # Find neighbors
            for j, candidate in enumerate(point_list):
                if j in processed_indices:
                    continue
                
                dist = self._haversine_distance(
                    point['lat'], point['lon'],
                    candidate['lat'], candidate['lon']
                )
                
                if dist <= fuzziness_meters:
                    current_cluster['points'].append(candidate)
                    processed_indices.add(j)
            
            # Recalculate center (simple average)
            if len(current_cluster['points']) > 1:
                avg_lat = sum(p['lat'] for p in current_cluster['points']) / len(current_cluster['points'])
                avg_lon = sum(p['lon'] for p in current_cluster['points']) / len(current_cluster['points'])
                current_cluster['center'] = {'lat': avg_lat, 'lon': avg_lon}
                
            clusters.append(current_cluster)
        
        return clusters

    def preview_clusters(self, fuzziness_meters, bounds=None):
        """
        Groups waypoints based on the fuzziness threshold (in meters).
        Returns a list of clusters, where each cluster has a 'center' 
        and a list of 'points' that belong to it.
        
        bounds: Optional dict { 'minLat': float, 'maxLat': float, 'minLon': float, 'maxLon': float }
        """
        db = DatabaseManager(self.db_config)
        try:
            # Build query with optional bounds filter
            where_clause_start = "start_lat IS NOT NULL"
            where_clause_end = "end_lat IS NOT NULL"
            params = []
            
            if bounds:
                # Add bounding box constraints
                # For start points
                where_clause_start += " AND start_lat BETWEEN %s AND %s AND start_lon BETWEEN %s AND %s"
                # For end points
                where_clause_end += " AND end_lat BETWEEN %s AND %s AND end_lon BETWEEN %s AND %s"
                
                # Params order: minLat, maxLat, minLon, maxLon (twice, once for start, once for end)
                bbox_params = [bounds['minLat'], bounds['maxLat'], bounds['minLon'], bounds['maxLon']]
                params = bbox_params + bbox_params

            query = f"""
                SELECT log_id, start_lat as lat, start_lon as lon, 'start' as type FROM trips WHERE {where_clause_start}
                UNION ALL
                SELECT log_id, end_lat as lat, end_lon as lon, 'end' as type FROM trips WHERE {where_clause_end}
            """
            points = db.fetch_all(query, tuple(params))
        finally:
            db.close()
            
        return self._cluster_points(points, fuzziness_meters)

    def apply_clusters(self, fuzziness_meters, min_cluster_size=1):
        """
        Calculates clusters for ALL trips and updates the database.
        1. Truncates/Clears waypoints table (optional, but safest for full regen).
        2. Inserts new waypoints for each cluster center.
        3. Updates tracks table with the new start/end waypoint IDs.
        """
        db = DatabaseManager(self.db_config)
        try:
            # 1. Fetch ALL points (no bounds)
            query = """
                SELECT log_id, start_lat as lat, start_lon as lon, 'start' as type FROM trips WHERE start_lat IS NOT NULL
                UNION ALL
                SELECT log_id, end_lat as lat, end_lon as lon, 'end' as type FROM trips WHERE end_lat IS NOT NULL
            """
            points = db.fetch_all(query)
            
            # 2. Cluster them
            clusters = self._cluster_points(points, fuzziness_meters)
            
            # 3. Update DB
            # We'll need to disable FK checks to truncate waypoints if tracks reference them
            # Actually, standard practice:
            # - Create new waypoints
            # - Update tracks
            # - Delete unused waypoints?
            # User previously asked for "Regenerate", so let's wipe and rebuild.
            
            cursor = db.connection.cursor()
            cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
            cursor.execute("TRUNCATE TABLE waypoints")
            cursor.execute("UPDATE tracks SET start_waypoint_id = NULL, end_waypoint_id = NULL")
            
            waypoint_inserts = []
            track_updates = [] # List of (waypoint_id, log_id) to update start/end
            
            # Since we need the ID of the inserted waypoint to update tracks,
            # we should iterate and insert one by one or use last_insert_id logic carefully.
            # Simple loop is safer and fast enough for <10k points.
            
            processed_count = 0
            
            for idx, cluster in enumerate(clusters):
                # Filter noise if requested (points that don't belong to a valid cluster)
                # But for tracks to be valid, they NEED a start/end waypoint.
                # So we should probably create a waypoint even for singletons, 
                # unless min_cluster_size is strictly for "named locations".
                # Let's persist ALL clusters, so every track has endpoints. 
                # The user's "min size" on frontend was visual filter.
                
                # Insert Waypoint
                center = cluster['center']
                insert_wp = "INSERT INTO waypoints (latitude, longitude, name) VALUES (%s, %s, %s)"
                cursor.execute(insert_wp, (center['lat'], center['lon'], f"Location {idx+1}"))
                new_wp_id = cursor.lastrowid
                
                # Prepare track updates
                for p in cluster['points']:
                    log_id = p['log_id']
                    pt_type = p['type'] # 'start' or 'end'
                    
                    if pt_type == 'start':
                        cursor.execute("UPDATE tracks SET start_waypoint_id = %s WHERE source_log_id = %s", (new_wp_id, log_id))
                    else:
                        cursor.execute("UPDATE tracks SET end_waypoint_id = %s WHERE source_log_id = %s", (new_wp_id, log_id))
                
                processed_count += 1

            cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
            db.connection.commit()
            return processed_count
            
        except Exception as e:
            db.connection.rollback()
            raise e
        finally:
            db.close()
