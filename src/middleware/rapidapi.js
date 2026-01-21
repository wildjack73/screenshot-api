/**
 * RapidAPI Authentication Middleware
 * Validates requests coming from RapidAPI
 *
 * RapidAPI headers:
 * - X-RapidAPI-Key: User's API key (required)
 * - X-RapidAPI-Host: Your API's host on RapidAPI (required)
 * - X-RapidAPI-User: User's RapidAPI username
 * - X-RapidAPI-Subscription: Subscription level (BASIC, PRO, ULTRA, MEGA)
 * - X-RapidAPI-Proxy-Secret: Optional secret to verify request comes from RapidAPI
 */

const RAPIDAPI_PROXY_SECRET = process.env.RAPIDAPI_PROXY_SECRET;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST; // e.g., "screenshot-api.p.rapidapi.com"

/**
 * Middleware to authenticate RapidAPI requests
 */
function validateRapidAPI(req, res, next) {
  const rapidApiKey = req.headers['x-rapidapi-key'];
  const rapidApiHost = req.headers['x-rapidapi-host'];
  const proxySecret = req.headers['x-rapidapi-proxy-secret'];

  // Check for required RapidAPI headers
  if (!rapidApiKey) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing X-RapidAPI-Key header. Subscribe to this API on RapidAPI.'
      }
    });
  }

  if (!rapidApiHost) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing X-RapidAPI-Host header. Requests must come through RapidAPI.'
      }
    });
  }

  // Validate host matches (if configured)
  if (RAPIDAPI_HOST && rapidApiHost !== RAPIDAPI_HOST) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Invalid X-RapidAPI-Host header.'
      }
    });
  }

  // Validate proxy secret if configured (extra security layer)
  if (RAPIDAPI_PROXY_SECRET && proxySecret !== RAPIDAPI_PROXY_SECRET) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Invalid proxy secret. Requests must come through RapidAPI.'
      }
    });
  }

  // Extract RapidAPI user info for logging/analytics
  req.rapidapi = {
    key: rapidApiKey,
    host: rapidApiHost,
    user: req.headers['x-rapidapi-user'] || 'unknown',
    subscription: req.headers['x-rapidapi-subscription'] || 'BASIC'
  };

  next();
}

/**
 * Get rate limits based on subscription level
 * These are informational - RapidAPI handles actual enforcement
 */
function getSubscriptionLimits(subscription) {
  const limits = {
    BASIC: { requestsPerMonth: 100, maxViewportWidth: 1920, maxViewportHeight: 1080 },
    PRO: { requestsPerMonth: 1000, maxViewportWidth: 2560, maxViewportHeight: 1440 },
    ULTRA: { requestsPerMonth: 10000, maxViewportWidth: 3000, maxViewportHeight: 3000 },
    MEGA: { requestsPerMonth: 100000, maxViewportWidth: 3000, maxViewportHeight: 3000 }
  };
  return limits[subscription] || limits.BASIC;
}

/**
 * Add RapidAPI response headers
 */
function addRapidAPIHeaders(res, subscription) {
  const limits = getSubscriptionLimits(subscription);
  res.set('X-RateLimit-Limit', limits.requestsPerMonth.toString());
}

module.exports = {
  validateRapidAPI,
  getSubscriptionLimits,
  addRapidAPIHeaders
};
