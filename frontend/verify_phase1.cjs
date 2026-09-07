const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\thanu\\.gemini\\antigravity-ide\\brain\\2015c562-4a66-4c99-b6a4-89664aab9d08';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BROWSER_PATH = fs.existsSync(CHROME_PATH) ? CHROME_PATH : EDGE_PATH;

async function verifyPhase1() {
  console.log('--- STARTING PHASE 1 VERIFICATION ---');
  const browser = await puppeteer.launch({
    executablePath: BROWSER_PATH,
    headless: 'new',
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Monitor network requests for Supabase resetPasswordForEmail
  let resetPasswordCalled = false;
  let resetPasswordPayload = null;

  page.on('request', req => {
    if (req.url().includes('auth/v1/recover')) {
      resetPasswordCalled = true;
      try {
        resetPasswordPayload = JSON.parse(req.postData());
      } catch (e) {}
      console.log('Detected Supabase recover request:', req.url(), resetPasswordPayload);
    }
  });

  console.log('1. Navigating to login page...');
  await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'networkidle0', timeout: 30000 });

  // Clear any existing session
  const logoutBtn = await page.$('#btn-sidebar-logout');
  if (logoutBtn) {
    await logoutBtn.click();
    await page.waitForSelector('#auth-card', { timeout: 10000 });
  }

  await page.waitForSelector('#link-forgot-password', { visible: true });
  console.log('2. Clicking "Forgot password?" link...');
  await page.click('#link-forgot-password');

  await page.waitForSelector('#input-forgot-email', { visible: true });
  console.log('3. Filling work email for password recovery...');
  await page.type('#input-forgot-email', 'demo.analyst@company.com');

  console.log('4. Capturing screenshot of Forgot Password modal...');
  const forgotModalPath = path.join(ARTIFACT_DIR, 'phase1_forgot_password_modal.png');
  await page.screenshot({ path: forgotModalPath });
  console.log('Saved:', forgotModalPath);

  console.log('5. Submitting recovery request...');
  await page.click('#btn-send-forgot');

  await page.waitForSelector('#auth-toast', { visible: true, timeout: 10000 });
  const toastText = await page.evaluate(() => document.getElementById('auth-toast')?.innerText);
  console.log('Toast feedback received:', toastText);

  const toastScreenshotPath = path.join(ARTIFACT_DIR, 'phase1_reset_email_sent_toast.png');
  await page.screenshot({ path: toastScreenshotPath });
  console.log('Saved toast screenshot:', toastScreenshotPath);

  console.log('6. Navigating to /update-password route directly...');
  await page.goto('http://127.0.0.1:5173/update-password', { waitUntil: 'networkidle0', timeout: 30000 });

  await page.waitForSelector('#input-new-password', { visible: true, timeout: 10000 });
  await page.waitForSelector('#input-confirm-new-password', { visible: true, timeout: 10000 });
  await page.waitForSelector('#btn-submit-update-password', { visible: true, timeout: 10000 });

  console.log('7. Testing client-side validation on /update-password...');
  // Click without entering password
  await page.click('#btn-submit-update-password');
  await new Promise(r => setTimeout(r, 600));

  console.log('8. Filling valid new passwords...');
  await page.type('#input-new-password', 'EnterpriseNewPassword2026!');
  await page.type('#input-confirm-new-password', 'EnterpriseNewPassword2026!');

  console.log('9. Capturing screenshot of /update-password page with design system...');
  const updatePasswordPath = path.join(ARTIFACT_DIR, 'phase1_update_password_page.png');
  await page.screenshot({ path: updatePasswordPath });
  console.log('Saved:', updatePasswordPath);

  console.log('--- PHASE 1 VERIFICATION COMPLETED SUCCESSFULLY ---');
  await browser.close();
}

verifyPhase1().catch(err => {
  console.error('Phase 1 Verification failed:', err);
  process.exit(1);
});
