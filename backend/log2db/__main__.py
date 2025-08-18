# log2db/__main__.py

import os
import sys
import logging

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from db_credentials import DB_CONFIG
    from log2db.utils import setup_logging
    from log2db.db_manager import DatabaseManager
    from log2db.core import process_log_file
except ImportError as e:
    print(f"FATAL: A required file or module could not be imported: {e}", file=sys.stderr)
    sys.exit(1)

def main():
    """Main function to run the log processing."""
    logger = setup_logging()
    logger.info("==================================================")
    logger.info("      Jeep Log Processing Tool v0.8.6 Started     ")
    logger.info("==================================================")

    db_manager = None
    try:
        db_manager = DatabaseManager(DB_CONFIG)
        db_manager.ensure_base_tables_exist()

        log_directory = 'logs'
        if not os.path.isdir(log_directory):
            logger.critical(f"Log directory '{log_directory}' not found.")
            sys.exit(1)

        log_files = sorted([f for f in os.listdir(log_directory) if f.lower().endswith('.csv')])
        if not log_files:
            logger.warning("No CSV files found in the 'logs' directory.")
            return

        logger.info(f"Found {len(log_files)} CSV files to process in '{log_directory}'.")
        
        success_count, skipped_count, error_count = 0, 0, 0

        for file_name in log_files:
            file_path = os.path.join(log_directory, file_name)
            success, status = process_log_file(file_path, db_manager)
            if success:
                if status == "processed": success_count += 1
                else: skipped_count += 1
            else:
                error_count += 1
        
        logger.info("----------------- JOB COMPLETE -----------------")
        logger.info(f"Successfully Processed: {success_count}")
        logger.info(f"Skipped (already done): {skipped_count}")
        logger.info(f"Errors: {error_count}")
        logger.info("--------------------------------------------------")

    except Exception as e:
        logging.critical(f"An unhandled exception occurred: {e}", exc_info=True)
    finally:
        if db_manager:
            db_manager.close()
        logging.info("Program finished.")


if __name__ == "__main__":
    main()
