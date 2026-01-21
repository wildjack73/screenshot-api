/**
 * URL validation module with security rules
 */

const PRIVATE_IP_RANGES = [
  // 10.0.0.0 - 10.255.255.255
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  // 172.16.0.0 - 172.31.255.255
  /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/,
  // 192.168.0.0 - 192.168.255.255
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
  // 169.254.0.0 - 169.254.255.255 (link-local)
  /^169\.254\.\d{1,3}\.\d{1,3}$/,
  // 127.0.0.0 - 127.255.255.255 (loopback)
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
];

const BLOCKED_HOSTNAMES = ['localhost', '127.0.0.1', '::1', '[::1]'];

/**
 * Check if an IP address is private
 * @param {string} ip - IP address to check
 * @returns {boolean}
 */
function isPrivateIP(ip) {
  return PRIVATE_IP_RANGES.some((regex) => regex.test(ip));
}

/**
 * Validate and sanitize the URL parameter
 * @param {string} url - URL to validate
 * @returns {{ valid: boolean, error?: string, url?: string }}
 */
function validateUrl(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL parameter is required' };
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Check protocol
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return { valid: false, error: 'Only http and https protocols are allowed' };
  }

  // Check for blocked hostnames
  const hostname = parsedUrl.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    return { valid: false, error: 'localhost and loopback addresses are not allowed' };
  }

  // Check for private IPs
  if (isPrivateIP(hostname)) {
    return { valid: false, error: 'Private IP addresses are not allowed' };
  }

  // Check for IPv6 private addresses
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    const ipv6 = hostname.slice(1, -1);
    if (ipv6 === '::1' || ipv6.startsWith('fe80:') || ipv6.startsWith('fc') || ipv6.startsWith('fd')) {
      return { valid: false, error: 'Private IPv6 addresses are not allowed' };
    }
  }

  return { valid: true, url: parsedUrl.href };
}

/**
 * Validate and clamp viewport dimensions
 * @param {string|number} width - Viewport width
 * @param {string|number} height - Viewport height
 * @returns {{ width: number, height: number }}
 */
function validateViewport(width, height) {
  const MIN_SIZE = 200;
  const MAX_SIZE = 3000;
  const DEFAULT_WIDTH = 1366;
  const DEFAULT_HEIGHT = 768;

  let w = parseInt(width, 10);
  let h = parseInt(height, 10);

  // Use defaults if not provided or invalid
  if (isNaN(w)) w = DEFAULT_WIDTH;
  if (isNaN(h)) h = DEFAULT_HEIGHT;

  // Clamp to min/max
  w = Math.max(MIN_SIZE, Math.min(MAX_SIZE, w));
  h = Math.max(MIN_SIZE, Math.min(MAX_SIZE, h));

  return { width: w, height: h };
}

/**
 * Check if fullPage option is enabled
 * @param {string|boolean} value - fullPage parameter value
 * @returns {boolean}
 */
function isFullPage(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === 'boolean') return value;
  return value === 'true' || value === '1';
}

module.exports = {
  validateUrl,
  validateViewport,
  isFullPage,
};
