-- Commit: create matched_segments table for OSRM integration

CREATE TABLE IF NOT EXISTS matched_segments (
    segment_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    log_id INT NOT NULL,
    osm_way_id BIGINT,
    osm_name VARCHAR(255),
    start_idx INT NOT NULL,
    end_idx INT NOT NULL,
    distance_meters FLOAT,
    duration_seconds FLOAT,
    fuel_consumed_gal FLOAT,
    
    FOREIGN KEY (log_id) REFERENCES log_index(log_id) ON DELETE CASCADE,
    INDEX idx_osm_way (osm_way_id),
    INDEX idx_log_osm (log_id, osm_way_id)
) ENGINE=InnoDB;
