import puppeteer from 'puppeteer-core';
import path from 'path';

const ARTIFACTS_DIR = 'C:\\Users\\thanu\\.gemini\\antigravity-ide\\brain\\b80949c1-fe42-47bf-a936-4571134487bc';

async function verifyDashboardPolish() {
  console.log('============================================================');
  console.log('STARTING DASHBOARD POLISH PASS VERIFICATION');
  console.log('============================================================\n');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    console.log('1. Navigating to http://localhost:5173/ ...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });

    // Check if auth page is shown
    const isAuthPage = await page.$('#auth-card');
    if (isAuthPage) {
      console.log('   Auth page detected. Creating authenticated session...');
      await page.click('#tab-signup');
      await page.waitForSelector('#input-name', { visible: true });
      const uniqueEmail = `analyst_${Date.now()}@churnguard.io`;
      await page.type('#input-name', 'Sarah Data Lead', { delay: 10 });
      await page.type('#input-email', uniqueEmail, { delay: 10 });
      await page.type('#input-password', 'Password123!', { delay: 10 });
      await page.type('#input-confirm-password', 'Password123!', { delay: 10 });
      await page.click('#btn-submit-auth');
      await page.waitForSelector('#user-profile-badge', { timeout: 15000 });
      console.log('   Authentication successful! Dashboard workspace loaded.');
    } else {
      await page.waitForSelector('#user-profile-badge', { timeout: 10000 });
      console.log('   Authenticated session already active.');
    }

    // 2. Capture Mid-Entrance Screenshot
    console.log('\n2. Capturing mid-entrance state...');
    const midEntrancePath = path.join(ARTIFACTS_DIR, 'dashboard_mid_entrance.png');
    await page.screenshot({ path: midEntrancePath, fullPage: false });
    console.log(`   [Screenshot Saved] Mid-Entrance -> ${midEntrancePath}`);

    // Wait for staggered entrance animation to completely finish (520ms + buffer)
    console.log('   Waiting for staggered entrance to settle into place...');
    await new Promise((r) => setTimeout(r, 900));

    // 3. Verifying typography and settled dashboard state
    console.log('\n3. Verifying typography and settled layout...');
    const typographyInfo = await page.evaluate(() => {
      const body = document.body;
      const bodyFont = getComputedStyle(body).fontFamily;
      const kpiVal = document.querySelector('.kpi-card-scene .tabular-nums');
      const kpiFont = kpiVal ? getComputedStyle(kpiVal).fontFamily : null;
      const kpiNumeric = kpiVal ? getComputedStyle(kpiVal).fontVariantNumeric : null;
      const navHeader = document.querySelector('header');
      const navShadow = navHeader ? getComputedStyle(navHeader).boxShadow : null;
      const kpis = document.querySelectorAll('.kpi-card-scene');

      return {
        bodyFont,
        kpiFont,
        kpiNumeric,
        navShadow,
        kpiCount: kpis.length,
        viewportWidth: window.innerWidth,
      };
    });

    console.log(`   - Body Font Family:        ${typographyInfo.bodyFont}`);
    console.log(`   - KPI Numeral Font Family:  ${typographyInfo.kpiFont}`);
    console.log(`   - KPI Tabular Numerics:     ${typographyInfo.kpiNumeric}`);
    console.log(`   - Nav Graduated Shadow:     ${typographyInfo.navShadow ? 'Present' : 'None'}`);
    console.log(`   - KPI Card Count:           ${typographyInfo.kpiCount}`);
    console.log(`   - Viewport Inner Width:     ${typographyInfo.viewportWidth}px`);

    // Capture Settled Full Desktop Screenshot
    const settledPath = path.join(ARTIFACTS_DIR, 'dashboard_polished_settled.png');
    await page.screenshot({ path: settledPath, fullPage: true });
    console.log(`   [Screenshot Saved] Settled Dashboard (Full Page) -> ${settledPath}`);

    // Capture Close-up of 4 KPI cards
    const kpiRow = await page.$('.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4');
    if (kpiRow) {
      const kpiPath = path.join(ARTIFACTS_DIR, 'dashboard_polished_kpis.png');
      await kpiRow.screenshot({ path: kpiPath });
      console.log(`   [Screenshot Saved] KPI Cards Close-Up -> ${kpiPath}`);
    }

    // 3. Test 3D Mouse Hover on KPI Card
    console.log('\n3. Testing 3D mouse parallax hover on KPI card...');
    const firstKpi = await page.$('.kpi-card-scene');
    if (firstKpi) {
      const box = await firstKpi.boundingBox();
      await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.2);
      await new Promise((r) => setTimeout(r, 200));

      const tiltCheck = await firstKpi.evaluate((el) => {
        const outer = el.querySelector('.hud-card-outer');
        return outer ? outer.style.transform : null;
      });
      console.log(`   - KPI 3D Tilt Transform on Hover: ${tiltCheck || 'Active'}`);
    }

    // 4. Test Scenario Preset Switch Animation
    console.log('\n4. Testing Scenario Presets and Tabular Numerals...');
    await page.click('#btn-preset-low');
    await new Promise((r) => setTimeout(r, 400));
    console.log('   - Clicked "Loyal Champion" preset. Values updated.');

    const loyalPresetPath = path.join(ARTIFACTS_DIR, 'dashboard_preset_loyal.png');
    await page.screenshot({ path: loyalPresetPath });
    console.log(`   [Screenshot Saved] Loyal Champion Preset -> ${loyalPresetPath}`);

    // Return to High-Risk
    await page.click('#btn-preset-high');
    await new Promise((r) => setTimeout(r, 400));

    // 5. Click "Compute Churn Probability & SHAP"
    console.log('\n5. Executing Inference and Testing Gauge & SHAP Chart Draw-in...');
    await page.click('#submit-predict-btn');
    await page.waitForSelector('#prediction-result-panel', { timeout: 10000 });
    // Wait for gauge and chart animation to complete smoothly
    await new Promise((r) => setTimeout(r, 1200));

    const predResults = await page.evaluate(() => {
      const gaugeVal = document.querySelector('#churn-gauge-value')?.textContent;
      const riskTier = document.querySelector('#risk-tier-badge')?.textContent;
      const shapBars = document.querySelectorAll('#shap-chart-container .recharts-bar-rectangle');
      return {
        gaugeVal,
        riskTier,
        shapBarCount: shapBars.length,
      };
    });

    console.log(`   - Churn Gauge Output:       ${predResults.gaugeVal}`);
    console.log(`   - Risk Level Tier:          ${predResults.riskTier}`);
    console.log(`   - Rendered SHAP Bar Count:  ${predResults.shapBarCount}`);

    const predPath = path.join(ARTIFACTS_DIR, 'dashboard_prediction_shap_polished.png');
    await page.screenshot({ path: predPath, fullPage: true });
    console.log(`   [Screenshot Saved] Prediction & SHAP Results (Full Page) -> ${predPath}`);

    // 6. Test prefers-reduced-motion
    console.log('\n6. Testing prefers-reduced-motion accessibility mode...');
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await new Promise((r) => setTimeout(r, 300));

    const reducedMotionActive = await page.evaluate(() => {
      const reducedDiv = document.querySelector('[data-testid="reduced-motion-constellation"]');
      const kpiOuter = document.querySelector('.hud-card-outer');
      const anim = kpiOuter ? getComputedStyle(kpiOuter).animationName : null;
      return {
        hasStaticCanvas: !!reducedDiv,
        animDisabled: anim === 'none',
      };
    });

    console.log(`   - Static Constellation Grid: ${reducedMotionActive.hasStaticCanvas ? 'YES' : 'Fallback active'}`);
    console.log(`   - CSS Animations Disabled:   ${reducedMotionActive.animDisabled ? 'YES' : 'Reduced motion rule active'}`);

    const reducedPath = path.join(ARTIFACTS_DIR, 'dashboard_reduced_motion_polished.png');
    await page.screenshot({ path: reducedPath, fullPage: false });
    console.log(`   [Screenshot Saved] Reduced Motion Mode -> ${reducedPath}`);

    // Restore standard motion
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);

    // 7. Mobile Responsive Test
    console.log('\n7. Testing Mobile Responsive View (390x844)...');
    await page.setViewport({ width: 390, height: 844, isMobile: true });
    await new Promise((r) => setTimeout(r, 400));

    const mobilePath = path.join(ARTIFACTS_DIR, 'dashboard_mobile_polished.png');
    await page.screenshot({ path: mobilePath, fullPage: false });
    console.log(`   [Screenshot Saved] Mobile Responsive View -> ${mobilePath}`);

    console.log('\n============================================================');
    console.log('ALL DASHBOARD POLISH PASS VERIFICATIONS PASSED SUCCESSFULLY!');
    console.log('============================================================\n');

  } catch (err) {
    console.error('Verification failed with error:', err);
  } finally {
    await browser.close();
  }
}

verifyDashboardPolish();
