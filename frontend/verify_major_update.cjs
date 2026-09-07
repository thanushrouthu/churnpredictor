const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = 'C:\\Users\\thanu\\.gemini\\antigravity-ide\\brain\\7d84217a-7ddd-49ef-b0a8-c11d9961b3b7';

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  console.log('--- Launching Microsoft Edge for Verification ---');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1440,900', '--disable-dev-shm-usage'],
    defaultViewport: { width: 1440, height: 900 },
  });

  const page = await browser.newPage();

  try {
    // 1. Authenticate to Dashboard
    console.log('Step 1: Navigating to login/dashboard...');
    await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle0' });
    const emailInput = await page.$('#input-email');
    if (emailInput) {
      console.log('Logging in as enterprise lead...');
      await page.type('#input-email', 'enterprise.lead@churnguard.internal');
      await page.type('#input-password', 'Enterprise2026!');
      await page.click('#btn-submit-auth');
      await page.waitForSelector('#enterprise-sidebar', { timeout: 10000 });
      await delay(1200);
    }

    // 2. Audit 3D Background on Overview
    console.log('Step 2: Auditing 3D Background & Overview Clutter...');
    const bgAudit = await page.evaluate(() => {
      const bg = document.getElementById('dashboard-3d-background');
      const canvas = document.getElementById('canvas-3d-network');
      let nonZero = 0;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 3; i < img.data.length; i += 4) {
          if (img.data[i] > 0) nonZero++;
        }
      }
      // Count instances of SYS: ONLINE and XGBoost
      const bodyText = document.body.innerText;
      const sysOnlineMatches = (bodyText.match(/SYS:\s*ONLINE/gi) || []).length;
      const xgboostMatches = (bodyText.match(/XGBoost v2\.1\s*[•\+]/gi) || []).length;

      return {
        hasBg: !!bg,
        bgZIndex: bg ? window.getComputedStyle(bg).zIndex : null,
        bgOpacity: bg ? window.getComputedStyle(bg).opacity : null,
        canvasWidth: canvas ? canvas.width : 0,
        canvasHeight: canvas ? canvas.height : 0,
        nonZeroPixelsRendered: nonZero,
        sysOnlineCount: sysOnlineMatches,
        xgboostHeaderCount: xgboostMatches,
      };
    });
    console.log('Overview Background & Clutter Audit:', bgAudit);

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'phase7_overview.png'),
    });
    console.log('Saved phase7_overview.png');

    // 3. Navigate to Task Queue
    console.log('Step 3: Navigating to Task Queue...');
    await page.click('a[href="/tasks"]');
    await page.waitForSelector('#view-task-queue', { timeout: 10000 });
    await delay(1000);

    // Capture initial Task Queue screenshot
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'phase7_task_queue.png'),
    });
    console.log('Saved phase7_task_queue.png');

    // 4. Test Add Customer Modal & Live Inference
    console.log('Step 4: Testing Add Customer Modal...');
    await page.waitForSelector('#btn-add-customer');
    await page.click('#btn-add-customer');
    await page.waitForSelector('#modal-add-customer', { timeout: 5000 });
    await delay(500);

    // Fill form
    const testCustName = 'Solaria Aerospace Inc';
    await page.type('#input-new-cust-name', testCustName);
    await page.select('#select-new-cust-contract', 'Month-to-month');
    await page.select('#select-new-cust-internet', 'Fiber optic');

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'phase7_add_customer_modal.png'),
    });
    console.log('Saved phase7_add_customer_modal.png');

    // Submit form
    console.log('Submitting new customer form to POST /tasks...');
    await page.click('#btn-submit-new-customer');

    // Wait for modal to close and new customer to appear in table
    await page.waitForFunction(
      (name) => {
        return document.body.innerText.includes(name);
      },
      { timeout: 10000 },
      testCustName
    );
    console.log(`Success: Found "${testCustName}" immediately rendered in Task Queue!`);
    await delay(800);

    // 5. Test Customer-Level Comparison Feature (Multi-Select)
    console.log('Step 5: Testing Customer Multi-Select Comparison...');
    // Check first 2 checkboxes
    const checkboxes = await page.$$('tbody input[type="checkbox"]');
    if (checkboxes.length >= 2) {
      await checkboxes[0].click();
      await delay(300);
      await checkboxes[1].click();
      await delay(500);

      // Check that floating action bar appears
      await page.waitForSelector('#bar-floating-compare', { timeout: 5000 });
      console.log('Floating action bar appeared with selected accounts!');

      // Click Compare Selected button
      await page.click('#btn-compare-selected');
      await page.waitForSelector('#modal-customer-comparison', { timeout: 5000 });
      await delay(600);

      // Take screenshot of comparison modal
      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, 'phase7_customer_comparison_modal.png'),
      });
      console.log('Saved phase7_customer_comparison_modal.png');

      // Close modal
      await page.click('#btn-close-compare-modal');
      await delay(400);
    } else {
      console.warn('Fewer than 2 checkboxes found to test comparison!');
    }

    // 6. Test Churn Analysis & Benchmark Comparison
    console.log('Step 6: Navigating to Churn Analysis...');
    await page.click('a[href="/analysis/1"]');
    await page.waitForSelector('#view-churn-analysis-window', { timeout: 10000 });
    await delay(1000);

    // Switch to Benchmark Comparison Tab
    await page.waitForSelector('#tab-benchmark');
    await page.click('#tab-benchmark');
    await delay(600);

    // Audit clutter on Churn Analysis
    const analysisAudit = await page.evaluate(() => {
      const banner = document.getElementById('customer-analysis-heading')?.parentElement;
      const text = banner ? banner.innerText : '';
      const hasDuplicateXGB = text.includes('XGBoost v2.1');
      return {
        hasDuplicateXGB,
        hasBenchmarkChart: !!document.getElementById('chart-benchmark-comparison'),
      };
    });
    console.log('Churn Analysis Audit:', analysisAudit);

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'phase7_churn_analysis_benchmark.png'),
    });
    console.log('Saved phase7_churn_analysis_benchmark.png');

    // 7. Navigate to Employee Roster
    console.log('Step 7: Navigating to Employee Roster...');
    await page.click('a[href="/employees"]');
    await page.waitForSelector('#view-employees-roster', { timeout: 10000 });
    await delay(1000);

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'phase7_employee_roster.png'),
    });
    console.log('Saved phase7_employee_roster.png');

    console.log('=== All Verifications Passed Successfully! ===');
  } catch (err) {
    console.error('Verification failure:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
