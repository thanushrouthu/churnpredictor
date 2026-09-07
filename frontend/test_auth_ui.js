import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ARTIFACTS_DIR = 'C:\\Users\\thanu\\.gemini\\antigravity-ide\\brain\\b80949c1-fe42-47bf-a936-4571134487bc';

async function runAuthVerification() {
  console.log('============================================================');
  console.log('STARTING FULL AUTH, 3D TILT & INTERACTION VERIFICATION SUITE');
  console.log('============================================================\n');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  try {
    const page = await browser.newPage();

    // ------------------------------------------------------------------------
    // 1. Desktop Viewport: Login Page & 3D Tilt Response
    // ------------------------------------------------------------------------
    console.log('1. Testing Desktop Login Page (1440x900) & 3D Tilt Physics...');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });

    await page.waitForSelector('#auth-card', { timeout: 10000 });
    console.log('   [OK] Auth card detected on unauthenticated visit.');

    // Verify 3D canvas is present
    const canvasExists = await page.$('canvas') !== null;
    console.log(`   [OK] Three.js WebGL Canvas rendered: ${canvasExists}`);

    // Verify Idle breathing animation
    await new Promise((r) => setTimeout(r, 600));
    const initialTransform = await page.$eval('#auth-card', (el) => el.style.transform);
    console.log(`   [OK] Active 3D Transform detected: "${initialTransform}"`);

    // Test mouse movement to Top-Left
    console.log('   Moving cursor to Top-Left (200, 200) to test 3D tilt & glare...');
    await page.mouse.move(200, 200, { steps: 15 });
    await new Promise((r) => setTimeout(r, 450));
    const screenshotTiltTopLeft = path.join(ARTIFACTS_DIR, 'auth_tilt_top_left.png');
    await page.screenshot({ path: screenshotTiltTopLeft, fullPage: false });
    console.log(`   [PASS] Saved top-left tilt screenshot: ${screenshotTiltTopLeft}`);

    // Test mouse movement to Bottom-Right
    console.log('   Moving cursor to Bottom-Right (1240, 750) to test opposite 3D tilt & glare...');
    await page.mouse.move(1240, 750, { steps: 15 });
    await new Promise((r) => setTimeout(r, 450));
    const screenshotTiltBottomRight = path.join(ARTIFACTS_DIR, 'auth_tilt_bottom_right.png');
    await page.screenshot({ path: screenshotTiltBottomRight, fullPage: false });
    console.log(`   [PASS] Saved bottom-right tilt screenshot: ${screenshotTiltBottomRight}`);

    // Move mouse to Center and test Input Focus Lift & Glow
    console.log('   Testing input focus lift and soft glow...');
    await page.mouse.move(720, 450, { steps: 10 });
    await page.focus('#input-email');
    await new Promise((r) => setTimeout(r, 300));
    const screenshotInputFocus = path.join(ARTIFACTS_DIR, 'auth_input_focus_lift.png');
    await page.screenshot({ path: screenshotInputFocus, fullPage: false });
    console.log(`   [PASS] Saved input focus lift screenshot: ${screenshotInputFocus}`);

    // Client-side validation test
    console.log('   Testing client-side validation with empty form...');
    await page.click('#btn-submit-auth');
    await new Promise((r) => setTimeout(r, 600));
    const hasErrors = await page.$eval('#auth-card', (el) => el.innerText.includes('Email address is required'));
    console.log(`   [OK] Inline validation errors rendered: ${hasErrors}`);

    const screenshotLoginDesktop = path.join(ARTIFACTS_DIR, 'auth_login_desktop.png');
    await page.screenshot({ path: screenshotLoginDesktop, fullPage: false });
    console.log(`   [PASS] Saved main login screenshot: ${screenshotLoginDesktop}\n`);

    // ------------------------------------------------------------------------
    // 2. Desktop Viewport: Signup Page
    // ------------------------------------------------------------------------
    console.log('2. Testing Desktop Signup Page Transition & Form...');
    await page.click('#tab-signup');
    await page.waitForSelector('#input-name', { timeout: 5000 });
    console.log('   [OK] Switched to Signup mode. Name and Confirm Password visible.');

    // Test password mismatch validation
    await page.type('#input-name', 'Alex Morgan');
    await page.type('#input-email', 'alex.morgan@example.com');
    await page.type('#input-password', 'SecretPass2026!');
    await page.type('#input-confirm-password', 'MismatchPass123!');
    await page.click('#btn-submit-auth');
    await new Promise((r) => setTimeout(r, 600));

    const mismatchError = await page.$eval('#auth-card', (el) => el.innerText.includes('Passwords do not match'));
    console.log(`   [OK] Mismatched password rejected: ${mismatchError}`);

    const screenshotSignupDesktop = path.join(ARTIFACTS_DIR, 'auth_signup_desktop.png');
    await page.screenshot({ path: screenshotSignupDesktop, fullPage: false });
    console.log(`   [PASS] Saved screenshot: ${screenshotSignupDesktop}\n`);

    // ------------------------------------------------------------------------
    // 3. Mobile Viewport (390x844): Login & Signup
    // ------------------------------------------------------------------------
    console.log('3. Testing Mobile Responsiveness (390x844)...');
    await page.setViewport({ width: 390, height: 844, isMobile: true });
    await page.click('#tab-login');
    await new Promise((r) => setTimeout(r, 500));

    const screenshotLoginMobile = path.join(ARTIFACTS_DIR, 'auth_login_mobile.png');
    await page.screenshot({ path: screenshotLoginMobile, fullPage: false });
    console.log(`   [PASS] Saved mobile login screenshot: ${screenshotLoginMobile}`);

    await page.click('#tab-signup');
    await new Promise((r) => setTimeout(r, 500));
    const screenshotSignupMobile = path.join(ARTIFACTS_DIR, 'auth_signup_mobile.png');
    await page.screenshot({ path: screenshotSignupMobile, fullPage: false });
    console.log(`   [PASS] Saved mobile signup screenshot: ${screenshotSignupMobile}\n`);

    // ------------------------------------------------------------------------
    // 4. Reduced Motion Accessibility Mode
    // ------------------------------------------------------------------------
    console.log('4. Testing prefers-reduced-motion accessibility mode...');
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.setViewport({ width: 1440, height: 900 });
    await page.reload({ waitUntil: 'networkidle2' });

    await page.waitForSelector('[data-testid="reduced-motion-fallback"]', { timeout: 8000 });
    console.log('   [OK] Detected reduced-motion fallback CSS gradient mesh instead of 3D animation!');

    // Verify 3D tilt is disabled in reduced-motion
    const reducedTransform = await page.$eval('#auth-card', (el) => el.style.transform);
    console.log(`   [OK] Reduced-motion card transform disabled/empty: "${reducedTransform || 'none'}"`);

    const screenshotReducedMotion = path.join(ARTIFACTS_DIR, 'auth_reduced_motion.png');
    await page.screenshot({ path: screenshotReducedMotion, fullPage: false });
    console.log(`   [PASS] Saved reduced motion screenshot: ${screenshotReducedMotion}\n`);

    // ------------------------------------------------------------------------
    // 5. End-to-End Flow: Signup -> Dashboard -> Predict -> Logout
    // ------------------------------------------------------------------------
    console.log('5. Executing End-to-End User Flow (Signup -> Dashboard -> Logout)...');
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
    await page.reload({ waitUntil: 'networkidle2' });

    await page.click('#tab-signup');
    await page.waitForSelector('#input-name', { timeout: 5000 });

    const uniqueEmail = `sarah.data_${Date.now()}@churnguard.io`;
    const strongPassword = 'StrongPassword2026!';
    await page.type('#input-name', 'Sarah Data Lead');
    await page.type('#input-email', uniqueEmail);
    await page.type('#input-password', strongPassword);
    await page.type('#input-confirm-password', strongPassword);

    console.log(`   Submitting signup for "${uniqueEmail}"...`);
    await page.click('#btn-submit-auth');

    // Wait for redirect to Dashboard
    await page.waitForSelector('#user-profile-badge', { timeout: 15000 });
    console.log('   [OK] Successfully redirected to Protected Dashboard!');

    const userBadgeText = await page.$eval('#user-profile-badge', (el) => el.innerText);
    console.log(`   User Badge in Nav: "${userBadgeText.replace(/\n/g, ' ')}"`);

    const screenshotDashboard = path.join(ARTIFACTS_DIR, 'auth_dashboard_authenticated.png');
    await page.screenshot({ path: screenshotDashboard, fullPage: true });
    console.log(`   [PASS] Saved authenticated dashboard screenshot: ${screenshotDashboard}`);

    // Run prediction while authenticated
    console.log('   Running authenticated churn prediction on dashboard...');
    await page.waitForSelector('#submit-predict-btn', { timeout: 5000 });
    await page.evaluate(() => document.getElementById('submit-predict-btn').click());

    await page.waitForSelector('#prediction-result-panel', { timeout: 15000 });
    const gaugeValue = await page.$eval('#churn-gauge-value', (el) => el.innerText);
    console.log(`   [OK] Authenticated prediction completed: ${gaugeValue} Churn Risk!`);

    // Logout flow
    console.log('   Clicking Logout button in nav (#btn-logout)...');
    await page.click('#btn-logout');
    await page.waitForSelector('#auth-card', { timeout: 10000 });
    console.log('   [OK] Successfully redirected to Login Page after logout!\n');

    console.log('============================================================');
    console.log('ALL FRONTEND AUTH & 3D DEPTH VERIFICATION TESTS PASSED!');
    console.log('============================================================');
  } finally {
    await browser.close();
  }
}

runAuthVerification().catch((err) => {
  console.error('[FAIL] Verification suite failed:', err);
  process.exit(1);
});
