# --- VERSION 1.0.0 ---
# - GPX XML generation utility
# - Supports exporting GPS coordinates, timestamps, and custom PID extensions

import xml.etree.ElementTree as ET
from datetime import datetime, timedelta

def generate_gpx(log_id, log_name, data_rows):
    """
    Converts log data rows into a standard GPX XML string.
    Each row expected to have 'latitude', 'longitude', 'timestamp', and optional PIDs.
    """
    # GPX Root
    gpx = ET.Element("gpx", {
        "version": "1.1",
        "creator": "JeepLogProcessor",
        "xmlns": "http://www.topografix.com/GPX/1/1",
        "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
        "xsi:schemaLocation": "http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd"
    })

    # Metadata
    metadata = ET.SubElement(gpx, "metadata")
    ET.SubElement(metadata, "name").text = log_name
    ET.SubElement(metadata, "desc").text = f"Exported from Jeep Diagnostics Dashboard - Log {log_id}"
    ET.SubElement(metadata, "time").text = datetime.now().isoformat()

    # Track
    trk = ET.SubElement(gpx, "trk")
    ET.SubElement(trk, "name").text = log_name
    trkseg = ET.SubElement(trk, "trkseg")

    for row in data_rows:
        lat = row.get('latitude')
        lon = row.get('longitude')
        ts = row.get('timestamp')
        
        if lat is None or lon is None:
            continue

        # Track point
        trkpt = ET.SubElement(trkseg, "trkpt", {
            "lat": str(lat),
            "lon": str(lon)
        })

        # Elevation if available
        if 'altitude' in row and row['altitude'] is not None:
            ET.SubElement(trkpt, "ele").text = str(row['altitude'])

        # Time
        if ts:
            # Handle numeric timestamp (ms) or ISO string
            if isinstance(ts, (int, float)):
                dt = datetime.fromtimestamp(ts / 1000.0)
                ET.SubElement(trkpt, "time").text = dt.isoformat() + "Z"
            else:
                ET.SubElement(trkpt, "time").text = str(ts)

        # Extensions for OBD data
        extensions = ET.SubElement(trkpt, "extensions")
        for key, val in row.items():
            if key not in ['latitude', 'longitude', 'timestamp', 'altitude', 'row_time'] and val is not None:
                # Sanitize key for XML
                clean_key = key.replace(' ', '_').replace('(', '').replace(')', '').replace('%', 'pct')
                ET.SubElement(extensions, clean_key).text = str(val)

    return ET.tostring(gpx, encoding='unicode', method='xml')
