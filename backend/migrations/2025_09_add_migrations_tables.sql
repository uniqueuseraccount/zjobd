-- File: backend/migrations/2025_09_add_gpx_tables.sql
-- Version: 0.1.0.0 — Add GPX-compatible tables
-- Commit: create waypoints, tracks, track_segments

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

CREATE TABLE IF NOT EXISTS tracks (
  track_id            INT AUTO_INCREMENT PRIMARY KEY,
  source_log_id       INT UNIQUE,                             -- links back to log_index.log_id
  file_name           VARCHAR(255),
  start_time          DATETIME,                               -- ISO 8601 converted
  duration_seconds    FLOAT,
  column_ids_json     TEXT,
  start_waypoint_id   INT,
  end_waypoint_id     INT,
  bounds_json         JSON,                                   -- { minlat, minlon, maxlat, maxlon }
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_log_id)     REFERENCES log_index(log_id)     ON DELETE CASCADE,
  FOREIGN KEY (start_waypoint_id) REFERENCES waypoints(waypoint_id),
  FOREIGN KEY (end_waypoint_id)   REFERENCES waypoints(waypoint_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS track_segments (
  segment_id         INT AUTO_INCREMENT PRIMARY KEY,
  track_id           INT NOT NULL,
  segment_index      INT DEFAULT 1,                           -- order within track
  start_waypoint_id  INT,
  end_waypoint_id    INT,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (track_id)           REFERENCES tracks(track_id) ON DELETE CASCADE,
  FOREIGN KEY (start_waypoint_id)  REFERENCES waypoints(waypoint_id),
  FOREIGN KEY (end_waypoint_id)    REFERENCES waypoints(waypoint_id)
) ENGINE=InnoDB;
