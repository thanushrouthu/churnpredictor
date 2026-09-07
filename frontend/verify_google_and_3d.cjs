const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\thanu\\.gemini\\antigravity-ide\\brain\\2015c562-4a66-4c99-b6a4-89664aab9d08';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const BROWSER_PATH = fs.existsSync(CHROME_PATH) ? CHROME_PATH : EDGE_PATH;

async function run() {
  console.log('Launching browser with executable:', BROWSER_PATH);
  const browser = await puppeteer.launch({
    executablePath: BROWSER_PATH,
    headless: 'new',
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Listen to console
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('PAGE ERROR:', msg.text());
    }
  });

  console.log('Navigating to http://127.0.0.1:5173...');
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle0', timeout: 30000 });

  // If already logged in from previous session, log out first
  const logoutBtn = await page.$('#btn-sidebar-logout');
  if (logoutBtn) {
    console.log('Session currently active. Logging out to reach auth page...');
    await logoutBtn.click();
    await page.waitForSelector('#auth-card', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 1000));
  }

  // Verify Auth Card and Google Button
  console.log('Checking Auth Card and Google Auth Button elements...');
  await page.waitForSelector('#auth-card', { visible: true });
  await page.waitForSelector('#btn-google-auth', { visible: true });

  // 1. Capture initial Sign In state with Google Button
  console.log('Capturing initial auth page with Google button...');
  await new Promise(r => setTimeout(r, 800)); // wait for entrance animation
  const initialPath = path.join(ARTIFACT_DIR, 'google_auth_card_initial.png');
  await page.screenshot({ path: initialPath });
  console.log('Saved:', initialPath);

  // 2. Test 3D Mouse Parallax Tilt
  console.log('Testing 3D parallax mouse tilt...');
  const cardBox = await page.$eval('#auth-card', el => {
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  });

  // Move mouse to top-right corner to tilt card
  await page.mouse.move(cardBox.x + 350, cardBox.y - 250, { steps: 25 });
  await new Promise(r => setTimeout(r, 500));

  const tiltTransform = await page.$eval('#auth-card', el => el.style.transform);
  console.log('Active 3D Transform:', tiltTransform);

  const tiltedPath = path.join(ARTIFACT_DIR, 'google_auth_card_tilted.png');
  await page.screenshot({ path: tiltedPath });
  console.log('Saved:', tiltedPath);

  // 3. Test Card Flip to Create Account
  console.log('Testing 3D Card Flip to Create Account...');
  await page.click('#tab-signup');
  await new Promise(r => setTimeout(r, 600));

  // Verify Name input exists
  await page.waitForSelector('#input-name', { visible: true });
  await page.waitForSelector('#btn-google-auth', { visible: true });

  const flipPath = path.join(ARTIFACT_DIR, 'create_account_flipped.png');
  await page.screenshot({ path: flipPath });
  console.log('Saved:', flipPath);

  // 4. Test Google Sign In Flow
  console.log('Triggering Google Sign In...');
  await page.click('#btn-google-auth');

  // Wait for redirect to dashboard
  await page.waitForSelector('#btn-sidebar-logout', { timeout: 15000 });
  console.log('Successfully authenticated with Google! Reached Dashboard.');

  await new Promise(r => setTimeout(r, 1200));
  const dashPath = path.join(ARTIFACT_DIR, 'google_auth_success_dashboard.png');
  await page.screenshot({ path: dashPath });
  console.log('Saved:', dashPath);

  // 5. Test Email/Password Regression Flow (Registration & Login)
  console.log('Logging out to test standard Email/Password authentication...');
  await page.click('#btn-sidebar-logout');
  await page.waitForSelector('#auth-card', { visible: true });

  // Test client-side validation shake on empty form
  console.log('Testing empty form validation...');
  await page.click('#btn-submit-auth');
  await new Promise(r => setTimeout(r, 500));
  const hasValidationErrors = await page.$$eval('.text-neutral-200', els => els.length > 0);
  console.log('Validation errors displayed on empty submit:', hasValidationErrors);

  // Switch to Create Account tab to register a verified regression user
  console.log('Testing Create Account tab with complete form registration...');
  await page.click('#tab-signup');
  await new Promise(r => setTimeout(r, 600));

  const testEmail = `enterprise.tester_${Date.now()}@churnguard.io`;
  const testPass = 'Enterprise2026!';

  await page.type('#input-name', 'Enterprise Tester');
  await page.type('#input-email', testEmail);
  await page.type('#input-password', testPass);
  await page.type('#input-confirm-password', testPass);

  console.log('Submitting new user registration...');
  await page.click('#btn-submit-auth');

  await page.waitForSelector('#btn-sidebar-logout', { timeout: 15000 });
  console.log('Successfully registered and logged in via Email/Password! Reached Dashboard.');

  await new Promise(r => setTimeout(r, 1000));
  const emailAuthPath = path.join(ARTIFACT_DIR, 'email_auth_regression.png');
  await page.screenshot({ path: emailAuthPath });
  console.log('Saved:', emailAuthPath);

  // Test login with the newly registered user
  console.log('Logging out to test Sign In with newly registered credentials...');
  await page.click('#btn-sidebar-logout');
  await page.waitForSelector('#auth-card', { visible: true });

  await page.type('#input-email', testEmail);
  await page.type('#input-password', testPass);
  await page.click('#btn-submit-auth');

  await page.waitForSelector('#btn-sidebar-logout', { timeout: 15000 });
  console.log('Successfully signed in with newly created email credentials! Verification complete.');

  console.log('All verifications completed successfully!');
  await browser.close();
}

run().catch(err => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
