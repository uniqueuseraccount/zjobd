# FILE: backend/log2db/state_detector.py
#
# --- VERSION 1.4.0 ---
# - PERMANENT FIX: The PID lookup keys have been corrected to use underscores
#   (e.g., 'engine_rpm') to match the final sanitized names used throughout the
#   application. This reflects the user's correct debugging and ensures
#   consistency.
# -----------------------------

import logging

WARM_ENGINE_TEMP_F = 170
HIGH_LOAD_THRESHOLD = 70
HIGHWAY_SPEED_MPH = 50

def classify_operating_states(data_rows, pids):
	if not data_rows:
		return []

	# --- PERMANENT FIX: Use the correct, sanitized PID names for lookup ---
	rpm_pid = 'engine_rpm'
	speed_pid = 'vehicle_speed'
	load_pid = 'calculated_load_value'
	coolant_pid = 'engine_coolant_temperature'
	fuel_status_pid = 'fuel_system_1_status'

	available_pids = set(pids)
	if rpm_pid not in available_pids: rpm_pid = None
	if speed_pid not in available_pids: speed_pid = None
	if load_pid not in available_pids: load_pid = None
	if coolant_pid not in available_pids: coolant_pid = None
	if fuel_status_pid not in available_pids: fuel_status_pid = None
	
	logging.info(f"State detection using PIDs: FuelStatus='{fuel_status_pid}', RPM='{rpm_pid}', Speed='{speed_pid}'")

	for row in data_rows:
		state = 'Unknown'
		try:
			rpm = float(row.get(rpm_pid, 0)) if rpm_pid else 0
			speed = float(row.get(speed_pid, 0)) if speed_pid else 0
			load = float(row.get(load_pid, 0)) if load_pid else 0
			coolant_temp = float(row.get(coolant_pid, 180)) if coolant_pid else 180
			fuel_status = int(float(row.get(fuel_status_pid, 0))) if fuel_status_pid else 0

			if fuel_status == 0 or rpm == 0:
				state = 'Engine Off'
			elif fuel_status == 1:
				state = 'Open Loop (Cold Start)'
			elif fuel_status == 2:
				if speed == 0: state = 'Closed Loop (Idle)'
				elif speed >= HIGHWAY_SPEED_MPH: state = 'Closed Loop (Highway)'
				else: state = 'Closed Loop (City)'
			elif fuel_status == 4:
				if speed == 0: state = 'Open Loop (Idle)'
				elif load > HIGH_LOAD_THRESHOLD: state = 'Open Loop (WOT Accel)'
				else: state = 'Open Loop (Decel Fuel Cut)'
			elif fuel_status == 8: state = 'FAULT - Open Loop'
			elif fuel_status == 16: state = 'FAULT - Closed Loop'

			if coolant_temp < WARM_ENGINE_TEMP_F and rpm > 0 and state != 'Open Loop (Cold Start)':
				state = f"{state} (Warm-up)"
		except (ValueError, TypeError):
			state = 'Unknown (Err)'
		
		row['operating_state'] = state
		
	return data_rows