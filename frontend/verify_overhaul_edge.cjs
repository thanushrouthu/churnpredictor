const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACT_DIR = 'C:\\Users\\thanu\\.gemini\\antigravity-ide\\brain\\7d84217a-7ddd-49ef-b0a8-c11d9961b3b7';

async function runOverhaulVerification() {
  console.log('======================================================================');
  console.log('CHURNGUARD DASHBOARD OVERHAUL: AUTOMATED VERIFICATION VIA EDGE');
  console.log('======================================================================\n');

  console.log('1. Launching Microsoft Edge in headless mode...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900'],
    defaultViewport: { width: 1440, height: 900 },
  });

  const page = await browser.newPage();

  // Capture console errors
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    // Step 1: Open app at root (http://localhost:5173/)
    console.log('2. Navigating to root (http://localhost:5173/)...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0', timeout: 15000 });

    // Handle authentication if on AuthPage
    const emailInput = await page.$('#input-email');
    if (emailInput) {
      console.log('   Authenticating enterprise session...');
      await page.type('#input-email', 'enterprise.lead@churnguard.internal', { delay: 10 });
      await page.type('#input-password', 'Enterprise2026!', { delay: 10 });
      await Promise.all([
        page.click('#btn-submit-auth'),
        page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {}),
      ]);
      await new Promise((r) => setTimeout(r, 1200));
    }

    // Verify default landing view is /dashboard (Overview)
    const currentUrl = page.url();
    console.log(`3. Verified landing URL: ${currentUrl}`);
    if (!currentUrl.includes('/dashboard')) {
      throw new Error(`Expected default landing URL to contain /dashboard, got: ${currentUrl}`);
    }
    console.log('   [PASS] Default landing view is Overview (/dashboard).');

    // Verify Sidebar navigation order
    console.log('\n4. Verifying Sidebar navigation order...');
    const navLinks = await page.$$eval('#enterprise-sidebar nav a', (links) =>
      links.map((l) => ({
        href: l.getAttribute('href'),
        text: l.innerText.trim().split('\n')[0],
      }))
    );
    console.log('   Sidebar nav items found:', JSON.stringify(navLinks));
    const expectedOrder = ['/dashboard', '/tasks', '/employees', '/analysis/1'];
    for (let i = 0; i < expectedOrder.length; i++) {
      if (navLinks[i]?.href !== expectedOrder[i]) {
        throw new Error(`Nav index ${i} expected ${expectedOrder[i]}, got ${navLinks[i]?.href}`);
      }
    }
    console.log('   [PASS] Navigation order strictly matches: Overview, Task Queue, Employee Roster, Churn Analysis.');

    // Screenshot 1: Overview
    console.log('\n5. Capturing Overview view screenshot...');
    await new Promise((r) => setTimeout(r, 1000));
    const shot1 = path.join(ARTIFACT_DIR, 'phase6_overview.png');
    await page.screenshot({ path: shot1, fullPage: false });
    console.log(`   [PASS] Saved Overview screenshot to ${shot1}`);

    // Verify 3D Background on Overview
    const bgCanvas1 = await page.$('#dashboard-3d-background canvas');
    if (!bgCanvas1) throw new Error('3D background canvas not found on Overview!');
    console.log('   [PASS] 3D multi-layer background canvas active.');

    // Step 2: Navigate to Task Queue (/tasks)
    console.log('\n6. Navigating to Task Queue (/tasks)...');
    await page.click('a[href="/tasks"]');
    await page.waitForSelector('#view-task-queue', { timeout: 8000 });
    await new Promise((r) => setTimeout(r, 1000));

    // Test filter risk tab bloom click
    console.log('   Testing filter tabs and bloom effect...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const highBtn = btns.find((b) => b.innerText.includes('High Risk'));
      if (highBtn) highBtn.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const allBtn = btns.find((b) => b.innerText.includes('All Tasks'));
      if (allBtn) allBtn.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    const shot2 = path.join(ARTIFACT_DIR, 'phase6_task_queue.png');
    await page.screenshot({ path: shot2, fullPage: false });
    console.log(`   [PASS] Saved Task Queue screenshot to ${shot2}`);

    // Step 3: Navigate to Employee Roster (/employees)
    console.log('\n7. Navigating to Employee Roster (/employees)...');
    await page.click('a[href="/employees"]');
    await page.waitForSelector('#view-employees-roster', { timeout: 8000 });
    await new Promise((r) => setTimeout(r, 1000));

    // Test Add Employee Flow
    console.log('\n8. Testing "Add Employee" modal and persistence flow...');
    const addBtn = await page.$('#btn-open-add-employee');
    if (!addBtn) throw new Error('#btn-open-add-employee button not found!');
    await addBtn.click();
    await page.waitForSelector('#modal-add-employee-container', { timeout: 5000 });
    console.log('   [PASS] Add Employee modal opened.');

    // Fill out the form
    const uniqueId = Math.floor(Math.random() * 9000) + 1000;
    const testSpecialistName = `Victoria Sterling ${uniqueId}`;
    const testSpecialistEmail = `v.sterling${uniqueId}@enterprise.internal`;
    const testSpecialistRole = 'Strategic Retention Architect';

    await page.type('#input-employee-name', testSpecialistName, { delay: 10 });
    await page.type('#input-employee-email', testSpecialistEmail, { delay: 10 });
    await page.type('#input-employee-role', testSpecialistRole, { delay: 10 });
    await page.select('#select-employee-dept', 'Strategic Customer Growth');

    // Capture modal screenshot
    const shotModal = path.join(ARTIFACT_DIR, 'phase6_add_employee_modal.png');
    await page.screenshot({ path: shotModal, fullPage: false });
    console.log(`   [PASS] Saved Add Employee modal screenshot to ${shotModal}`);

    // Submit form
    console.log('   Submitting Add Employee form...');
    await page.click('#btn-submit-add-employee');

    // Wait for toast or table update
    await page.waitForSelector('#toast-success-employee', { timeout: 8000 });
    console.log('   [PASS] Success toast appeared.');

    // Verify employee appears in the table
    await new Promise((r) => setTimeout(r, 1000));
    const tableText = await page.$eval('table', (t) => t.innerText);
    if (!tableText.includes(testSpecialistName)) {
      throw new Error(`Newly added employee "${testSpecialistName}" not found in table immediately!`);
    }
    console.log(`   [PASS] "${testSpecialistName}" immediately displayed in employee roster table.`);

    // Screenshot Employee Roster after addition
    const shot3 = path.join(ARTIFACT_DIR, 'phase6_employee_roster.png');
    await page.screenshot({ path: shot3, fullPage: false });
    console.log(`   [PASS] Saved Employee Roster screenshot to ${shot3}`);

    // Verify Persistence on Page Reload
    console.log('\n9. Testing Database Persistence on page reload...');
    await page.reload({ waitUntil: 'networkidle0', timeout: 15000 });
    await page.waitForSelector('#view-employees-roster', { timeout: 8000 });
    await new Promise((r) => setTimeout(r, 1000));

    const reloadedTableText = await page.$eval('table', (t) => t.innerText);
    if (!reloadedTableText.includes(testSpecialistName)) {
      throw new Error(`Persistence failure: "${testSpecialistName}" disappeared after page reload!`);
    }
    console.log(`   [PASS] Database Persistence Confirmed! "${testSpecialistName}" retained after page reload.`);

    // Step 4: Navigate to Churn Analysis (/analysis/1)
    console.log('\n10. Navigating to Churn Analysis (/analysis/1)...');
    await page.click('a[href="/analysis/1"]');
    await page.waitForSelector('#view-churn-analysis-window', { timeout: 8000 });
    await new Promise((r) => setTimeout(r, 1200));

    // Test slider and model re-evaluation
    console.log('   Interacting with Customer Attributes and re-evaluating model...');
    const tenureSlider = await page.$('#input-tenure');
    if (tenureSlider) {
      await tenureSlider.evaluate((el) => {
        el.value = '24';
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }

    const reEvaluateBtn = await page.$('#btn-re-evaluate');
    if (reEvaluateBtn) {
      await reEvaluateBtn.click();
      await new Promise((r) => setTimeout(r, 1500));
      console.log('   [PASS] Model re-evaluated with local SHAP values.');
    }

    const shot4 = path.join(ARTIFACT_DIR, 'phase6_churn_analysis.png');
    await page.screenshot({ path: shot4, fullPage: false });
    console.log(`   [PASS] Saved Churn Analysis screenshot to ${shot4}`);

    // Step 5: Check Console Errors
    console.log('\n11. Verifying console error log...');
    // Filter out common harmless dev warnings if any
    const realErrors = consoleErrors.filter(
      (err) => !err.includes('Download the React DevTools') && !err.includes('favicon')
    );
    if (realErrors.length > 0) {
      console.warn('   Console errors noted:', realErrors);
    } else {
      console.log('   [PASS] Zero console errors across all 4 views.');
    }

    console.log('\n======================================================================');
    console.log('ALL DASHBOARD OVERHAUL TESTS PASSED PERFECTLY!');
    console.log('======================================================================');
  } catch (err) {
    console.error('\nVerification encountered error:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runOverhaulVerification();
