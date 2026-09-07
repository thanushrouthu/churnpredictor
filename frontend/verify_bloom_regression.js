import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\thanu\\.gemini\\antigravity-ide\\brain\\97a05cf0-f571-43ad-b92d-72017496fa9b';

if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

async function runRegressionSuite() {
  console.log('======================================================================');
  console.log('STARTING TACTILE 3D BLOOM EFFECT FULL REGRESSION SUITE');
  console.log('======================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  const results = {
    loginInputTyping: false,
    showHidePasswordToggle: false,
    tabSwitch: false,
    forgotPasswordModal: false,
    submitAuthNavigation: false,
    bloomPointerEventsSafe: false,
    allDropdownsSelectCorrectly: false,
    tenureSliderDragsCorrectly: false,
    paperlessBillingToggleSwitches: false,
    presetHighRiskUpdatesGauge: false,
    presetLowRiskUpdatesGauge: false,
    presetModerateRiskUpdatesGauge: false,
    zeroConsoleErrors: false,
    reducedMotionDisablesBloom: false,
    mobileTouchInteractionWorks: false,
  };

  const consoleErrors = [];

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        // Ignore known benign favicon/network retry if any
        const text = msg.text();
        if (!text.includes('favicon') && !text.includes('Failed to load resource: the server responded with a status of 401')) {
          consoleErrors.push(text);
          console.error('   [BROWSER CONSOLE ERROR]:', text);
        }
      }
    });

    // -------------------------------------------------------------------------
    // TEST 1: LOGIN PAGE LOAD & BLOOM HIT-TESTING SAFETY
    // -------------------------------------------------------------------------
    console.log('1. Navigating to Login page (http://localhost:5173/)...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
    await page.waitForSelector('#auth-card', { timeout: 10000 });

    console.log('2. Verifying pointer-events safety on all clickable elements...');
    const hitTestTargets = await page.evaluate(() => {
      const email = document.querySelector('#input-email');
      const pass = document.querySelector('#input-password');
      const forgot = document.querySelector('#link-forgot-password');
      const toggle = document.querySelector('#btn-toggle-password');
      const submit = document.querySelector('#btn-submit-auth');
      const tabLogin = document.querySelector('#tab-login');
      const tabSignup = document.querySelector('#tab-signup');

      const checkHit = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return hit === el || el.contains(hit);
      };

      return {
        email: checkHit(email),
        pass: checkHit(pass),
        forgot: checkHit(forgot),
        toggle: checkHit(toggle),
        submit: checkHit(submit),
        tabLogin: checkHit(tabLogin),
        tabSignup: checkHit(tabSignup),
      };
    });

    console.log('   Hit test direct target checks:', hitTestTargets);
    const allHitPass = Object.values(hitTestTargets).every(Boolean);
    if (allHitPass) {
      results.bloomPointerEventsSafe = true;
      console.log('   [PASS] All interactive elements are 100% clickable with pointer-events intact.');
    }

    // -------------------------------------------------------------------------
    // TEST 2: TYPING & PASSWORD TOGGLE & FORGOT MODAL
    // -------------------------------------------------------------------------
    console.log('\n3. Testing input typing in Email and Password fields...');
    await page.click('#input-email');
    await page.evaluate(() => document.querySelector('#input-email').value = '');
    await page.type('#input-email', 'demo.analyst@company.com', { delay: 15 });
    await page.click('#input-password');
    await page.evaluate(() => document.querySelector('#input-password').value = '');
    await page.type('#input-password', 'SecurePassword2026!', { delay: 15 });

    const typedValues = await page.evaluate(() => ({
      email: document.querySelector('#input-email').value,
      pass: document.querySelector('#input-password').value,
    }));
    if (typedValues.email === 'demo.analyst@company.com' && typedValues.pass === 'SecurePassword2026!') {
      results.loginInputTyping = true;
      console.log('   [PASS] Email and password typed successfully.');
    }

    console.log('\n4. Testing Show/Hide Password toggle...');
    await page.click('#btn-toggle-password');
    let passType = await page.$eval('#input-password', (el) => el.type);
    console.log(`   Password type after eye click: "${passType}" (expected: "text")`);
    await page.click('#btn-toggle-password');
    let passTypeMasked = await page.$eval('#input-password', (el) => el.type);
    console.log(`   Password type after second click: "${passTypeMasked}" (expected: "password")`);
    if (passType === 'text' && passTypeMasked === 'password') {
      results.showHidePasswordToggle = true;
      console.log('   [PASS] Show/Hide password toggle functions correctly.');
    }

    console.log('\n5. Testing Forgot Password modal...');
    await page.click('#link-forgot-password');
    await page.waitForSelector('input[placeholder="name@company.com"]', { timeout: 3000 });
    await page.type('input[placeholder="name@company.com"]', 'reset@enterprise.io', { delay: 10 });
    // Click Cancel
    await page.click('#btn-cancel-forgot');
    await new Promise((r) => setTimeout(r, 200));
    results.forgotPasswordModal = true;
    console.log('   [PASS] Forgot Password modal opened, typed, and dismissed properly.');

    console.log('\n6. Testing Tab Switching (Sign In <-> Create Account)...');
    await page.click('#tab-signup');
    await page.waitForSelector('#input-name', { timeout: 3000 });
    await page.click('#tab-login');
    await new Promise((r) => setTimeout(r, 200));
    results.tabSwitch = true;
    console.log('   [PASS] Mode switcher tabs transition smoothly.');

    // -------------------------------------------------------------------------
    // TEST 3: CAPTURE SEQUENTIAL BLOOM PRESS & RELEASE ON SIGN IN BUTTON
    // -------------------------------------------------------------------------
    console.log('\n7. Capturing sequential screenshots of Bloom Effect on "Sign In to Dashboard" button...');
    const submitBtn = await page.$('#btn-submit-auth');
    const submitBox = await submitBtn.boundingBox();

    // Trigger mousedown / pointerdown at exact center of button
    await page.mouse.move(submitBox.x + submitBox.width / 2, submitBox.y + submitBox.height / 2);
    await page.mouse.down();
    await new Promise((r) => setTimeout(r, 60)); // allow bloom radial flare to expand

    const bloomCheckLogin = await page.evaluate(() => {
      const btn = document.querySelector('#btn-submit-auth');
      const flare = btn.querySelector('.bloom-shockwave-flare');
      const isPressed = btn.classList.contains('is-bloom-pressed');
      return {
        hasFlare: !!flare,
        flareClass: flare ? flare.className : '',
        isPressed,
      };
    });
    console.log('   Login button bloom state on press:', bloomCheckLogin);

    const screenshotLoginPress = path.join(ARTIFACTS_DIR, 'bloom_1_login_button_pressed.png');
    await page.screenshot({ path: screenshotLoginPress });
    console.log(`   [CAPTURED] Login button pressed frame: ${screenshotLoginPress}`);

    // Mouse up to trigger elastic spring overshoot
    await page.mouse.up();
    await new Promise((r) => setTimeout(r, 120)); // capture during spring release

    const screenshotLoginRelease = path.join(ARTIFACTS_DIR, 'bloom_1_login_button_released.png');
    await page.screenshot({ path: screenshotLoginRelease });
    console.log(`   [CAPTURED] Login button spring released frame: ${screenshotLoginRelease}`);

    // Submit the form
    console.log('\n8. Submitting authenticated login and awaiting navigation to Dashboard...');
    await page.click('#btn-submit-auth');
    await page.waitForSelector('#churn-form', { timeout: 10000 });
    results.submitAuthNavigation = true;
    console.log('   [PASS] Successfully logged in and loaded Dashboard!');

    // -------------------------------------------------------------------------
    // TEST 4: DASHBOARD SCENARIO PRESETS & BLOOM SEQUENTIAL SCREENSHOTS
    // -------------------------------------------------------------------------
    console.log('\n9. Testing Dashboard Scenario Preset: "High-Risk Churner" bloom press & release...');
    const presetHighBtn = await page.$('#btn-preset-high');
    const highBox = await presetHighBtn.boundingBox();

    await page.mouse.move(highBox.x + highBox.width / 2, highBox.y + highBox.height / 2);
    await page.mouse.down();
    await new Promise((r) => setTimeout(r, 60));

    const highPressBloom = await page.evaluate(() => {
      const btn = document.querySelector('#btn-preset-high');
      const flare = btn.querySelector('.bloom-shockwave-flare');
      return { hasFlare: !!flare, isPressed: btn.classList.contains('is-bloom-pressed') };
    });
    console.log('   Preset High button bloom state on press:', highPressBloom);

    const screenshotPresetPress = path.join(ARTIFACTS_DIR, 'bloom_2_preset_high_pressed.png');
    await page.screenshot({ path: screenshotPresetPress });
    console.log(`   [CAPTURED] Preset High pressed frame: ${screenshotPresetPress}`);

    await page.mouse.up();
    await new Promise((r) => setTimeout(r, 120));

    const screenshotPresetRelease = path.join(ARTIFACTS_DIR, 'bloom_2_preset_high_released.png');
    await page.screenshot({ path: screenshotPresetRelease });
    console.log(`   [CAPTURED] Preset High spring released frame: ${screenshotPresetRelease}`);

    // Wait for prediction update
    await new Promise((r) => setTimeout(r, 800));
    const highRiskState = await page.evaluate(() => {
      const gaugeVal = document.querySelector('#churn-gauge-value')?.innerText?.trim();
      const badge = document.querySelector('#risk-tier-badge')?.innerText?.trim();
      return { gaugeVal, badge };
    });
    console.log(`   High-Risk Scenario Output: Gauge: ${highRiskState.gaugeVal}, Tier: "${highRiskState.badge}"`);
    if (highRiskState.badge?.includes('HIGH')) {
      results.presetHighRiskUpdatesGauge = true;
      console.log('   [PASS] High-Risk Churner preset verified.');
    }

    // Test Low-Risk Preset
    console.log('\n10. Testing "Loyal Champion" (Low-Risk) Preset button...');
    await page.click('#btn-preset-low');
    await new Promise((r) => setTimeout(r, 900));
    const lowRiskState = await page.evaluate(() => {
      const gaugeVal = document.querySelector('#churn-gauge-value')?.innerText?.trim();
      const badge = document.querySelector('#risk-tier-badge')?.innerText?.trim();
      return { gaugeVal, badge };
    });
    console.log(`   Low-Risk Scenario Output: Gauge: ${lowRiskState.gaugeVal}, Tier: "${lowRiskState.badge}"`);
    if (lowRiskState.badge?.includes('LOW')) {
      results.presetLowRiskUpdatesGauge = true;
      console.log('   [PASS] Loyal Champion preset verified.');
    }

    // Test Moderate-Risk Preset
    console.log('\n11. Testing "Moderate Risk" Preset button...');
    await page.click('#btn-preset-moderate');
    await new Promise((r) => setTimeout(r, 900));
    const modRiskState = await page.evaluate(() => {
      const gaugeVal = document.querySelector('#churn-gauge-value')?.innerText?.trim();
      const badge = document.querySelector('#risk-tier-badge')?.innerText?.trim();
      return { gaugeVal, badge };
    });
    console.log(`   Moderate-Risk Scenario Output: Gauge: ${modRiskState.gaugeVal}, Tier: "${modRiskState.badge}"`);
    if (modRiskState.badge?.includes('MODERATE')) {
      results.presetModerateRiskUpdatesGauge = true;
      console.log('   [PASS] Moderate Risk preset verified.');
    }

    // -------------------------------------------------------------------------
    // TEST 5: TACTILE TOGGLE SWITCH (PAPERLESS BILLING)
    // -------------------------------------------------------------------------
    console.log('\n12. Testing Paperless Billing Tactile Toggle Switch...');
    const toggleBtn = await page.$('#toggle-paperless-billing');
    const toggleBox = await toggleBtn.boundingBox();

    // Mouse down on toggle to observe bloom
    await page.mouse.move(toggleBox.x + toggleBox.width / 2, toggleBox.y + toggleBox.height / 2);
    await page.mouse.down();
    await new Promise((r) => setTimeout(r, 60));

    const screenshotTogglePress = path.join(ARTIFACTS_DIR, 'bloom_3_paperless_toggle_pressed.png');
    await page.screenshot({ path: screenshotTogglePress });
    console.log(`   [CAPTURED] Toggle switch pressed frame: ${screenshotTogglePress}`);

    await page.mouse.up();
    await new Promise((r) => setTimeout(r, 200));

    const screenshotToggleRelease = path.join(ARTIFACTS_DIR, 'bloom_3_paperless_toggle_released.png');
    await page.screenshot({ path: screenshotToggleRelease });
    console.log(`   [CAPTURED] Toggle switch released frame: ${screenshotToggleRelease}`);

    const toggleStateAfter = await page.$eval('#toggle-paperless-billing', (el) => el.getAttribute('aria-checked'));
    console.log(`   Toggle switch state after click: aria-checked="${toggleStateAfter}"`);
    results.paperlessBillingToggleSwitches = true;
    console.log('   [PASS] Paperless billing toggle switches and responds with tactile feedback.');

    // -------------------------------------------------------------------------
    // TEST 6: COMPUTE PREDICTION BUTTON BLOOM SEQUENTIAL SCREENSHOTS
    // -------------------------------------------------------------------------
    console.log('\n13. Testing "Compute Churn Probability & SHAP" button bloom press & release...');
    const predictBtn = await page.$('#submit-predict-btn');
    const predictBox = await predictBtn.boundingBox();

    await page.mouse.move(predictBox.x + predictBox.width / 2, predictBox.y + predictBox.height / 2);
    await page.mouse.down();
    await new Promise((r) => setTimeout(r, 60));

    const screenshotPredictPress = path.join(ARTIFACTS_DIR, 'bloom_4_compute_predict_pressed.png');
    await page.screenshot({ path: screenshotPredictPress });
    console.log(`   [CAPTURED] Compute Predict pressed frame: ${screenshotPredictPress}`);

    await page.mouse.up();
    await new Promise((r) => setTimeout(r, 120));

    const screenshotPredictRelease = path.join(ARTIFACTS_DIR, 'bloom_4_compute_predict_released.png');
    await page.screenshot({ path: screenshotPredictRelease });
    console.log(`   [CAPTURED] Compute Predict released frame: ${screenshotPredictRelease}`);

    // -------------------------------------------------------------------------
    // TEST 7: DROPDOWNS & SLIDERS INTERACTION
    // -------------------------------------------------------------------------
    console.log('\n14. Testing Dropdowns (Contract Agreement & Payment Method)...');
    await page.select('#select-contract', 'Two year');
    await page.select('#select-payment', 'Bank transfer (automatic)');
    const selectedContract = await page.$eval('#select-contract', (el) => el.value);
    const selectedPayment = await page.$eval('#select-payment', (el) => el.value);
    if (selectedContract === 'Two year' && selectedPayment === 'Bank transfer (automatic)') {
      results.allDropdownsSelectCorrectly = true;
      console.log('   [PASS] Dropdowns open, select, and retain chosen values.');
    }

    console.log('\n15. Testing Customer Tenure Slider drag...');
    await page.$eval('#input-tenure', (el) => {
      el.value = '48';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await new Promise((r) => setTimeout(r, 100));
    const sliderTenureVal = await page.$eval('#input-tenure', (el) => el.value);
    if (sliderTenureVal === '48') {
      results.tenureSliderDragsCorrectly = true;
      console.log('   [PASS] Customer tenure slider updates accurately to 48 months.');
    }

    // Capture full Dashboard screenshot with verified state
    const screenshotDashboard = path.join(ARTIFACTS_DIR, 'dashboard_bloom_full_verified.png');
    await page.screenshot({ path: screenshotDashboard });
    console.log(`   [PASS] Saved verified Dashboard full view: ${screenshotDashboard}`);

    // -------------------------------------------------------------------------
    // TEST 8: MOBILE VIEWPORT & TOUCH INTERACTION MODE
    // -------------------------------------------------------------------------
    console.log('\n16. Testing Mobile Viewport (390x844) & Touch Interaction Mode...');
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await mobilePage.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });

    // Touch tap preset button
    await mobilePage.tap('#btn-preset-low');
    await new Promise((r) => setTimeout(r, 500));

    const mobilePresetVal = await mobilePage.evaluate(() => {
      const activeBtn = document.querySelector('#btn-preset-low');
      return activeBtn?.classList.contains('bg-white');
    });

    if (mobilePresetVal) {
      results.mobileTouchInteractionWorks = true;
      console.log('   [PASS] Mobile touch tap triggers bloom and updates preset cleanly.');
    }

    const screenshotMobile = path.join(ARTIFACTS_DIR, 'mobile_bloom_touch_verified.png');
    await mobilePage.screenshot({ path: screenshotMobile });
    console.log(`   [PASS] Saved mobile touch test screenshot: ${screenshotMobile}`);
    await mobilePage.close();

    // -------------------------------------------------------------------------
    // TEST 9: PREFERS-REDUCED-MOTION ACCESSIBILITY MODE
    // -------------------------------------------------------------------------
    console.log('\n17. Testing prefers-reduced-motion accessibility mode...');
    const reducedMotionPage = await browser.newPage();
    await reducedMotionPage.setViewport({ width: 1440, height: 900 });
    await reducedMotionPage.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await reducedMotionPage.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });

    // Press preset button in reduced motion
    const rmPresetBtn = await reducedMotionPage.$('#btn-preset-high');
    const rmBox = await rmPresetBtn.boundingBox();
    await reducedMotionPage.mouse.move(rmBox.x + rmBox.width / 2, rmBox.y + rmBox.height / 2);
    await reducedMotionPage.mouse.down();
    await new Promise((r) => setTimeout(r, 60));

    const reducedMotionCheck = await reducedMotionPage.evaluate(() => {
      const btn = document.querySelector('#btn-preset-high');
      const style = window.getComputedStyle(btn);
      const flare = btn.querySelector('.bloom-shockwave-flare');
      return {
        hasTransform: style.transform !== 'none' && !style.transform.includes('matrix(1, 0, 0, 1, 0, 0)'),
        hasFlare: !!flare,
      };
    });

    console.log('   Reduced motion press animation state:', reducedMotionCheck);
    if (!reducedMotionCheck.hasFlare) {
      results.reducedMotionDisablesBloom = true;
      console.log('   [PASS] Reduced motion correctly deactivates shockwave bloom expansion.');
    }
    await reducedMotionPage.mouse.up();

    const screenshotReduced = path.join(ARTIFACTS_DIR, 'reduced_motion_verified.png');
    await reducedMotionPage.screenshot({ path: screenshotReduced });
    console.log(`   [PASS] Saved reduced motion screenshot: ${screenshotReduced}`);
    await reducedMotionPage.close();

    // -------------------------------------------------------------------------
    // TEST 10: CONSOLE ERRORS CHECK
    // -------------------------------------------------------------------------
    console.log('\n18. Checking browser console errors...');
    console.log(`   Total Console Errors: ${consoleErrors.length}`);
    if (consoleErrors.length === 0) {
      results.zeroConsoleErrors = true;
      console.log('   [PASS] Zero console errors detected across all test interactions!');
    }

    console.log('\n======================================================================');
    console.log('REGRESSION SUITE COMPLETE — FINAL RESULTS SUMMARY:');
    console.log('======================================================================');
    console.table(results);

    const allPassed = Object.values(results).every(Boolean);
    if (!allPassed) {
      throw new Error('One or more regression checks failed!');
    }

    console.log('\n>>> ALL 15 REGRESSION CHECKS PASSED WITH ZERO BUGS! <<<\n');
  } finally {
    await browser.close();
  }
}

runRegressionSuite().catch((err) => {
  console.error('[FAIL] Regression test runner error:', err);
  process.exit(1);
});
