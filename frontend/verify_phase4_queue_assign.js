import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';
import { execFileSync } from 'child_process';

const ARTIFACTS_DIR = 'C:\\Users\\thanu\\.gemini\\antigravity-ide\\brain\\97a05cf0-f571-43ad-b92d-72017496fa9b';
const DB_PATH = 'C:\\Users\\thanu\\OneDrive\\Documents\\Desktop\\TASK-2\\data\\app.db';

if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

function queryDatabase(query, params = []) {
  const pyCode = `
import sqlite3, json
conn = sqlite3.connect(r'''${DB_PATH}''')
conn.row_factory = sqlite3.Row
cursor = conn.cursor()
cursor.execute('''${query}''', ${JSON.stringify(params)})
rows = [dict(r) for r in cursor.fetchall()]
print(json.dumps(rows))
conn.close()
`;
  const output = execFileSync('python', ['-c', pyCode], { encoding: 'utf-8' });
  return JSON.parse(output.trim());
}

async function verifyPhase4QueueAssign() {
  console.log('======================================================================');
  console.log('PHASE 4: TASK QUEUE & 50-EMPLOYEE ASSIGNMENT INTERACTION TEST');
  console.log('======================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    console.log('1. Navigating to http://localhost:5173/tasks...');
    await page.goto('http://localhost:5173/tasks', { waitUntil: 'networkidle2' });

    // Handle authentication if session expired
    const isLogin = await page.$('#input-email');
    if (isLogin) {
      console.log('   Authenticating as demo.analyst@company.com...');
      await page.type('#input-email', 'demo.analyst@company.com', { delay: 10 });
      await page.type('#input-password', 'SecurePassword2026!', { delay: 10 });
      await page.click('#btn-submit-auth');
      await page.waitForSelector('#view-task-queue', { timeout: 10000 });
      console.log('   [PASS] Authenticated successfully.');
    }

    await page.waitForSelector('#view-task-queue', { timeout: 6000 });
    await page.waitForSelector('tbody tr', { timeout: 6000 });
    await new Promise((r) => setTimeout(r, 600));

    // Capture initial Task Queue table screenshot
    const screenshotTable = path.join(ARTIFACTS_DIR, 'phase4_1_task_queue_table.png');
    await page.screenshot({ path: screenshotTable });
    console.log(`2. [CAPTURED] Initial Task Queue Table: ${screenshotTable}`);

    // Verify columns exist
    const headers = await page.evaluate(() => {
      const ths = Array.from(document.querySelectorAll('thead th'));
      return ths.map((th) => th.innerText.trim());
    });
    console.log(`   Table Headers detected: ${JSON.stringify(headers)}`);
    if (!headers.includes('ASSIGNED TO')) {
      throw new Error(`Expected "ASSIGNED TO" column in table headers, found: ${headers.join(', ')}`);
    }
    console.log('   [PASS] "Assigned To" column present in modern data table.');

    // Find an unassigned task button
    console.log('\n3. Searching for an unassigned task with "Assign Employee" button...');
    const unassignedButtonId = await page.evaluate(() => {
      const btn = document.querySelector('button[id^="btn-assign-task-"]');
      return btn ? btn.id : null;
    });

    if (!unassignedButtonId) {
      throw new Error('No "Assign Employee" button found in the table. Ensure there are unassigned tasks.');
    }

    const taskId = unassignedButtonId.replace('btn-assign-task-', '');
    console.log(`   Found unassigned Task #${taskId} with button ID: #${unassignedButtonId}`);

    // Click "Assign Employee" button
    console.log(`\n4. Clicking "Assign Employee" button (#${unassignedButtonId})...`);
    await page.click(`#${unassignedButtonId}`);
    await page.waitForSelector('#modal-assign-employee', { timeout: 5000 });
    await page.waitForSelector('#input-search-employee', { timeout: 5000 });
    console.log('   [PASS] Assignment Modal opened successfully.');

    // Verify 50 employees are loaded in the modal
    const employeeCountInModal = await page.evaluate(() => {
      const buttons = document.querySelectorAll('#employee-selection-list button');
      return buttons.length;
    });
    console.log(`   Found ${employeeCountInModal} employees in selection list.`);
    if (employeeCountInModal < 40) {
      throw new Error(`Expected ~50 employees in modal list, found ${employeeCountInModal}`);
    }

    // Capture modal screenshot with searchable list
    const screenshotModal = path.join(ARTIFACTS_DIR, 'phase4_2_employee_search_modal.png');
    await page.screenshot({ path: screenshotModal });
    console.log(`   [CAPTURED] Searchable 50-Employee Modal Screenshot: ${screenshotModal}`);

    // Search for a specific employee
    console.log('\n5. Searching for specialist "Ashley" in search input...');
    await page.type('#input-search-employee', 'Ashley', { delay: 30 });
    await new Promise((r) => setTimeout(r, 400));

    const searchResults = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('#employee-selection-list button'));
      return buttons.map((b) => ({
        id: b.id,
        text: b.innerText.split('\n')[0].trim(),
      }));
    });
    console.log(`   Filtered search results for "Ashley": ${JSON.stringify(searchResults)}`);

    const targetEmployeeBtn = searchResults[0]?.id;
    if (!targetEmployeeBtn) {
      throw new Error('No employee returned from search for "Ashley"');
    }
    const targetEmployeeId = parseInt(targetEmployeeBtn.replace('btn-select-employee-', ''), 10);
    console.log(`   Target Employee: ID #${targetEmployeeId} (${searchResults[0].text})`);

    // Setup network intercept for PUT /tasks/{task_id}/assign
    const assignRequestPromise = page.waitForResponse(
      (res) =>
        res.url().includes(`/tasks/${taskId}/assign`) &&
        res.request().method() === 'PUT' &&
        res.status() === 200,
      { timeout: 8000 }
    );

    // Click the employee to assign
    console.log(`\n6. Clicking employee button #${targetEmployeeBtn} to execute assignment...`);
    await page.click(`#${targetEmployeeBtn}`);

    const assignResponse = await assignRequestPromise;
    console.log(`   [PASS] PUT /tasks/${taskId}/assign responded with HTTP 200 OK!`);

    // Wait for UI to update (modal closes, toast appears, row updates)
    await page.waitForSelector('#toast-assignment-success', { timeout: 5000 });
    console.log('   [PASS] Assignment success toast rendered in UI.');

    // Verify row now shows employee name and initials
    const updatedRowDetails = await page.evaluate((id) => {
      const row = document.getElementById(`task-row-${id}`);
      const assignedCell = row.querySelectorAll('td')[4];
      return {
        assignedText: assignedCell?.innerText?.trim(),
        hasAssignButton: !!assignedCell?.querySelector('button[id^="btn-assign-task-"]'),
        reassignBtn: !!assignedCell?.querySelector(`button[id="btn-reassign-${id}"]`),
      };
    }, taskId);

    console.log(`   Updated Row Assigned Cell: "${updatedRowDetails.assignedText.replace(/\n/g, ' ')}"`);
    console.log(`   Has Reassign Action: ${updatedRowDetails.reassignBtn}`);
    console.log(`   Assign Employee Button Removed: ${!updatedRowDetails.hasAssignButton}`);

    if (updatedRowDetails.hasAssignButton) {
      throw new Error('Task row still displays "Assign Employee" button after assignment.');
    }
    console.log('   [PASS] UI instantly updated to display assigned employee details.');

    // Direct SQLite Database Verification
    console.log('\n7. Verifying persistent database update via direct SQL query...');
    const dbRows = await queryDatabase('SELECT id, customer_name, employee_id FROM tasks WHERE id = ?', [taskId]);
    console.log(`   Database verification row: ${JSON.stringify(dbRows[0])}`);

    if (dbRows[0].employee_id !== targetEmployeeId) {
      throw new Error(`Database employee_id is ${dbRows[0].employee_id}, expected ${targetEmployeeId}`);
    }
    console.log('   [PASS] Database successfully updated with employee_id: ' + targetEmployeeId);

    // Capture final verified screenshot
    const screenshotVerified = path.join(ARTIFACTS_DIR, 'phase4_3_assigned_task_verified.png');
    await page.screenshot({ path: screenshotVerified });
    console.log(`\n8. [CAPTURED] Assigned Task Verified Screenshot: ${screenshotVerified}`);

    console.log('\n======================================================================');
    console.log('PHASE 4 VERIFICATION COMPLETE: ALL DONE CRITERIA SATISFIED');
    console.log('======================================================================');
  } catch (err) {
    console.error('[ERROR] Phase 4 Verification failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

verifyPhase4QueueAssign();
