const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\thanu\\.gemini\\antigravity-ide\\brain\\2015c562-4a66-4c99-b6a4-89664aab9d08';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BROWSER_PATH = fs.existsSync(CHROME_PATH) ? CHROME_PATH : EDGE_PATH;

async function run() {
  console.log('Starting verification with browser:', BROWSER_PATH);
  const browser = await puppeteer.launch({
    executablePath: BROWSER_PATH,
    headless: 'new',
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  console.log('Navigating to frontend at http://127.0.0.1:5173...');
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle0', timeout: 30000 });

  // Clear any existing session to ensure we are on auth screen
  const logoutBtn = await page.$('#btn-sidebar-logout');
  if (logoutBtn) {
    console.log('Clearing existing session...');
    await logoutBtn.click();
    await page.waitForSelector('#auth-card', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 800));
  }

  await page.waitForSelector('#auth-card', { visible: true });
  await page.waitForSelector('#btn-google-auth', { visible: true });

  console.log('STEP 1: Verifying that clicking "Continue with Google" without a real Client ID DOES NOT log in...');
  await page.click('#btn-google-auth');

  // Verify that the Google Setup Modal opens and we did NOT log into the dashboard
  await page.waitForSelector('#input-google-client-id', { visible: true, timeout: 5000 });
  const isDashboardPresent = (await page.$('#btn-sidebar-logout')) !== null;
  console.log('Is dashboard present (must be false):', isDashboardPresent);
  if (isDashboardPresent) {
    throw new Error('FAILED: Clicked Google button without valid client ID and user was logged in!');
  }

  console.log('Capturing screenshot of Google Setup / Client ID Requirement Modal...');
  const setupModalPath = path.join(ARTIFACT_DIR, 'google_setup_required_modal.png');
  await page.screenshot({ path: setupModalPath });
  console.log('Saved:', setupModalPath);

  // Close the setup modal
  console.log('Closing setup modal...');
  await page.click('#btn-close-google-config');
  await new Promise(r => setTimeout(r, 500));

  console.log('STEP 2: Verifying standard Email/Password authentication continues working perfectly...');
  const testEmail = `real.auth.test_${Date.now()}@churnguard.io`;
  const testPass = 'Enterprise2026!';

  await page.click('#tab-signup');
  await new Promise(r => setTimeout(r, 500));

  await page.type('#input-name', 'Quality Assurance');
  await page.type('#input-email', testEmail);
  await page.type('#input-password', testPass);
  await page.type('#input-confirm-password', testPass);
  await page.click('#btn-submit-auth');

  await page.waitForSelector('#btn-sidebar-logout', { timeout: 15000 });
  console.log('Standard registration succeeded! Dashboard reached.');

  const dashPath = path.join(ARTIFACT_DIR, 'email_session_verified.png');
  await page.screenshot({ path: dashPath });
  console.log('Saved:', dashPath);

  console.log('SUCCESS: Zero fake Google logins occur, real Google setup guidance is active, and email/password flow works.');
  await browser.close();
}

run().catch(err => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
