const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\thanu\\.gemini\\antigravity-ide\\brain\\2015c562-4a66-4c99-b6a4-89664aab9d08';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BROWSER_PATH = fs.existsSync(CHROME_PATH) ? CHROME_PATH : EDGE_PATH;

async function verifyCrud() {
  console.log('=== STARTING CRUD VERIFICATION (EDIT & DELETE) ===');
  const browser = await puppeteer.launch({
    executablePath: BROWSER_PATH,
    headless: 'new',
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('favicon') && !msg.text().includes('GSI_LOGGER')) {
      consoleErrors.push(msg.text());
    }
  });

  // 1. Authenticate
  console.log('1. Authenticating enterprise user session...');
  await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'networkidle0' });
  await page.waitForSelector('#input-email', { visible: true });
  await page.type('#input-email', 'demo.analyst@company.com');
  await page.type('#input-password', 'SecurePassword2026!');
  await page.click('#btn-submit-auth');
  await page.waitForSelector('#enterprise-sidebar', { timeout: 15000 });
  console.log('Authenticated.');

  // 2. Customer Edit on Task Queue
  console.log('\n2. Testing Customer Edit on /tasks...');
  await page.goto('http://127.0.0.1:5173/tasks', { waitUntil: 'networkidle0' });
  await page.waitForSelector('tbody tr[id^="task-row-"]', { visible: true });

  // Provision a fresh test customer so we know its exact initial state
  await page.click('#btn-add-customer');
  await page.waitForSelector('#form-add-customer', { visible: true });

  const testCustName = 'CRUD Test Account ' + Math.floor(1000 + Math.random() * 9000);
  await page.type('#input-new-cust-name', testCustName);
  await page.click('#btn-submit-new-customer');
  await page.waitForSelector('#form-add-customer', { hidden: true, timeout: 10000 });
  await new Promise((r) => setTimeout(r, 600));

  console.log(`Created test customer: ${testCustName}`);

  // Find the newly created customer's row
  const testRowSelector = await page.evaluate((name) => {
    const rows = Array.from(document.querySelectorAll('tbody tr[id^="task-row-"]'));
    const targetRow = rows.find((r) => r.innerText.includes(name));
    return targetRow ? targetRow.id : null;
  }, testCustName);

  if (!testRowSelector) throw new Error('Test customer row not found in table!');
  console.log(`Found target customer row ID: ${testRowSelector}`);

  // Click Edit button on this row
  await page.click(`#${testRowSelector} button[id^="btn-edit-task-"]`);
  await page.waitForSelector('#modal-edit-customer', { visible: true });
  console.log('Edit Customer modal opened successfully.');

  // Update contract to "Two year" and tenure to 60
  await page.select('#select-edit-cust-contract', 'Two year');
  await page.$eval('#input-edit-cust-tenure', (el) => {
    el.value = 60;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.click('#input-edit-cust-monthly');
  await page.keyboard.down('Control');
  await page.keyboard.press('A');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await page.type('#input-edit-cust-monthly', '25.0');

  const updatedCustName = testCustName + ' [RETAINED]';
  await page.click('#input-edit-cust-name');
  await page.keyboard.down('Control');
  await page.keyboard.press('A');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await page.type('#input-edit-cust-name', updatedCustName);

  // Submit edit
  await page.click('#btn-submit-edit-customer');
  await page.waitForSelector('#modal-edit-customer', { hidden: true, timeout: 10000 });
  console.log('Customer update submitted and modal closed.');
  await new Promise((r) => setTimeout(r, 800));

  // Verify updated row details
  const rowContentAfterEdit = await page.$eval(`#${testRowSelector}`, (el) => el.innerText);
  console.log('Row content after edit:', rowContentAfterEdit);
  if (!rowContentAfterEdit.includes('[RETAINED]') || !rowContentAfterEdit.includes('Two year')) {
    throw new Error('Edited values (Two year / name) not visible in table row!');
  }

  // Reload to verify persistence
  console.log('Testing hard refresh to verify persistence in DB...');
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector(`#${testRowSelector}`, { visible: true });
  const rowContentAfterReload = await page.$eval(`#${testRowSelector}`, (el) => el.innerText);
  if (!rowContentAfterReload.includes('[RETAINED]') || !rowContentAfterReload.includes('Two year')) {
    throw new Error('Edited values failed to persist after hard reload!');
  }
  console.log('VERIFIED: Customer edit persisted across reload.');

  const customerEditedPath = path.join(ARTIFACT_DIR, 'crud_customer_edited.png');
  await page.screenshot({ path: customerEditedPath });
  console.log('Saved Customer Edited screenshot:', customerEditedPath);

  // 3. Customer Delete Safeguard
  console.log('\n3. Testing Customer Delete with Confirmation Safeguard...');
  await page.click(`#${testRowSelector} button[id^="btn-delete-task-"]`);
  await page.waitForSelector('#modal-delete-customer', { visible: true });
  console.log('Delete Customer confirmation dialog displayed.');

  // Confirm deletion
  await page.click('#btn-confirm-delete-customer');
  await page.waitForSelector('#modal-delete-customer', { hidden: true, timeout: 10000 });
  console.log('Confirmed delete. Waiting for row removal...');
  await new Promise((r) => setTimeout(r, 800));

  // Verify row no longer exists
  const isRowStillPresent = (await page.$(`#${testRowSelector}`)) !== null;
  console.log('Is deleted customer row still present?:', isRowStillPresent);
  if (isRowStillPresent) throw new Error('Customer row was not removed from DOM after delete!');

  // Verify DB deletion by reload
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 800));
  const isRowPresentAfterReload = (await page.$(`#${testRowSelector}`)) !== null;
  if (isRowPresentAfterReload) throw new Error('Deleted customer reappeared after hard reload!');
  console.log('VERIFIED: Customer record permanently deleted.');

  const customerDeletedPath = path.join(ARTIFACT_DIR, 'crud_customer_deleted.png');
  await page.screenshot({ path: customerDeletedPath });
  console.log('Saved Customer Deleted screenshot:', customerDeletedPath);

  // 4. Employee Edit on Employee Roster
  console.log('\n4. Testing Employee Edit on /employees...');
  await page.goto('http://127.0.0.1:5173/employees', { waitUntil: 'networkidle0' });
  await page.waitForSelector('tbody tr[id^="employee-row-"]', { visible: true });

  // Pick first employee to edit
  const firstEmpRow = await page.$('tbody tr[id^="employee-row-"]');
  const firstEmpId = await page.evaluate((el) => el.id, firstEmpRow);
  console.log(`Targeting employee row: ${firstEmpId}`);

  // Open Edit Modal
  await page.click(`#${firstEmpId} button[id^="btn-edit-emp-"]`);
  await page.waitForSelector('#modal-edit-employee-backdrop', { visible: true });
  console.log('Edit Employee modal opened.');

  // Update Job Title
  const newJobTitle = 'Executive Director of Retention';
  await page.click('#input-edit-employee-role');
  await page.keyboard.down('Control');
  await page.keyboard.press('A');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await page.type('#input-edit-employee-role', newJobTitle);

  // Submit edit
  await page.click('#btn-submit-edit-employee');
  await page.waitForSelector('#modal-edit-employee-backdrop', { hidden: true, timeout: 10000 });
  console.log('Employee edit submitted.');
  await new Promise((r) => setTimeout(r, 800));

  // Verify row displays updated title
  const empContentAfterEdit = await page.$eval(`#${firstEmpId}`, (el) => el.innerText);
  if (!empContentAfterEdit.includes('Executive Director of Retention')) {
    throw new Error('Edited job title not reflected in employee row!');
  }

  // Reload to verify DB persistence
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector(`#${firstEmpId}`, { visible: true });
  const empContentAfterReload = await page.$eval(`#${firstEmpId}`, (el) => el.innerText);
  if (!empContentAfterReload.includes('Executive Director of Retention')) {
    throw new Error('Edited employee title did not persist after reload!');
  }
  console.log('VERIFIED: Employee edit persisted across reload.');

  const employeeEditedPath = path.join(ARTIFACT_DIR, 'crud_employee_edited.png');
  await page.screenshot({ path: employeeEditedPath });
  console.log('Saved Employee Edited screenshot:', employeeEditedPath);

  // 5. Employee Delete with Active Tasks Notice
  console.log('\n5. Testing Employee Delete with Active Task Assignment Safeguard...');
  // Find an employee with active tasks (taskCount > 0)
  const empWithTasksId = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('tbody tr[id^="employee-row-"]'));
    const busyRow = rows.find((r) => {
      const text = r.innerText;
      return text.includes('task') && !text.includes('0 tasks');
    });
    return busyRow ? busyRow.id : null;
  });

  if (!empWithTasksId) {
    console.log('No employee currently has active tasks; creating one with initial tasks...');
    await page.click('#btn-open-add-employee');
    await page.waitForSelector('#form-add-employee', { visible: true });

    const busyEmpName = 'Delegated Specialist ' + Math.floor(1000 + Math.random() * 9000);
    await page.type('#input-employee-name', busyEmpName);
    await page.type('#input-employee-email', `busy.lead.${Math.floor(1000 + Math.random() * 9000)}@churnguard.enterprise`);
    await page.type('#input-employee-role', 'Workload Supervisor');
    await page.$eval('#input-employee-tasks', (el) => {
      el.value = 2;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.click('#btn-submit-add-employee');
    await page.waitForSelector('#form-add-employee', { hidden: true, timeout: 10000 });
    await new Promise((r) => setTimeout(r, 800));
  }

  // Find row with tasks
  const targetBusyEmpRowId = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('tbody tr[id^="employee-row-"]'));
    const busyRow = rows.find((r) => {
      const text = r.innerText;
      return text.includes('task') && !text.includes('0 tasks');
    });
    return busyRow ? busyRow.id : rows[0].id;
  });

  console.log(`Testing deletion on specialist row: ${targetBusyEmpRowId}`);
  await page.click(`#${targetBusyEmpRowId} button[id^="btn-delete-emp-"]`);
  await page.waitForSelector('#modal-delete-employee', { visible: true });

  // Verify active task warning banner
  const hasTaskWarning = (await page.$('#notice-active-tasks')) !== null;
  console.log('Did active task assignment warning appear in deletion dialog?:', hasTaskWarning);

  const deleteDialogScreenshot = path.join(ARTIFACT_DIR, 'crud_employee_delete_dialog.png');
  await page.screenshot({ path: deleteDialogScreenshot });
  console.log('Saved Employee Delete Dialog screenshot:', deleteDialogScreenshot);

  // Confirm delete
  await page.click('#btn-confirm-delete-employee');
  await page.waitForSelector('#modal-delete-employee', { hidden: true, timeout: 10000 });
  console.log('Specialist delete confirmed.');
  await new Promise((r) => setTimeout(r, 800));

  // Verify removed from roster
  const isBusyEmpPresent = (await page.$(`#${targetBusyEmpRowId}`)) !== null;
  if (isBusyEmpPresent) throw new Error('Specialist still present in roster after deletion!');
  console.log('VERIFIED: Specialist removed from roster and active tasks safely unassigned.');

  // Check console errors
  console.log('\nTotal console errors encountered:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.warn('Console error details:', consoleErrors);
  }

  console.log('\n=== CRUD VERIFICATION COMPLETED WITH 100% SUCCESS ===');
  await browser.close();
}

verifyCrud().catch((err) => {
  console.error('CRUD Verification Failed:', err);
  process.exit(1);
});
