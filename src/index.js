/**
 * Screenshot API - Main entry point
 * Simple HTTP API for capturing web page screenshots
 *
 * Endpoints:
 * - GET /screenshot - Simple endpoint (no auth)
 * - GET /v1/screenshot - RapidAPI endpoint (requires auth)
 * - GET /health - Health check
 */

const express = require('express');
const { validateUrl, validateViewport, isFullPage } = require('./validator');
const { captureScreenshot } = require('./screenshot');
const { validateRapidAPI, addRapidAPIHeaders, getSubscriptionLimits } = require('./middleware/rapidapi');

const app = express();
const PORT = process.env.PORT || 3000;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// ============================================
// SIMPLE ENDPOINT (your personal use, no auth)
// ============================================
app.get('/screenshot', async (req, res) => {
  const { url, fullPage, w, h } = req.query;

  // Validate URL
  const urlValidation = validateUrl(url);
  if (!urlValidation.valid) {
    return res.status(400).json({ error: urlValidation.error });
  }

  // Validate viewport dimensions
  const viewport = validateViewport(w, h);

  // Check fullPage option
  const captureFullPage = isFullPage(fullPage);

  try {
    // Capture the screenshot
    const screenshot = await captureScreenshot(urlValidation.url, {
      width: viewport.width,
      height: viewport.height,
      fullPage: captureFullPage,
    });

    // Send the PNG image
    res.set('Content-Type', 'image/png');
    res.send(screenshot);
  } catch (error) {
    console.error('Screenshot capture failed:', error.message, error.stack);
    res.status(500).json({ error: 'Screenshot capture failed', details: error.message });
  }
});

// ============================================
// RAPIDAPI ENDPOINT (authenticated, standardized)
// ============================================
app.get('/v1/screenshot', validateRapidAPI, async (req, res) => {
  const { url, full_page, width, height, format } = req.query;
  const subscription = req.rapidapi.subscription;

  // Add RapidAPI headers
  addRapidAPIHeaders(res, subscription);

  // Validate URL
  const urlValidation = validateUrl(url);
  if (!urlValidation.valid) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_URL',
        message: urlValidation.error
      }
    });
  }

  // Get subscription limits
  const limits = getSubscriptionLimits(subscription);

  // Validate viewport with subscription limits
  let w = parseInt(width, 10) || 1366;
  let h = parseInt(height, 10) || 768;

  // Clamp to subscription limits
  w = Math.max(200, Math.min(limits.maxViewportWidth, w));
  h = Math.max(200, Math.min(limits.maxViewportHeight, h));

  // Check fullPage option
  const captureFullPage = full_page === 'true' || full_page === '1';

  // Validate format (only PNG for now)
  if (format && format !== 'png') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_FORMAT',
        message: 'Only PNG format is supported'
      }
    });
  }

  try {
    const startTime = Date.now();

    // Capture the screenshot
    const screenshot = await captureScreenshot(urlValidation.url, {
      width: w,
      height: h,
      fullPage: captureFullPage,
    });

    const duration = Date.now() - startTime;

    // Log for analytics
    console.log(`[RapidAPI] User: ${req.rapidapi.user}, Subscription: ${subscription}, URL: ${urlValidation.url}, Duration: ${duration}ms`);

    // Send the PNG image
    res.set('Content-Type', 'image/png');
    res.set('X-Screenshot-Width', w.toString());
    res.set('X-Screenshot-Height', h.toString());
    res.set('X-Screenshot-FullPage', captureFullPage.toString());
    res.set('X-Processing-Time', `${duration}ms`);
    res.send(screenshot);

  } catch (error) {
    console.error(`[RapidAPI] Screenshot failed for ${req.rapidapi.user}:`, error.message);

    // Determine error type
    let code = 'CAPTURE_FAILED';
    let status = 500;

    if (error.message.includes('timeout') || error.message.includes('Timeout')) {
      code = 'TIMEOUT';
      status = 504;
    } else if (error.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
      code = 'DOMAIN_NOT_FOUND';
      status = 400;
    } else if (error.message.includes('net::ERR_CONNECTION_REFUSED')) {
      code = 'CONNECTION_REFUSED';
      status = 400;
    }

    res.status(status).json({
      success: false,
      error: {
        code,
        message: 'Failed to capture screenshot',
        details: error.message
      }
    });
  }
});

// API info endpoint for RapidAPI
app.get('/v1/info', validateRapidAPI, (req, res) => {
  const subscription = req.rapidapi.subscription;
  const limits = getSubscriptionLimits(subscription);

  res.json({
    success: true,
    data: {
      version: '1.0.0',
      subscription: subscription,
      limits: {
        maxViewportWidth: limits.maxViewportWidth,
        maxViewportHeight: limits.maxViewportHeight,
        requestsPerMonth: limits.requestsPerMonth
      },
      supportedFormats: ['png'],
      endpoints: [
        {
          path: '/v1/screenshot',
          method: 'GET',
          description: 'Capture a screenshot of a web page',
          parameters: [
            { name: 'url', required: true, description: 'URL to capture (http or https)' },
            { name: 'width', required: false, default: 1366, description: 'Viewport width (200-3000)' },
            { name: 'height', required: false, default: 768, description: 'Viewport height (200-3000)' },
            { name: 'full_page', required: false, default: false, description: 'Capture full page (true/false)' },
            { name: 'format', required: false, default: 'png', description: 'Output format (png only)' }
          ]
        },
        {
          path: '/v1/info',
          method: 'GET',
          description: 'Get API information and your subscription limits'
        }
      ]
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Screenshot API running on port ${PORT}`);
});
