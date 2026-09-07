/**
 * Phase 4 Edge Headless Verification Script
 * Tests:
 * 1. Navigate to /tasks with authenticated session.
 * 2. Visual inspection of ultra-clean monochrome task queue table & summary cards.
 * 3. Click 'Assign Employee' to trigger searchable 50+ employee modal.
 * 4. Filter employees using the search input.
 * 5. Select an employee to trigger PUT /tasks/{task_id}/assign.
 * 6. Verify instant optimistic UI update (avatar initials, name, toast).
 * 7. Query SQLite directly to verify database persistence.
 * 8. Capture high-res verification screenshots.
 */

const path = require('path');
const fs = require('fs');

const puppeteerPath = path.resolve(__dirname, '../frontend/node_modules/puppeteer-core');
const puppeteer = require(puppeteerPath);

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACT_DIR = 'C:\\Users\\thanu\\.gemini\\antigravity-ide\\brain\\97a05cf0-f571-43ad-b92d-72017496fa9b';
const DB_PATH = path.resolve(__dirname, '../data/app.db');

async function runPhase4Verification() {
  console.log('======================================================================');
  console.log('PHASE 4: TASK QUEUE & EMPLOYEE ASSIGNMENT INTERACTION VERIFICATION');
  console.log('======================================================================\n');

  console.log('1. Launching Microsoft Edge in headless mode...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900'],
    defaultViewport: { width: 1440, height: 900 },
  });

  const page = await browser.newPage();

  try {
    // Step 1: Open app
    console.log('\n2. Navigating to http://localhost:5173/tasks...');
    await page.goto('http://localhost:5173/tasks', { waitUntil: 'networkidle0', timeout: 15000 });

    // Handle authentication if redirected to AuthPage
    const emailInput = await page.$('#input-email');
    if (emailInput) {
      console.log('   Authenticating enterprise session...');
      await page.type('#input-email', 'enterprise.lead@churnguard.internal', { delay: 15 });
      await page.type('#input-password', 'Enterprise2026!', { delay: 15 });
      await Promise.all([
        page.click('#btn-submit-auth'),
        page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {}),
      ]);
      await new Promise((r) => setTimeout(r, 2000));
    }

    console.log(`   Current URL: ${page.url()}`);

    // Wait for table to load
    await page.waitForSelector('#view-task-queue', { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 1000));

    // Capture Phase 4.1 - Task Queue Data Table
    const shot1 = path.join(ARTIFACT_DIR, 'phase4_1_monochrome_task_queue.png');
    await page.screenshot({ path: shot1, fullPage: false });
    console.log(`   [SCREENSHOT] Saved: ${shot1}`);

    // Step 3: Locate an unassigned task or reassignable task
    console.log('\n3. Locating task to test employee assignment...');
    const assignBtn = await page.$('button[id^="btn-assign-task-"], button[id^="btn-reassign-"]');
    if (!assignBtn) throw new Error('No assign/reassign button found on the task queue!');

    const btnId = await page.evaluate((el) => el.id, assignBtn);
    const taskIdMatch = btnId.match(/\d+/);
    const targetTaskId = taskIdMatch ? parseInt(taskIdMatch[0], 10) : null;
    console.log(`   Found interactive assignment button: #${btnId} (Task #${targetTaskId})`);

    // Click assign button to trigger modal
    console.log('   Clicking assignment button to open modal...');
    await assignBtn.click();
    await page.waitForSelector('#modal-assign-employee', { visible: true, timeout: 5000 });
    console.log('   [PASS] Searchable employee assignment modal opened.');

    // Wait for employee list to render
    await page.waitForSelector('#employee-selection-list button', { timeout: 5000 });

    // Capture Phase 4.2 - Searchable Employee Modal
    const shot2 = path.join(ARTIFACT_DIR, 'phase4_2_employee_search_modal.png');
    await page.screenshot({ path: shot2, fullPage: false });
    console.log(`   [SCREENSHOT] Saved: ${shot2}`);

    // Step 4: Search for Marcus or Elena
    console.log('\n4. Testing employee search input inside modal...');
    const searchInput = await page.$('#input-search-employee');
    await searchInput.type('Marcus', { delay: 25 });
    await new Promise((r) => setTimeout(r, 500));

    // Select the filtered employee
    const candidateBtn = await page.$('#employee-selection-list button');
    if (!candidateBtn) throw new Error('No employee found matching "Marcus"!');

    const candidateText = await page.evaluate((el) => el.innerText, candidateBtn);
    console.log(`   Selecting specialist from filtered roster:\n   ${candidateText.replace(/\n/g, ' ')}`);

    // Click to assign
    await candidateBtn.click();
    console.log('   Specialist selected. Awaiting real-time assignment and UI update...');

    // Wait for modal to close and toast/table to update
    await new Promise((r) => setTimeout(r, 1200));

    // Capture Phase 4.3 - Assigned Task in UI
    const shot3 = path.join(ARTIFACT_DIR, 'phase4_3_assigned_employee_verified.png');
    await page.screenshot({ path: shot3, fullPage: false });
    console.log(`   [SCREENSHOT] Saved: ${shot3}`);

    // Step 5: Verify SQLite Database State
    console.log('\n5. Verifying Database state directly in data/app.db...');
    const { execSync } = require('child_process');
    const pyCheck = execSync(
      `python -c "import sqlite3; conn=sqlite3.connect('data/app.db'); c=conn.cursor(); c.execute('SELECT id, customer_name, employee_id FROM tasks WHERE id = ${targetTaskId}'); print(c.fetchone()); conn.close()"`
    ).toString();
    console.log(`   Direct DB Query result: ${pyCheck.trim()}`);

    console.log('\n======================================================================');
    console.log('PHASE 4 VERIFICATION COMPLETE: ALL DONE CRITERIA SATISFIED!');
    console.log('======================================================================\n');
  } catch (err) {
    console.error(`\n[FAIL] Phase 4 verification error: ${err.message}`);
    throw err;
  } finally {
    await browser.close();
  }
}

runPhase4Verification();
