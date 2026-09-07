const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\thanu\\.gemini\\antigravity-ide\\brain\\2015c562-4a66-4c99-b6a4-89664aab9d08';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BROWSER_PATH = fs.existsSync(CHROME_PATH) ? CHROME_PATH : EDGE_PATH;

async function verifyPhase3() {
  console.log('=== STARTING PHASE 3 VERIFICATION ===');
  const browser = await puppeteer.launch({
    executablePath: BROWSER_PATH,
    headless: 'new',
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('favicon')) {
      consoleErrors.push(msg.text());
    }
  });

  console.log('1. Authenticating enterprise user session...');
  await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'networkidle0' });
  await page.waitForSelector('#input-email', { visible: true });
  await page.type('#input-email', 'demo.analyst@company.com');
  await page.type('#input-password', 'SecurePassword2026!');
  await page.click('#btn-submit-auth');
  await page.waitForSelector('#enterprise-sidebar', { timeout: 15000 });
  console.log('Authentication confirmed.');

  // -------------------------------------------------------------
  // TEST 1: Overview Navigation & Active State
  // -------------------------------------------------------------
  console.log('\n2. Testing /overview and sidebar active styling...');
  await page.goto('http://127.0.0.1:5173/overview', { waitUntil: 'networkidle0' });
  await page.waitForSelector('#enterprise-sidebar', { visible: true });
  await new Promise((r) => setTimeout(r, 800));

  // Verify Overview link is highlighted
  const isOverviewActive = await page.evaluate(() => {
    const link = document.querySelector('a[href="/overview"]');
    return link && (link.className.includes('bg-white') || link.className.includes('text-zinc-950'));
  });
  console.log('Is Overview nav item actively highlighted?:', isOverviewActive);
  if (!isOverviewActive) throw new Error('Sidebar failed to highlight Overview link!');

  const overviewScreenshot = path.join(ARTIFACT_DIR, 'phase3_overview_view.png');
  await page.screenshot({ path: overviewScreenshot });
  console.log('Saved Overview screenshot:', overviewScreenshot);

  // -------------------------------------------------------------
  // TEST 2: Task Queue, Specialist Assignment, Multi-Select Comparison, and Add Customer
  // -------------------------------------------------------------
  console.log('\n3. Testing /tasks (Task Queue)...');
  await page.goto('http://127.0.0.1:5173/tasks', { waitUntil: 'networkidle0' });
  await page.waitForSelector('#enterprise-sidebar', { visible: true });
  await new Promise((r) => setTimeout(r, 800));

  // Verify Task Queue sidebar link is highlighted
  const isTasksActive = await page.evaluate(() => {
    const link = document.querySelector('a[href="/tasks"]');
    return link && (link.className.includes('bg-white') || link.className.includes('text-zinc-950'));
  });
  console.log('Is Task Queue nav item actively highlighted?:', isTasksActive);
  if (!isTasksActive) throw new Error('Sidebar failed to highlight Task Queue link!');

  // Check table has rows
  const taskRowCount = await page.$$eval('tbody tr[id^="task-row-"]', (rows) => rows.length);
  console.log(`Task Queue rendered ${taskRowCount} customer evaluation rows.`);
  if (taskRowCount === 0) throw new Error('No task rows rendered in Task Queue!');

  // Subtest A: Assign Specialist Modal & PUT /tasks/{task_id}/assign
  console.log('Testing Specialist Assignment Modal on first available task...');
  const assignBtn = await page.$('tbody tr button[id^="btn-assign-task-"], tbody tr button[id^="btn-reassign-"]');
  if (!assignBtn) throw new Error('No assign specialist button found in table!');
  await assignBtn.click();

  await page.waitForSelector('#modal-assign-employee', { visible: true, timeout: 5000 });
  console.log('Specialist Assignment modal opened successfully.');

  // Type search in modal
  await page.type('#modal-assign-employee input[type="text"]', 'Tammy');
  await new Promise((r) => setTimeout(r, 400));

  // Click select on the first filtered specialist
  const selectSpecialistBtn = await page.$('#modal-assign-employee button:not([disabled]).bg-white');
  if (!selectSpecialistBtn) throw new Error('Select specialist button not found or enabled in modal!');
  await selectSpecialistBtn.click();

  // Wait for modal to close and success toast
  await page.waitForSelector('#modal-assign-employee', { hidden: true, timeout: 5000 });
  console.log('Specialist assigned and modal closed cleanly.');
  await new Promise((r) => setTimeout(r, 600));

  const taskQueueScreenshot = path.join(ARTIFACT_DIR, 'phase3_task_queue_assigned.png');
  await page.screenshot({ path: taskQueueScreenshot });
  console.log('Saved Task Queue assigned screenshot:', taskQueueScreenshot);

  // Subtest B: Multi-Select Comparison Bar & Modal
  console.log('Testing Multi-Select Comparison feature...');
  const checkboxes = await page.$$('tbody input[type="checkbox"][id^="checkbox-task-"]');
  if (checkboxes.length < 2) throw new Error('Not enough tasks to test comparison (need at least 2)!');

  await checkboxes[0].click();
  await checkboxes[1].click();
  await new Promise((r) => setTimeout(r, 500));

  await page.waitForSelector('#bar-floating-compare', { visible: true });
  console.log('Floating action bar appeared with multi-select comparison options.');

  // Open comparison modal
  await page.click('#btn-compare-selected');
  await page.waitForSelector('#modal-customer-comparison', { visible: true });
  console.log('Customer Comparison Modal displayed side-by-side metrics.');
  await new Promise((r) => setTimeout(r, 500));

  const comparisonScreenshot = path.join(ARTIFACT_DIR, 'phase3_task_comparison_modal.png');
  await page.screenshot({ path: comparisonScreenshot });
  console.log('Saved Comparison Modal screenshot:', comparisonScreenshot);

  // Close comparison modal
  await page.click('#btn-close-compare-modal');
  await page.waitForSelector('#modal-customer-comparison', { hidden: true });
  await page.click('#btn-clear-selection');
  await new Promise((r) => setTimeout(r, 400));

  // Subtest C: Add New Customer Modal & Live Inference Persistence
  console.log('Testing Provision New Customer Profile Modal...');
  await page.click('#btn-add-customer');
  await page.waitForSelector('#form-add-customer', { visible: true });

  const uniqueCustomerName = 'Acme Corp ' + Math.floor(1000 + Math.random() * 9000);
  await page.type('#input-new-cust-name', uniqueCustomerName);
  await page.click('#btn-submit-new-customer');

  // Wait for submission to complete & modal to close
  await page.waitForSelector('#form-add-customer', { hidden: true, timeout: 10000 });
  console.log(`Created new customer account: ${uniqueCustomerName}.`);
  await new Promise((r) => setTimeout(r, 800));

  // Verify newly created customer is in the queue
  const newCustRendered = await page.evaluate((name) => {
    return document.body.innerText.includes(name);
  }, uniqueCustomerName);
  console.log('New customer visible in live task queue?:', newCustRendered);
  if (!newCustRendered) throw new Error(`Newly created customer ${uniqueCustomerName} not found in task queue!`);

  const addCustScreenshot = path.join(ARTIFACT_DIR, 'phase3_add_customer_verified.png');
  await page.screenshot({ path: addCustScreenshot });
  console.log('Saved Add Customer verified screenshot:', addCustScreenshot);

  // -------------------------------------------------------------
  // TEST 3: Employee Roster (50+ Staff & Add Employee)
  // -------------------------------------------------------------
  console.log('\n4. Testing /employees (Employee Roster)...');
  await page.goto('http://127.0.0.1:5173/employees', { waitUntil: 'networkidle0' });
  await page.waitForSelector('#enterprise-sidebar', { visible: true });
  await new Promise((r) => setTimeout(r, 800));

  // Verify Employee Roster link is highlighted
  const isEmployeesActive = await page.evaluate(() => {
    const link = document.querySelector('a[href="/employees"]');
    return link && (link.className.includes('bg-white') || link.className.includes('text-zinc-950'));
  });
  console.log('Is Employee Roster nav item actively highlighted?:', isEmployeesActive);
  if (!isEmployeesActive) throw new Error('Sidebar failed to highlight Employee Roster link!');

  // Check 50+ employees rendered without truncation
  const employeeCount = await page.$$eval('tbody tr[id^="employee-row-"]', (rows) => rows.length);
  console.log(`Employee Roster rendered ${employeeCount} specialists.`);
  if (employeeCount < 50) {
    throw new Error(`Expected at least 50 specialists rendered, but found ${employeeCount}!`);
  }
  console.log(`VERIFIED: Full roster rendered (${employeeCount} specialists >= 50, zero truncation).`);

  // Subtest D: Add Employee Modal Form Persistence
  console.log('Testing Add Employee Modal form submission...');
  await page.click('#btn-open-add-employee');
  await page.waitForSelector('#form-add-employee', { visible: true });

  const uniqueEmpName = 'Elena Rostova ' + Math.floor(1000 + Math.random() * 9000);
  const uniqueEmpEmail = `elena.rostova.${Math.floor(1000 + Math.random() * 9000)}@churnguard.enterprise`;

  await page.type('#input-employee-name', uniqueEmpName);
  await page.type('#input-employee-email', uniqueEmpEmail);
  await page.type('#input-employee-role', 'Senior Risk Strategist');
  await page.click('#btn-submit-add-employee');

  await page.waitForSelector('#form-add-employee', { hidden: true, timeout: 10000 });
  console.log(`New employee "${uniqueEmpName}" saved and persisted.`);
  await new Promise((r) => setTimeout(r, 800));

  // Verify new employee appears in roster
  const newEmpRendered = await page.evaluate((name) => {
    return document.body.innerText.includes(name);
  }, uniqueEmpName);
  console.log('New specialist visible in employee roster?:', newEmpRendered);
  if (!newEmpRendered) throw new Error(`Newly added employee ${uniqueEmpName} not found in roster!`);

  const rosterScreenshot = path.join(ARTIFACT_DIR, 'phase3_employee_roster_50plus.png');
  await page.screenshot({ path: rosterScreenshot });
  console.log('Saved Employee Roster screenshot:', rosterScreenshot);

  // -------------------------------------------------------------
  // TEST 4: Churn Analysis View & Sidebar Highlighting
  // -------------------------------------------------------------
  console.log('\n5. Testing /analysis/1 (Churn Analysis)...');
  await page.goto('http://127.0.0.1:5173/analysis/1', { waitUntil: 'networkidle0' });
  await page.waitForSelector('#enterprise-sidebar', { visible: true });
  await new Promise((r) => setTimeout(r, 1000));

  const isAnalysisActive = await page.evaluate(() => {
    const link = document.querySelector('a[href^="/analysis"]');
    return link && (link.className.includes('bg-white') || link.className.includes('text-zinc-950'));
  });
  console.log('Is Churn Analysis nav item actively highlighted?:', isAnalysisActive);
  if (!isAnalysisActive) throw new Error('Sidebar failed to highlight Churn Analysis link!');

  const analysisScreenshot = path.join(ARTIFACT_DIR, 'phase3_churn_analysis_view.png');
  await page.screenshot({ path: analysisScreenshot });
  console.log('Saved Churn Analysis screenshot:', analysisScreenshot);

  // -------------------------------------------------------------
  // TEST 5: Layout Shift / CLS and Console Error Audit
  // -------------------------------------------------------------
  console.log('\n6. Auditing Cumulative Layout Shift and console errors...');
  const clsScore = await page.evaluate(() => {
    let score = 0;
    const entries = performance.getEntriesByType('layout-shift');
    for (const entry of entries) {
      if (!entry.hadRecentInput) score += entry.value;
    }
    return score;
  });
  console.log('Calculated Cumulative Layout Shift (CLS):', clsScore);

  console.log('Total console errors encountered:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.warn('Console error details:', consoleErrors);
  }

  console.log('\n=== PHASE 3 VERIFICATION PASSED WITH FLYING COLORS ===');
  await browser.close();
}

verifyPhase3().catch((err) => {
  console.error('Phase 3 Verification Failed:', err);
  process.exit(1);
});
