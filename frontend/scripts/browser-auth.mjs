import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright';

const port = 18972;
const url = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['server.mjs'], {
  env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe']
});
let logs = '';
server.stdout.on('data', d => logs += d.toString());
server.stderr.on('data', d => logs += d.toString());
let browser;
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try { const r = await fetch(url + '/login'); if (r.ok) { ready = true; break; } }
    catch { /* retry startup */ }
    await sleep(120);
  }
  if (!ready) throw new Error('Server not ready: ' + logs.slice(-2500));
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 640 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    for (const path of ['/', '/person/example', '/members', '/guide', '/rules', '/developer', '/account']) {
      await page.goto(url + path, { waitUntil: 'domcontentloaded' });
      await page.waitForURL(current => current.pathname === '/login');
      assert.equal(new URL(page.url()).pathname, '/login', 'Protected path must redirect to login: ' + path);
      assert.equal(await page.locator('#auth-email').count(), 1, 'Email login must be present');
      assert.equal(await page.locator('#auth-password').count(), 1, 'Password login must be present');
      assert.equal(await page.getByRole('button', { name: 'Masuk', exact: true }).count(), 1);
      assert.equal(new URL(page.url()).searchParams.get('returnUrl'), path);
      assert.equal(await page.locator('.node').count(), 0, 'Private tree must never render for guests');
    }
    await page.goto(url + '/login');
    await page.getByRole('link', { name: 'Daftar gratis' }).click();
    await page.waitForURL('**/register');
    assert.equal(await page.locator('#auth-confirm').count(), 1, 'Registration confirmation password exists');
    await page.getByRole('link', { name: 'Masuk', exact: true }).click();
    await page.waitForURL('**/login');
    await page.getByRole('link', { name: 'Lupa password?' }).click();
    await page.waitForURL('**/forgot-password');
    assert.equal(await page.getByRole('button', { name: 'Kirim link reset' }).count(), 1);
    await page.goto(url + '/reset-password');
    assert.equal(await page.locator('#auth-password').count(), 1);
    // Layout regression checks run in real Chromium at four viewport sizes.
    for (const route of ['/login', '/register', '/forgot-password', '/reset-password']) {
      await page.goto(url + route);
      const metrics = await page.evaluate(() => {
        const card = document.querySelector('.auth-card').getBoundingClientRect();
        const footer = document.querySelector('.auth-footer').getBoundingClientRect();
        return {
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          cardBottom: card.bottom,
          footerTop: footer.top,
          bodyOverflowY: getComputedStyle(document.body).overflowY
        };
      });
      assert.ok(metrics.overflow <= 1,
        `${viewport.width}px ${route}: unexpected horizontal scroll ${metrics.overflow}px`);
      assert.ok(metrics.footerTop >= metrics.cardBottom - 1,
        `${viewport.width}px ${route}: footer overlaps authentication content`);
      if (viewport.width <= 650) {
        assert.notEqual(metrics.bodyOverflowY, 'hidden',
          `${viewport.width}px ${route}: mobile scrolling is locked`);
      }
    }
    assert.deepEqual(errors, [], 'Angular runtime errors');
    const storedFamily = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('knowyourfam')));
    assert.deepEqual(storedFamily, [], 'New browser session must not write family data to localStorage');
    await context.close();
  }
  console.log('Login-required routes and auth-page navigation smoke tests passed');
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
