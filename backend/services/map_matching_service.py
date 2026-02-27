
import requests
import logging
import json

class MapMatchingService:
    def __init__(self, osrm_base_url="http://osrm.mark-potter.com"):
        self.base_url = osrm_base_url
        self.logger = logging.getLogger(__name__)

    def match_trace(self, gps_points):
        """
        Takes a list of GPS points [{'lat': float, 'lon': float, 'time': datetime, 'idx': int}, ...]
        Returns a list of matched segments with OSM metadata.
        """
        if not gps_points:
            return []

        # OSRM expects: /match/v1/profile/coordinates?timestamps=...
        # Coordinates format: lon,lat;lon,lat
        # Timestamps: Unix timestamps (integer seconds)
        
        # OSRM has a URL length limit. For long trips, we might need to batch this?
        # Standard limit is often ~8k characters. A simplified approach is to sample points 
        # or split the request. Splitting match requests is tricky because it breaks continuity.
        # Let's try sending all points first, but maybe sample if > 100 points to keep URL short?
        # Better: OSRM match works best with high density. 
        # Let's just try to build the URL and see. 
        
        # Optimization: Take every Nth point if list is huge? 
        # For now, let's take every point.
        
        coords = []
        timestamps = []
        indices = []
        
        for p in gps_points:
            coords.append(f"{p['lon']},{p['lat']}")
            timestamps.append(str(int(p['time'].timestamp())))
            indices.append(p['idx'])
            
        coord_str = ";".join(coords)
        timestamp_str = ";".join(timestamps)
        
        url = f"{self.base_url}/match/v1/driving/{coord_str}"
        params = {
            "timestamps": timestamp_str,
            "geometries": "geojson",
            "overview": "full",
            "steps": "true",
            "annotations": "true" # Returns node/way IDs
        }
        
        try:
            # We use a session for potential keep-alive
            with requests.Session() as s:
                # Prepare request carefully to avoid URL encoding issues with huge strings if possible
                # But requests params are usually URL encoded.
                # If URL is too long, we might get 414 URI Too Long.
                # If so, we have to split.
                
                # Check approximate URL length
                if len(coord_str) > 6000:
                    self.logger.warning(f"Trace too long ({len(coord_str)} chars), sampling data...")
                    # Naive sampling to reduce size
                    step = len(gps_points) // 100 + 1
                    coords = coords[::step]
                    timestamps = timestamps[::step]
                    indices = indices[::step]
                    
                    coord_str = ";".join(coords)
                    timestamp_str = ";".join(timestamps)
                    url = f"{self.base_url}/match/v1/driving/{coord_str}"
                    params["timestamps"] = timestamp_str

                response = s.get(url, params=params, timeout=10)
                response.raise_for_status()
                
                data = response.json()
                if data['code'] != 'Ok':
                    self.logger.error(f"OSRM Match failed: {data.get('code')}")
                    return []
                
                # Parse matchings
                results = []
                
                for matching in data['matchings']:
                    # Each matching has legs
                    # We want to associate legs with the original log indices?
                    # The response gives us 'legs' which correspond to the segments between waypoints.
                    # Since we passed ALL points as waypoints, we get many small legs.
                    # But we also get 'tracepoints' which map input index to matched location.
                    
                    # We want the OSM Way IDs. 
                    # OSRM annotations=true returns:
                    # 'nodes': [ids...]
                    # 'datasources': [ids...] -> this maps to internal lua profiles, not OSM Way IDs directly usually?
                    # Wait, OSRM annotation 'nodes' returns OSM Node IDs.
                    # To get Way IDs, we usually need the 'steps' in 'legs'.
                    # Leg -> Step -> name, ref, etc.
                    
                    # Let's extract road names and approximate distances for now.
                    # Getting exact OSM Way ID usually requires a different query or analyzing 'annotations' if configured.
                    # Standard OSRM response 'legs' -> 'steps' contains 'name' and 'ref'.
                    # This is what we stored in the table as osm_name. osm_way_id might be 0 for now if unavailable.
                    
                    current_idx = 0
                    
                    for leg in matching['legs']:
                        # A leg connects two supplied coordinates.
                        # Since we supplied dense coords, these are short.
                        # We aggregate steps that have the same name/ref?
                        
                        # Better approach: Iterate steps inside the leg
                        for step in leg['steps']:
                            # A step is a "instruction" like "Turn right onto Main St".
                            # It has a distance, duration, name.
                            
                            seg_data = {
                                'osm_way_id': 0, # Placeholder, hard to get from standard OSRM API without custom lua
                                'name': step.get('name') or step.get('ref') or "Unnamed Road",
                                'start_idx': indices[0], # Rough approximation for the whole trip? No...
                                'end_idx': indices[-1],
                                'distance': step['distance'],
                                'duration': step['duration']
                            }
                            results.append(seg_data)
                
                # The above parsing is a bit naive because 'match' returns a clean path.
                # Let's just store the summarized unique road names for now, 
                # or simpler: 
                # Just return one giant segment for the whole match if we can't easily split it?
                # No, user wants "heatmap".
                # The 'matchings' object contains the full geometry.
                
                # REVISED PARSING for Heatmap:
                # We essentially just want the list of roads traversed.
                # steps gives us this.
                
                unique_segments = []
                for matching in data['matchings']:
                    for leg in matching['legs']:
                        for step in leg['steps']:
                            name = step.get('name') or step.get('ref')
                            if not name: continue
                            
                            # Deduplicate sequential segments with same name?
                            if unique_segments and unique_segments[-1]['name'] == name:
                                unique_segments[-1]['distance'] += step['distance']
                                unique_segments[-1]['duration'] += step['duration']
                                # Merging geometries is tricky without a library (shapely/geojson).
                                # For V1, let's NOT deduplicate if it means losing geometry accuracy,
                                # OR let's accept that we might have multiple rows for "I-35W".
                                # Actually, multiple rows is fine. Let's remove deduplication for now
                                # to ensure we capture every geometry snippet.
                                unique_segments.append({
                                    'osm_way_id': 0,
                                    'name': name,
                                    'start_idx': 0,
                                    'end_idx': 0,
                                    'distance': step['distance'],
                                    'duration': step['duration'],
                                    'geometry': json.dumps(step['geometry'])
                                })
                            else:
                                unique_segments.append({
                                    'osm_way_id': 0,
                                    'name': name,
                                    'start_idx': 0, 
                                    'end_idx': 0,
                                    'distance': step['distance'],
                                    'duration': step['duration'],
                                    'geometry': json.dumps(step['geometry'])
                                })
                                
                return unique_segments

        except Exception as e:
            self.logger.error(f"Request to OSRM failed: {e}")
            return []
