const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.resolve(__dirname, '../docs/screenshots');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function captureAll() {
  console.log('Starting screenshot captures...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  try {
    // 1. Capture Login Page
    console.log('1. Capturing Login Page...');
    await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'networkidle0' });
    await page.waitForSelector('#input-email', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(OUTPUT_DIR, '01_login.png') });
    console.log('Captured 01_login.png');

    // 2. Perform Login
    console.log('Logging in as demo.analyst@company.com...');
    await page.type('#input-email', 'demo.analyst@company.com');
    await page.type('#input-password', 'SecurePassword2026!');
    await page.click('#btn-submit-auth');
    await page.waitForSelector('#enterprise-sidebar', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 1500));

    // 3. Capture Overview Dashboard
    console.log('2. Capturing Overview Dashboard...');
    await page.goto('http://127.0.0.1:5173/overview', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(OUTPUT_DIR, '02_overview.png') });
    console.log('Captured 02_overview.png');

    // 4. Capture Task Queue
    console.log('3. Capturing Task Queue...');
    await page.goto('http://127.0.0.1:5173/tasks', { waitUntil: 'networkidle0' });
    await page.waitForSelector('#table-task-queue', { timeout: 10000 }).catch(() => null);
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(OUTPUT_DIR, '03_task_queue.png') });
    console.log('Captured 03_task_queue.png');

    // 5. Capture Employee Roster
    console.log('4. Capturing Employee Roster...');
    await page.goto('http://127.0.0.1:5173/employees', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(OUTPUT_DIR, '04_employee_roster.png') });
    console.log('Captured 04_employee_roster.png');

    // 6. Capture Churn Analysis Detail View
    console.log('5. Capturing Churn Analysis Detail...');
    await page.goto('http://127.0.0.1:5173/analysis/1', { waitUntil: 'networkidle0' });
    await page.waitForSelector('#view-churn-analysis-window', { timeout: 10000 }).catch(() => null);
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(OUTPUT_DIR, '05_churn_analysis.png') });
    console.log('Captured 05_churn_analysis.png');

    console.log('All 5 screenshots successfully captured and saved to docs/screenshots!');
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    await browser.close();
  }
}

captureAll();
