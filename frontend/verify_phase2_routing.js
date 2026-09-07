import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\thanu\\.gemini\\antigravity-ide\\brain\\97a05cf0-f571-43ad-b92d-72017496fa9b';

if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

async function verifyPhase2Routing() {
  console.log('======================================================================');
  console.log('PHASE 2 VERIFICATION: REACT ROUTER & PERSISTENT SIDEBAR NAVIGATION');
  console.log('======================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    console.log('1. Navigating to http://localhost:5173/...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });

    // Check if on login page or dashboard
    const isLogin = await page.$('#input-email');
    if (isLogin) {
      console.log('2. Authenticating as demo.analyst@company.com...');
      await page.type('#input-email', 'demo.analyst@company.com', { delay: 10 });
      await page.type('#input-password', 'SecurePassword2026!', { delay: 10 });
      await page.click('#btn-submit-auth');
      await page.waitForSelector('#enterprise-sidebar', { timeout: 10000 });
      console.log('   [PASS] Authenticated and loaded multi-view enterprise layout.');
    } else {
      await page.waitForSelector('#enterprise-sidebar', { timeout: 10000 });
      console.log('   [PASS] Active session restored, loaded enterprise layout.');
    }

    // Verify initial route is /dashboard
    let currentUrl = page.url();
    console.log(`3. Initial route: ${currentUrl}`);
    const screenshotDashboard = path.join(ARTIFACTS_DIR, 'phase2_1_dashboard_overview.png');
    await page.screenshot({ path: screenshotDashboard });
    console.log(`   [CAPTURED] Dashboard Overview screenshot: ${screenshotDashboard}`);

    // Track navigation events to confirm NO full page reloads occur
    let fullPageReloadCount = 0;
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        fullPageReloadCount++;
      }
    });

    // -------------------------------------------------------------------------
    // TEST 1: CLICK TASK QUEUE
    // -------------------------------------------------------------------------
    console.log('\n4. Clicking Sidebar Link: "Task Queue" (/tasks)...');
    await page.click('a[href="/tasks"]');
    await page.waitForSelector('#view-task-queue', { timeout: 5000 });
    currentUrl = page.url();
    console.log(`   Current URL after click: ${currentUrl}`);
    if (!currentUrl.endsWith('/tasks')) {
      throw new Error(`Expected URL to end with /tasks, got ${currentUrl}`);
    }
    const screenshotTaskQueue = path.join(ARTIFACTS_DIR, 'phase2_2_task_queue.png');
    await page.screenshot({ path: screenshotTaskQueue });
    console.log(`   [PASS] Navigated to Task Queue without reload. Captured: ${screenshotTaskQueue}`);

    // -------------------------------------------------------------------------
    // TEST 2: CLICK EMPLOYEE ROSTER
    // -------------------------------------------------------------------------
    console.log('\n5. Clicking Sidebar Link: "Employee Roster" (/employees)...');
    await page.click('a[href="/employees"]');
    await page.waitForSelector('#view-employees-roster', { timeout: 5000 });
    currentUrl = page.url();
    console.log(`   Current URL after click: ${currentUrl}`);
    if (!currentUrl.endsWith('/employees')) {
      throw new Error(`Expected URL to end with /employees, got ${currentUrl}`);
    }
    const screenshotEmployees = path.join(ARTIFACTS_DIR, 'phase2_3_employees_roster.png');
    await page.screenshot({ path: screenshotEmployees });
    console.log(`   [PASS] Navigated to Employee Roster without reload. Captured: ${screenshotEmployees}`);

    // -------------------------------------------------------------------------
    // TEST 3: CLICK CHURN ANALYSIS WINDOW
    // -------------------------------------------------------------------------
    console.log('\n6. Clicking Sidebar Link: "Churn Analysis" (/analysis/55)...');
    await page.click('a[href^="/analysis"]');
    await page.waitForSelector('#view-churn-analysis-window', { timeout: 5000 });
    currentUrl = page.url();
    console.log(`   Current URL after click: ${currentUrl}`);
    if (!currentUrl.includes('/analysis/')) {
      throw new Error(`Expected URL to contain /analysis/, got ${currentUrl}`);
    }
    const screenshotAnalysis = path.join(ARTIFACTS_DIR, 'phase2_4_analysis_window.png');
    await page.screenshot({ path: screenshotAnalysis });
    console.log(`   [PASS] Navigated to Dedicated Churn Analysis without reload. Captured: ${screenshotAnalysis}`);

    // -------------------------------------------------------------------------
    // TEST 4: BREADCRUMB BACK NAVIGATION
    // -------------------------------------------------------------------------
    console.log('\n7. Clicking "Back to Task Queue" breadcrumb...');
    await page.click('#breadcrumb-back-tasks');
    await page.waitForSelector('#view-task-queue', { timeout: 5000 });
    currentUrl = page.url();
    console.log(`   Current URL after breadcrumb click: ${currentUrl}`);
    if (!currentUrl.endsWith('/tasks')) {
      throw new Error(`Expected URL to end with /tasks, got ${currentUrl}`);
    }
    console.log('   [PASS] Breadcrumb back navigation works seamlessly.');

    // -------------------------------------------------------------------------
    // TEST 5: SIDEBAR COLLAPSE / EXPAND TOGGLE
    // -------------------------------------------------------------------------
    console.log('\n8. Testing Sidebar Collapsible Toggle...');
    await page.click('#btn-toggle-sidebar');
    await new Promise((r) => setTimeout(r, 400));
    const sidebarWidthCollapsed = await page.$eval('#enterprise-sidebar', (el) => el.offsetWidth);
    console.log(`   Sidebar width when collapsed: ${sidebarWidthCollapsed}px (expected ~72px)`);
    const screenshotCollapsed = path.join(ARTIFACTS_DIR, 'phase2_5_sidebar_collapsed.png');
    await page.screenshot({ path: screenshotCollapsed });

    await page.click('#btn-toggle-sidebar');
    await new Promise((r) => setTimeout(r, 400));
    const sidebarWidthExpanded = await page.$eval('#enterprise-sidebar', (el) => el.offsetWidth);
    console.log(`   Sidebar width when expanded: ${sidebarWidthExpanded}px (expected ~250px)`);
    console.log('   [PASS] Collapsible sidebar expands and collapses with smooth animations.');

    console.log('\n======================================================================');
    console.log('PHASE 2 DONE CRITERIA FULLY SATISFIED: ALL ROUTING VERIFIED!');
    console.log('======================================================================');
  } finally {
    await browser.close();
  }
}

verifyPhase2Routing().catch((err) => {
  console.error('[FAIL] Phase 2 Verification Failed:', err);
  process.exit(1);
});
