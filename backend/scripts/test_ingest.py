
import os
import sys
import logging
import re
from datetime import datetime
import pytz
import csv

# Add project root to sys.path to allow imports from backend
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, '..', '..'))
sys.path.append(os.path.join(project_root, 'backend'))

from log2db.utils import parse_start_timestamp
from log2db.core import find_header_row

# Setup basic logging to console
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

def test_ingest(file_path):
    if not os.path.exists(file_path):
        logging.error(f"File not found: {file_path}")
        return

    print("-" * 60)
    print(f"Testing ingestion for: {os.path.basename(file_path)}")
    print("-" * 60)

    # 1. Parse Timestamp
    ts = parse_start_timestamp(file_path)
    if ts:
        print(f"TIMESTAMP: OK ({ts}) -> {datetime.fromtimestamp(ts)}")
    else:
        print("TIMESTAMP: FAIL")

    # 2. Find Headers
    row_idx, headers = find_header_row(file_path)
    if headers:
        print(f"HEADERS: OK (Found at line {row_idx + 1})")
        print(f"COLUMNS: {len(headers)} columns found")
        # print(f"SAMPLE: {headers[:5]} ...")
    else:
        print("HEADERS: FAIL")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_ingest.py <path_to_csv>")
        sys.exit(1)
    
    test_ingest(sys.argv[1])
