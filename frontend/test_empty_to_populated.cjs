const puppeteer = require('puppeteer-core');

async function testTransition() {
  console.log('=== TESTING TRANSITION FROM EMPTY STATE TO ADD & DELETE ===');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  try {
    // 1. Login
    await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#input-email', { timeout: 10000 });
    await page.type('#input-email', 'demo.analyst@company.com');
    await page.type('#input-password', 'SecurePassword2026!');
    await page.click('#btn-submit-auth');
    await page.waitForSelector('#enterprise-sidebar', { timeout: 10000 });

    // 2. Go to Task Queue
    await page.goto('http://127.0.0.1:5173/tasks', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#queue-empty-state', { timeout: 10000 });
    console.log('Empty state verified on Task Queue.');

    // 3. Click "+ Add First Customer" button in empty state
    await page.click('#queue-empty-state button');
    await page.waitForSelector('#modal-add-customer', { timeout: 5000 });
    console.log('Add Customer modal opened successfully.');

    // 4. Fill form
    await page.type('#input-new-cust-name', 'Horizon Cloud Systems');

    // 5. Submit
    await page.click('#btn-submit-new-customer');
    await page.waitForSelector('#toast-queue-notification', { timeout: 10000 });
    console.log('Customer successfully created!');

    // 6. Verify table now displays 1 row
    await page.waitForSelector('tr[id^="task-row-"]', { timeout: 5000 });
    const rowText = await page.$eval('tr[id^="task-row-"]', (el) => el.innerText);
    console.log('Created task row content:', rowText.split('\t')[0] || rowText.slice(0, 60));

    // 7. Delete the customer record via UI to leave database completely clean
    const deleteBtn = await page.$('button[id^="btn-delete-task-"]');
    if (deleteBtn) {
      console.log('Triggering Delete button via DOM click...');
      await deleteBtn.evaluate((b) => b.click());
      // Confirm delete in dialog
      await page.waitForSelector('#btn-confirm-delete-customer', { timeout: 5000 });
      console.log('Confirmation dialog opened. Confirming deletion...');
      await page.$eval('#btn-confirm-delete-customer', (b) => b.click());
      await page.waitForSelector('#queue-empty-state', { timeout: 10000 });
      console.log('Deleted successfully! Empty state returned gracefully.');
    }

    console.log('=== TRANSITION & ZERO RECORD TEST PASSED ===');
  } catch (err) {
    console.error('Transition test failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testTransition();
