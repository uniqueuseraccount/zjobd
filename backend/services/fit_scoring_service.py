# --- VERSION 1.0.0 ---
# - Initial implementation of Fit Scoring algorithm
# - Evaluates log comparability based on direction, time, season, and thermals
# - Uses logarithmic penalties for temporal differences

import math
import numpy as np
from datetime import datetime

class FitScoringService:
    def __init__(self, db_manager):
        self.db = db_manager

    def calculate_fit_score(self, target_meta, candidate_meta):
        """
        Calculates a 'fit score' (0-100) representing how comparable two logs are.
        
        target_meta/candidate_meta should contain:
        - start_time (datetime)
        - start_waypoint_id, end_waypoint_id (optional)
        - avg_iat, avg_coolant (optional)
        """
        score = 100
        penalties = []

        # 1. Direction Match (Critical)
        # If waypoints are known and don't match, it's likely a different route/direction
        if 'start_waypoint_id' in target_meta and 'start_waypoint_id' in candidate_meta:
            if target_meta['start_waypoint_id'] != candidate_meta['start_waypoint_id'] or \
               target_meta['end_waypoint_id'] != candidate_meta['end_waypoint_id']:
                score -= 50
                penalties.append("Direction/Route Mismatch")

        # 2. Time of Day (Circadian/Traffic similarity)
        t1 = target_meta['start_time']
        t2 = candidate_meta['start_time']
        
        # Difference in minutes from start of day
        m1 = t1.hour * 60 + t1.minute
        m2 = t2.hour * 60 + t2.minute
        time_diff = abs(m1 - m2)
        if time_diff > 720: # Handle wrap around (e.g. 11PM vs 1AM)
            time_diff = 1440 - time_diff
            
        # Logarithmic penalty: small diffs (up to 30m) are negligible
        # Large diffs (4h+) are significant
        if time_diff > 30:
            time_penalty = math.log2(time_diff / 30) * 5
            score -= min(25, time_penalty)
            penalties.append(f"Time Offset ({time_diff}m)")

        # 3. Day of Week (Weekend vs Weekday traffic patterns)
        if (t1.weekday() < 5 and t2.weekday() >= 5) or (t1.weekday() >= 5 and t2.weekday() < 5):
            score -= 10
            penalties.append("Weekday/Weekend Mix")

        # 4. Seasonal (Month)
        month_diff = abs(t1.month - t2.month)
        if month_diff > 6: month_diff = 12 - month_diff
        if month_diff > 1:
            score -= month_diff * 2
            penalties.append(f"Seasonal Diff ({month_diff}mo)")

        # 5. Operating Conditions (Thermals)
        # Higher IAT/Coolant changes engine behavior/density
        if 'avg_iat' in target_meta and 'avg_iat' in candidate_meta:
            iat_diff = abs(target_meta['avg_iat'] - candidate_meta['avg_iat'])
            if iat_diff > 10:
                score -= min(15, (iat_diff - 10) / 2)
                penalties.append(f"IAT Diff ({iat_diff}F)")

        return max(0, round(score, 1)), penalties

    def find_best_matches(self, target_log_id, limit=10):
        """Finds logs that are most comparable to the given log."""
        # 1. Get target metadata
        target = self.db.fetch_one("""
            SELECT li.*, t.start_waypoint_id, t.end_waypoint_id
            FROM log_index li
            LEFT JOIN tracks t ON li.log_id = t.log_id
            WHERE li.log_id = %s
        """, (target_log_id,))
        
        if not target: return []

        # 2. Fetch candidates (same route preferred)
        candidates = self.db.fetch_all("""
            SELECT li.*, t.start_waypoint_id, t.end_waypoint_id
            FROM log_index li
            LEFT JOIN tracks t ON li.log_id = t.log_id
            WHERE li.log_id != %s
            ORDER BY li.start_time DESC
            LIMIT 100
        """, (target_log_id,))

        results = []
        for cand in candidates:
            score, reasons = self.calculate_fit_score(target, cand)
            results.append({
                "log_id": cand['log_id'],
                "file_name": cand['file_name'],
                "score": score,
                "reasons": reasons
            })

        # Sort by score descending
        results.sort(key=lambda x: x['score'], reverse=True)
        return results[:limit]
