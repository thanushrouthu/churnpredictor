const puppeteer = require('puppeteer-core');
const path = require('path');

const ARTIFACT_DIR = path.resolve('C:/Users/thanu/.gemini/antigravity-ide/brain/2015c562-4a66-4c99-b6a4-89664aab9d08');

async function verifyEmptyStates() {
  console.log('=== STARTING EMPTY STATE VERIFICATION ===');
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
    console.log('1. Navigating to login...');
    await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#input-email', { timeout: 15000 });
    await page.type('#input-email', 'demo.analyst@company.com');
    await page.type('#input-password', 'SecurePassword2026!');
    await page.click('#btn-submit-auth');
    await page.waitForSelector('#enterprise-sidebar', { timeout: 15000 });
    console.log('Authentication confirmed!');

    // 2. Overview Empty State
    console.log('\n2. Checking Overview (/)...');
    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#overview-empty-state', { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 1200));

    const overviewKpis = await page.$$eval('[data-kpi-title]', (els) =>
      els.map((e) => ({
        title: e.getAttribute('data-kpi-title') || e.innerText.split('\n')[0],
        value: e.querySelector('[data-kpi-value]')?.innerText || '',
      }))
    );
    console.log('Overview KPIs:', overviewKpis);

    const emptyTextOverview = await page.$eval('#overview-empty-state', (el) => el.innerText);
    console.log('Overview Empty State text contains:', emptyTextOverview.slice(0, 80) + '...');

    const overviewShotPath = path.join(ARTIFACT_DIR, 'overview_empty_state.png');
    await page.screenshot({ path: overviewShotPath, fullPage: false });
    console.log(`Saved screenshot to ${overviewShotPath}`);

    // 3. Task Queue Empty State
    console.log('\n3. Checking Task Queue (/tasks)...');
    await page.goto('http://127.0.0.1:5173/tasks', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#queue-empty-state', { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 1200));

    const queueEmptyText = await page.$eval('#queue-empty-state', (el) => el.innerText);
    console.log('Queue Empty State text contains:', queueEmptyText.slice(0, 80) + '...');

    const taskQueueShotPath = path.join(ARTIFACT_DIR, 'task_queue_empty_state.png');
    await page.screenshot({ path: taskQueueShotPath, fullPage: false });
    console.log(`Saved screenshot to ${taskQueueShotPath}`);

    // 4. Employees Roster Empty State
    console.log('\n4. Checking Employee Roster (/employees)...');
    await page.goto('http://127.0.0.1:5173/employees', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#roster-empty-state', { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 1200));

    const totalEmps = await page.$eval('#stat-total-employees', (el) => el.innerText.trim());
    const totalTasks = await page.$eval('#stat-total-tasks', (el) => el.innerText.trim());
    console.log(`Employee Roster stats: Specialists = ${totalEmps}, Tasks = ${totalTasks}`);

    const rosterEmptyText = await page.$eval('#roster-empty-state', (el) => el.innerText);
    console.log('Roster Empty State text contains:', rosterEmptyText.slice(0, 80) + '...');

    const employeesShotPath = path.join(ARTIFACT_DIR, 'employees_empty_state.png');
    await page.screenshot({ path: employeesShotPath, fullPage: false });
    console.log(`Saved screenshot to ${employeesShotPath}`);

    console.log('\n=== EMPTY STATE VERIFICATION COMPLETED SUCCESSFULLY ===');
    console.log(`Console errors during test: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log('Errors:', consoleErrors);
    }
  } catch (err) {
    console.error('VERIFICATION FAILED:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

verifyEmptyStates();
