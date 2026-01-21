/**
 * Screenshot capture module using Playwright
 */

const { chromium } = require('playwright');

const NAVIGATION_TIMEOUT = 30000; // 30 seconds
const SCREENSHOT_TIMEOUT = 30000; // 30 seconds

/**
 * Capture a screenshot of the given URL
 * @param {string} url - URL to capture
 * @param {object} options - Screenshot options
 * @param {number} options.width - Viewport width
 * @param {number} options.height - Viewport height
 * @param {boolean} options.fullPage - Capture full page or just viewport
 * @returns {Promise<Buffer>} PNG image buffer
 */
async function captureScreenshot(url, { width, height, fullPage }) {
  let browser = null;

  try {
    // Launch browser with container-compatible flags
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    });

    const context = await browser.newContext({
      viewport: { width, height },
    });

    const page = await context.newPage();

    // Set navigation timeout
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);
    page.setDefaultTimeout(SCREENSHOT_TIMEOUT);

    // Navigate to the URL and wait for network to be idle
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: NAVIGATION_TIMEOUT,
    });

    // Take the screenshot
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: fullPage,
      timeout: SCREENSHOT_TIMEOUT,
    });

    return screenshot;
  } finally {
    // Always close the browser
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = {
  captureScreenshot,
};
