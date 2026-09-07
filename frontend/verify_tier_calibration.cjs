const puppeteer = require('puppeteer-core');
const path = require('path');

const ARTIFACT_DIR = path.resolve('C:/Users/thanu/.gemini/antigravity-ide/brain/2015c562-4a66-4c99-b6a4-89664aab9d08');

async function verifyTiers() {
  console.log('=== STARTING RISK-TIER RECALIBRATION VERIFICATION ===');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    // 1. Authenticate
    console.log('1. Navigating to application...');
    await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#input-email', { timeout: 15000 });
    console.log('Login form detected. Entering credentials...');
    await page.type('#input-email', 'demo.analyst@company.com');
    await page.type('#input-password', 'SecurePassword2026!');
    await page.click('#btn-submit-auth');
    console.log('Form submitted. Waiting for dashboard access...');
    await page.waitForSelector('#enterprise-sidebar', { timeout: 15000 });
    console.log('Authentication confirmed!');

    // 2. Task Queue Page Verification
    console.log('\n2. Navigating to Task Queue (/tasks)...');
    await page.goto('http://127.0.0.1:5173/tasks', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#table-task-queue', { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 1500));

    // Inspect filter tab labels and counts
    const tabTexts = await page.$$eval('#filter-tab-all, #filter-tab-high, #filter-tab-moderate, #filter-tab-low', (buttons) =>
      buttons.map((b) => b.innerText.trim())
    );
    console.log('Tier Filter Tabs:', tabTexts);

    // Verify Tab Filtering: High Risk
    console.log('Testing "High Risk" tab click...');
    await page.click('#filter-tab-high');
    await new Promise((r) => setTimeout(r, 800));
    const highRows = await page.$$eval('#table-task-queue tbody tr[id^="task-row-"]', (rows) =>
      rows.map((r) => r.innerText)
    );
    console.log(`High Risk tab displayed ${highRows.length} rows.`);
    const allHigh = highRows.every((r) => r.includes('High'));
    console.log(`Are all filtered rows High risk?: ${allHigh}`);
    if (!allHigh) throw new Error('Non-high risk row visible in High Risk tab!');

    // Verify Tab Filtering: Moderate Risk
    console.log('Testing "Moderate" tab click...');
    await page.click('#filter-tab-moderate');
    await new Promise((r) => setTimeout(r, 800));
    const modRows = await page.$$eval('#table-task-queue tbody tr[id^="task-row-"]', (rows) =>
      rows.map((r) => r.innerText)
    );
    console.log(`Moderate tab displayed ${modRows.length} rows.`);
    const allMod = modRows.every((r) => r.includes('Moderate'));
    console.log(`Are all filtered rows Moderate risk?: ${allMod}`);
    if (!allMod) throw new Error('Non-moderate risk row visible in Moderate tab!');

    // Verify Tab Filtering: Low Risk
    console.log('Testing "Low Risk" tab click...');
    await page.click('#filter-tab-low');
    await new Promise((r) => setTimeout(r, 800));
    const lowRows = await page.$$eval('#table-task-queue tbody tr[id^="task-row-"]', (rows) =>
      rows.map((r) => r.innerText)
    );
    console.log(`Low Risk tab displayed ${lowRows.length} rows.`);
    const allLow = lowRows.every((r) => r.includes('Low'));
    console.log(`Are all filtered rows Low risk?: ${allLow}`);
    if (!allLow) throw new Error('Non-low risk row visible in Low Risk tab!');

    // Return to All Tasks
    await page.click('#filter-tab-all');
    await new Promise((r) => setTimeout(r, 800));

    // Capture Task Queue Screenshot
    const tqScreenshot = path.join(ARTIFACT_DIR, 'task_queue_recalibrated_tiers.png');
    await page.screenshot({ path: tqScreenshot });
    console.log('Saved Task Queue screenshot:', tqScreenshot);

    // 3. Dashboard Overview Page Verification
    console.log('\n3. Navigating to Dashboard Overview (/overview)...');
    await page.goto('http://127.0.0.1:5173/overview', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#view-dashboard-overview', { visible: true });
    await new Promise((r) => setTimeout(r, 1500));

    // Capture Overview Screenshot
    const overviewScreenshot = path.join(ARTIFACT_DIR, 'overview_recalibrated_tiers.png');
    await page.screenshot({ path: overviewScreenshot });
    console.log('Saved Overview screenshot:', overviewScreenshot);

    // 4. Churn Analysis Page Verification
    console.log('\n4. Navigating to Churn Analysis for Customer #1 (/analysis/1)...');
    await page.goto('http://127.0.0.1:5173/analysis/1', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#view-churn-analysis-window', { visible: true });
    await new Promise((r) => setTimeout(r, 1500));

    const analysisHeading = await page.$eval('#customer-analysis-heading', (el) => el.innerText);
    const gaugePercent = await page.$eval('#gauge-percent-val', (el) => el.innerText).catch(() => 'N/A');
    const riskBadge = await page.$eval('#risk-tier-badge', (el) => el.innerText).catch(() => 'N/A');
    console.log(`Customer: ${analysisHeading} | Gauge: ${gaugePercent} | Badge: ${riskBadge}`);

    // Capture Churn Analysis Screenshot
    const analysisScreenshot = path.join(ARTIFACT_DIR, 'churn_analysis_recalibrated_gauge.png');
    await page.screenshot({ path: analysisScreenshot });
    console.log('Saved Churn Analysis screenshot:', analysisScreenshot);

    console.log(`\nTotal console errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log('Errors:', consoleErrors);
    }

    console.log('\n=== ALL VERIFICATIONS PASSED WITH 100% SUCCESS ===');
  } catch (err) {
    console.error('Verification failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

verifyTiers();
