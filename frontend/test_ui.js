import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runUiTest() {
  console.log('Launching headless Chrome for Phase 5 UI verification...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,960'],
    defaultViewport: { width: 1440, height: 960 },
  });

  try {
    const page = await browser.newPage();
    console.log('Navigating to local Vite dashboard at http://localhost:5173/ ...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2', timeout: 30000 });

    console.log('Verifying page title and initial dashboard render...');
    const title = await page.title();
    console.log(`  [OK] Page Title: "${title}"`);

    // Verify header presence
    await page.waitForSelector('header', { timeout: 5000 });
    console.log('  [OK] Header and brand identity verified.');

    // Click High-Risk Preset button
    console.log('Selecting "High-Risk Churner" preset scenario (#btn-preset-high)...');
    await page.waitForSelector('#btn-preset-high', { timeout: 5000 });
    await page.click('#btn-preset-high');
    await new Promise((r) => setTimeout(r, 600));

    // Submit form for prediction
    console.log('Clicking prediction submission button (#submit-predict-btn)...');
    await page.waitForSelector('#submit-predict-btn', { timeout: 5000 });
    await page.click('#submit-predict-btn');

    // Wait for prediction result panel
    console.log('Waiting for API response and result panel (#prediction-result-panel)...');
    await page.waitForSelector('#prediction-result-panel', { timeout: 15000 });
    console.log('  [OK] Prediction result panel rendered successfully!');

    // Wait for circular gauge and Recharts chart
    await page.waitForSelector('#churn-gauge-value', { timeout: 5000 });
    const gaugeValue = await page.$eval('#churn-gauge-value', (el) => el.innerText.trim());
    const riskTier = await page.$eval('#risk-tier-badge', (el) => el.innerText.trim());
    console.log(`  [OK] Circular Gauge Displayed Value: ${gaugeValue}`);
    console.log(`  [OK] Risk Tier Badge Displayed    : ${riskTier}`);

    // Wait for Recharts SVG container
    await page.waitForSelector('#shap-chart-container .recharts-responsive-container', { timeout: 5000 });
    console.log('  [OK] Recharts Dynamic SHAP Bar Chart successfully rendered!');

    // Save screenshots
    const artifactScreenshot = 'C:\\Users\\thanu\\.gemini\\antigravity-ide\\brain\\b80949c1-fe42-47bf-a936-4571134487bc\\churn_dashboard_verified.png';
    const workspaceScreenshot = path.resolve(__dirname, '..', 'docs', 'screenshots', 'churn_dashboard_verified.png');

    await page.screenshot({ path: artifactScreenshot, fullPage: true });
    await page.screenshot({ path: workspaceScreenshot, fullPage: true });

    console.log(`\n[SUCCESS] Verification screenshot saved to:`);
    console.log(`  - Artifact: ${artifactScreenshot}`);
    console.log(`  - Workspace: ${workspaceScreenshot}`);

    console.log('\n============================================================');
    console.log('PHASE 5 UI VERIFICATION COMPLETE & SUCCESSFUL!');
    console.log('============================================================');
  } finally {
    await browser.close();
  }
}

runUiTest().catch((err) => {
  console.error('[FAIL] UI Verification failed:', err);
  process.exit(1);
});
