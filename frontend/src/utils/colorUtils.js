// Color palette for chart lines
export const CHART_COLORS = {
  red: '#FF4D4D',
  green: '#00E676',
  blue: '#38BDF8',
  orange: '#F59E0B',
  purple: '#A78BFA',
  pink: '#F472B6',
  yellow: '#FACC15',
  cyan: '#22D3EE',
  indigo: '#818CF8',
  teal: '#2DD4BF'
};

// Map specific PIDs to consistent color families
const PID_COLOR_MAP = {
  // Speed related - Blues/Cyans
  'vehicle_speed': CHART_COLORS.blue,
  'gps_speed': CHART_COLORS.cyan,
  
  // Engine/RPM - Reds/Oranges
  'engine_rpm': CHART_COLORS.red,
  'calculated_load_value': CHART_COLORS.orange,
  'absolute_throttle_position': CHART_COLORS.yellow,
  
  // Temperature - Greens/Teals
  'engine_coolant_temperature': CHART_COLORS.green,
  'intake_air_temperature': CHART_COLORS.teal,
  
  // Fuel/Efficiency - Purples/Pinks
  'instant_fuel_economy': CHART_COLORS.purple,
  'long_term_fuel___trim___bank_1': CHART_COLORS.pink,
  'short_term_fuel___trim___bank_1': CHART_COLORS.indigo
};

const FALLBACK_COLORS = Object.values(CHART_COLORS);

/**
 * Returns a consistent color for a given PID name.
 * @param {string} pid - The PID name (e.g., 'engine_rpm')
 * @param {number} index - Optional index for fallback rotation
 * @returns {string} Hex color code
 */
export const getPidColor = (pid, index = 0) => {
  if (!pid) return '#9CA3AF'; // Gray for null/undefined
  
  // Normalize PID name for lookup
  const normalizedPid = pid.toLowerCase().replace(/\s+/g, '_');
  
  // Check predefined map
  if (PID_COLOR_MAP[normalizedPid]) {
    return PID_COLOR_MAP[normalizedPid];
  }
  
  // Fallback to rotation based on string hash or index
  if (typeof index === 'number') {
    return FALLBACK_COLORS[index % FALLBACK_COLORS.length];
  }
  
  // Simple hash for consistency if no index provided
  let hash = 0;
  for (let i = 0; i < pid.length; i++) {
    hash = pid.charCodeAt(i) + ((hash << 5) - hash);
  }
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
};
