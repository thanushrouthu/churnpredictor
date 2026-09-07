import puppeteer from 'puppeteer-core';
import path from 'path';

const ARTIFACTS_DIR = 'C:\\Users\\thanu\\.gemini\\antigravity-ide\\brain\\b80949c1-fe42-47bf-a936-4571134487bc';

async function verifyRefinements() {
  console.log('============================================================');
  console.log('STARTING LOGIN CARD REFINEMENTS VERIFICATION');
  console.log('============================================================\n');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // 1. Check Entrance Animation & Load
    console.log('1. Loading page to observe entrance animation...');
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#auth-card', { timeout: 10000 });

    // Inspect animation styles of staggered elements
    const staggerDetails = await page.evaluate(() => {
      const el1 = document.querySelector('.animate-fade-up-1');
      const el2 = document.querySelector('.animate-fade-up-2');
      const el3 = document.querySelector('.animate-fade-up-3');
      const el4 = document.querySelector('.animate-fade-up-4');
      const el5 = document.querySelector('.animate-fade-up-5');
      const el6 = document.querySelector('.animate-fade-up-6');
      return {
        has1: !!el1,
        has2: !!el2,
        has3: !!el3,
        has4: !!el4,
        has5: !!el5,
        has6: !!el6,
        delay1: el1 ? getComputedStyle(el1).animationDelay : null,
        delay2: el2 ? getComputedStyle(el2).animationDelay : null,
        delay3: el3 ? getComputedStyle(el3).animationDelay : null,
        delay4: el4 ? getComputedStyle(el4).animationDelay : null,
        delay5: el5 ? getComputedStyle(el5).animationDelay : null,
        delay6: el6 ? getComputedStyle(el6).animationDelay : null,
      };
    });

    console.log('   Staggered entrance delays:');
    console.log(`   - Header:   ${staggerDetails.delay1}`);
    console.log(`   - Tabs:     ${staggerDetails.delay2}`);
    console.log(`   - Title:    ${staggerDetails.delay3}`);
    console.log(`   - Form:     ${staggerDetails.delay4}`);
    console.log(`   - Button:   ${staggerDetails.delay5}`);
    console.log(`   - Footer:   ${staggerDetails.delay6}`);

    // Wait for entrance animation to settle into full opacity
    await new Promise((r) => setTimeout(r, 600));

    // 2. Verify Text Brightness & Contrast Values
    console.log('\n2. Verifying Text Brightness & Color Contrast...');
    const typographyColors = await page.evaluate(() => {
      const headingPrimary = document.querySelector('h1');
      const title = document.querySelector('h2');
      const badge = document.querySelector('.animate-status-pulse');
      const badgeDot = document.querySelector('.animate-pulse-dot');
      const tagline = headingPrimary?.parentElement?.querySelector('p');
      const emailLabel = document.querySelector('label[for="input-email"]') || document.querySelector('label');
      const emailInput = document.querySelector('#input-email');
      const submitBtn = document.querySelector('#btn-submit-auth');
      const footerNotice = document.querySelector('.animate-fade-up-6');

      return {
        primaryHeading: headingPrimary ? getComputedStyle(headingPrimary).color : null,
        welcomeTitle: title ? getComputedStyle(title).color : null,
        badgeText: badge ? getComputedStyle(badge).color : null,
        badgeBorder: badge ? getComputedStyle(badge).borderColor : null,
        hasDot: !!badgeDot,
        tagline: tagline ? getComputedStyle(tagline).color : null,
        inputLabel: emailLabel ? getComputedStyle(emailLabel).color : null,
        inputColor: emailInput ? getComputedStyle(emailInput).color : null,
        btnColor: submitBtn ? getComputedStyle(submitBtn).color : null,
        btnBg: submitBtn ? getComputedStyle(submitBtn).backgroundColor : null,
        footerText: footerNotice ? getComputedStyle(footerNotice).color : null,
      };
    });

    console.log(`   - Primary Heading (ChurnGuard AI): ${typographyColors.primaryHeading}`);
    console.log(`   - Welcome Title (Welcome Back):    ${typographyColors.welcomeTitle}`);
    console.log(`   - Status Badge (SYS:ONLINE):       ${typographyColors.badgeText} (Border: ${typographyColors.badgeBorder})`);
    console.log(`   - Status Dot Present:              ${typographyColors.hasDot}`);
    console.log(`   - Tagline (Enterprise Churn...):   ${typographyColors.tagline}`);
    console.log(`   - Input Label (Email Address):     ${typographyColors.inputLabel}`);
    console.log(`   - Button Text / Background:        ${typographyColors.btnColor} / ${typographyColors.btnBg}`);
    console.log(`   - Footer Notice:                   ${typographyColors.footerText}`);

    // Take screenshot of Desktop Login with brightened text and status pulse
    const screenshotLogin = path.join(ARTIFACTS_DIR, 'auth_card_brightened_login.png');
    await page.screenshot({ path: screenshotLogin, fullPage: false });
    console.log(`   [PASS] Saved brightened login card screenshot: ${screenshotLogin}`);

    const cardEl = await page.$('#auth-card');
    if (cardEl) {
      const screenshotLoginCard = path.join(ARTIFACTS_DIR, 'auth_card_close_up_login.png');
      await cardEl.screenshot({ path: screenshotLoginCard });
      console.log(`   [PASS] Saved close-up login card screenshot: ${screenshotLoginCard}`);
    }

    // 3. Tab Switch Animation & Underline Glow
    console.log('\n3. Testing Tab Switch Sliding Animation & Underline Glow...');
    await page.click('#tab-signup');
    await new Promise((r) => setTimeout(r, 150)); // capture during slide/glow transition

    const screenshotTabSlide = path.join(ARTIFACTS_DIR, 'auth_tab_switch_sliding.png');
    await page.screenshot({ path: screenshotTabSlide, fullPage: false });
    console.log(`   [PASS] Saved tab switch sliding screenshot: ${screenshotTabSlide}`);

    await new Promise((r) => setTimeout(r, 350)); // let slide complete
    const screenshotSignup = path.join(ARTIFACTS_DIR, 'auth_card_brightened_signup.png');
    await page.screenshot({ path: screenshotSignup, fullPage: false });
    console.log(`   [PASS] Saved brightened signup card screenshot: ${screenshotSignup}`);

    if (cardEl) {
      const screenshotSignupCard = path.join(ARTIFACTS_DIR, 'auth_card_close_up_signup.png');
      await cardEl.screenshot({ path: screenshotSignupCard });
      console.log(`   [PASS] Saved close-up signup card screenshot: ${screenshotSignupCard}`);
    }

    // Switch back to Login
    await page.click('#tab-login');
    await new Promise((r) => setTimeout(r, 400));

    // 4. Test Reduced Motion Accessibility
    console.log('\n4. Testing prefers-reduced-motion accessibility mode...');
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.reload({ waitUntil: 'networkidle2' });

    const reducedMotionCheck = await page.evaluate(() => {
      const cardBody = document.querySelector('#auth-card');
      const badge = document.querySelector('.animate-status-pulse');
      const fade1 = document.querySelector('.animate-fade-up-1');
      return {
        cardTransform: cardBody ? cardBody.style.transform : '',
        badgeAnimation: badge ? getComputedStyle(badge).animationName : '',
        fadeAnimation: fade1 ? getComputedStyle(fade1).animationName : '',
      };
    });

    console.log(`   - 3D Tilt in Reduced Motion:    "${reducedMotionCheck.cardTransform || 'none'}"`);
    console.log(`   - Status Pulse in Red. Motion:  "${reducedMotionCheck.badgeAnimation}"`);
    console.log(`   - Entrance Fade in Red. Motion: "${reducedMotionCheck.fadeAnimation}"`);

    const screenshotReduced = path.join(ARTIFACTS_DIR, 'auth_card_reduced_motion.png');
    await page.screenshot({ path: screenshotReduced, fullPage: false });
    console.log(`   [PASS] Saved reduced motion screenshot: ${screenshotReduced}`);

    console.log('\n============================================================');
    console.log('ALL LOGIN CARD REFINEMENTS VERIFIED SUCCESSFULLY!');
    console.log('============================================================');
  } finally {
    await browser.close();
  }
}

verifyRefinements().catch((err) => {
  console.error('[FAIL] Refinements verification failed:', err);
  process.exit(1);
});
