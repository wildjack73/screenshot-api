/**
 * Screenshot API - Main entry point
 * Simple HTTP API for capturing web page screenshots
 */

const express = require('express');
const { validateUrl, validateViewport, isFullPage } = require('./validator');
const { captureScreenshot } = require('./screenshot');

const app = express();
const PORT = process.env.PORT || 3000;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// Screenshot endpoint
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
    console.error('Screenshot capture failed:', error.message);
    res.status(500).json({ error: 'Screenshot capture failed' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Screenshot API running on port ${PORT}`);
});
