const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1440,900']
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle0' });
  const emailInput = await page.$('#input-email');
  if (emailInput) {
    await page.type('#input-email', 'enterprise.lead@churnguard.internal');
    await page.type('#input-password', 'Enterprise2026!');
    await page.click('#btn-submit-auth');
    await page.waitForSelector('#enterprise-sidebar', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 1000));
  }
  const info = await page.evaluate(() => {
    const canvas = document.getElementById('canvas-3d-network');
    let nonZeroAlpha = 0;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 3; i < img.data.length; i += 4) {
        if (img.data[i] > 0) nonZeroAlpha++;
      }
    }
    const bg = document.getElementById('dashboard-3d-background');
    return {
      currentUrl: window.location.href,
      hasDashboardBg: !!bg,
      bgZIndex: bg ? window.getComputedStyle(bg).zIndex : null,
      bgOpacity: bg ? window.getComputedStyle(bg).opacity : null,
      canvasWidth: canvas ? canvas.width : 0,
      canvasHeight: canvas ? canvas.height : 0,
      nonZeroPixelsRendered: nonZeroAlpha,
    };
  });
  console.log('Background render audit:', info);
  await browser.close();
})();
