// In frontend/src/colorUtils.js

/**
 * Converts a hex color string to an RGB object.
 */
function hexToRgb(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

/**
 * Converts an RGB color object to a hex string.
 */
function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/**
 * Darkens a color by a given percentage (0-1).
 */
function darkenColor(color, percent) {
    let rgb = hexToRgb(color);
    if (!rgb) return color;

    rgb.r = Math.floor(rgb.r * (1 - percent));
    rgb.g = Math.floor(rgb.g * (1 - percent));
    rgb.b = Math.floor(rgb.b * (1 - percent));

    return rgbToHex(rgb.r, rgb.g, rgb.b);
}

/**
 * Generates a gradient of colors between a start and end color.
 * @param {string} startColorHex - The starting color in hex.
 * @param {string} endColorHex - The ending color in hex.
 * @param {number} steps - The number of colors to generate.
 * @returns {string[]} An array of hex color strings.
 */
export function generateColorGradient(startColorHex, endColorHex, steps) {
    if (steps <= 1) return [startColorHex];
    const gradient = [];
    const start = hexToRgb(startColorHex);
    const end = hexToRgb(endColorHex);

    for (let i = 0; i < steps; i++) {
        const ratio = i / (steps - 1);
        const r = Math.round(start.r + ratio * (end.r - start.r));
        const g = Math.round(start.g + ratio * (end.g - start.g));
        const b = Math.round(start.b + ratio * (end.b - start.b));
        gradient.push(`rgb(${r},${g},${b})`);
    }
    return gradient;
}


/**
 * Generates a vibrant, distinct rainbow of colors.
 * @param {number} count - The number of colors to generate.
 * @returns {string[]} An array of hex color strings.
 */
export function generateRainbowColors(count) {
    const colors = [];
    for (let i = 0; i < count; i++) {
        const hue = (i * (360 / count)) % 360;
        colors.push(`hsl(${hue}, 85%, 50%)`);
    }
    return colors;
}