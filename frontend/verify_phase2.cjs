const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\thanu\\.gemini\\antigravity-ide\\brain\\2015c562-4a66-4c99-b6a4-89664aab9d08';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BROWSER_PATH = fs.existsSync(CHROME_PATH) ? CHROME_PATH : EDGE_PATH;

async function verifyPhase2() {
  console.log('--- STARTING PHASE 2 VERIFICATION ---');
  const browser = await puppeteer.launch({
    executablePath: BROWSER_PATH,
    headless: 'new',
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon')) {
      consoleErrors.push(msg.text());
    }
  });

  console.log('STEP 1: Testing unauthenticated guard on /tasks...');
  // Ensure cookies and storage cleared
  await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'networkidle0' });
  const client = await page.target().createCDPSession();
  await client.send('Network.clearBrowserCookies');
  await page.evaluate(() => localStorage.clear());

  // Try direct navigation to /tasks
  await page.goto('http://127.0.0.1:5173/tasks', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  let currentUrl = page.url();
  console.log('URL after attempting /tasks while logged out:', currentUrl);
  if (!currentUrl.includes('/login')) {
    throw new Error(`Auth guard failed: expected redirect to /login, got ${currentUrl}`);
  }
  let hasSidebar = (await page.$('#enterprise-sidebar')) !== null;
  if (hasSidebar) {
    throw new Error('Auth guard failed: dashboard content leaked/rendered while unauthenticated!');
  }

  console.log('STEP 2: Testing unauthenticated guard on /employees...');
  await page.goto('http://127.0.0.1:5173/employees', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));
  currentUrl = page.url();
  console.log('URL after attempting /employees while logged out:', currentUrl);
  if (!currentUrl.includes('/login')) {
    throw new Error(`Auth guard failed on /employees: expected /login, got ${currentUrl}`);
  }

  console.log('STEP 3: Testing unauthenticated guard on /analysis...');
  await page.goto('http://127.0.0.1:5173/analysis', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));
  currentUrl = page.url();
  console.log('URL after attempting /analysis while logged out:', currentUrl);
  if (!currentUrl.includes('/login')) {
    throw new Error(`Auth guard failed on /analysis: expected /login, got ${currentUrl}`);
  }

  console.log('STEP 4: Testing unauthenticated guard on /overview...');
  await page.goto('http://127.0.0.1:5173/overview', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));
  currentUrl = page.url();
  console.log('URL after attempting /overview while logged out:', currentUrl);
  if (!currentUrl.includes('/login')) {
    throw new Error(`Auth guard failed on /overview: expected /login, got ${currentUrl}`);
  }

  const unauthPath = path.join(ARTIFACT_DIR, 'phase2_unauthenticated_guard_redirect.png');
  await page.screenshot({ path: unauthPath });
  console.log('Saved unauthenticated guard screenshot:', unauthPath);

  console.log('STEP 5: Authenticating with credentials...');
  await page.waitForSelector('#input-email', { visible: true });
  await page.type('#input-email', 'demo.analyst@company.com');
  await page.type('#input-password', 'SecurePassword2026!');
  await page.click('#btn-submit-auth');

  await page.waitForSelector('#enterprise-sidebar', { timeout: 15000 });
  console.log('Login successful, dashboard layout rendered.');

  console.log('STEP 6: Navigating to /tasks while logged in...');
  await page.goto('http://127.0.0.1:5173/tasks', { waitUntil: 'networkidle0' });
  await page.waitForSelector('#enterprise-sidebar', { visible: true });
  console.log('Reached /tasks. Now testing HARD PAGE REFRESH...');

  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('#enterprise-sidebar', { visible: true, timeout: 10000 });
  const onTasksPostReload = page.url().includes('/tasks');
  console.log('Successfully reloaded on /tasks without losing session! URL:', page.url());
  if (!onTasksPostReload) {
    throw new Error('Hard reload on /tasks redirected away unexpectedly!');
  }

  console.log('STEP 7: Navigating to /employees and testing HARD REFRESH...');
  await page.goto('http://127.0.0.1:5173/employees', { waitUntil: 'networkidle0' });
  await page.waitForSelector('#enterprise-sidebar', { visible: true });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('#enterprise-sidebar', { visible: true, timeout: 10000 });
  console.log('Successfully reloaded on /employees! URL:', page.url());

  console.log('STEP 8: Navigating to /overview and testing HARD REFRESH...');
  await page.goto('http://127.0.0.1:5173/overview', { waitUntil: 'networkidle0' });
  await page.waitForSelector('#enterprise-sidebar', { visible: true });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('#enterprise-sidebar', { visible: true, timeout: 10000 });
  console.log('Successfully reloaded on /overview! URL:', page.url());

  const authPostReloadPath = path.join(ARTIFACT_DIR, 'phase2_hard_refresh_session_verified.png');
  await page.screenshot({ path: authPostReloadPath });
  console.log('Saved authenticated hard refresh screenshot:', authPostReloadPath);

  console.log('Console errors encountered:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.warn('Console error details:', consoleErrors);
  }

  console.log('--- PHASE 2 VERIFICATION COMPLETED SUCCESSFULLY ---');
  await browser.close();
}

verifyPhase2().catch(err => {
  console.error('Phase 2 Verification failed:', err);
  process.exit(1);
});
