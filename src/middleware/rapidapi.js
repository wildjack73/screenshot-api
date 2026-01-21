/**
 * RapidAPI Authentication Middleware
 * Validates requests coming from RapidAPI
 */

const RAPIDAPI_PROXY_SECRET = process.env.RAPIDAPI_PROXY_SECRET;

/**
 * Middleware to authenticate RapidAPI requests
 * RapidAPI sends these headers:
 * - X-RapidAPI-Proxy-Secret: Secret to verify request comes from RapidAPI
 * - X-RapidAPI-Key: User's subscription key
 * - X-RapidAPI-User: User's RapidAPI username
 * - X-RapidAPI-Subscription: Subscription level (BASIC, PRO, ULTRA, MEGA)
 */
function validateRapidAPI(req, res, next) {
  // Check if proxy secret is configured
  if (!RAPIDAPI_PROXY_SECRET) {
    console.error('RAPIDAPI_PROXY_SECRET not configured');
    return res.status(500).json({
      success: false,
      error: {
        code: 'CONFIG_ERROR',
        message: 'API not properly configured'
      }
    });
  }

  // Validate proxy secret (ensures request comes from RapidAPI)
  const proxySecret = req.headers['x-rapidapi-proxy-secret'];
  if (proxySecret !== RAPIDAPI_PROXY_SECRET) {
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
    key: req.headers['x-rapidapi-key'],
    user: req.headers['x-rapidapi-user'],
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
