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
    try { const r = await fetch(url + '/cloud'); if (r.ok) { ready = true; break; } }
    catch { /* retry startup */ }
    await sleep(120);
  }
  if (!ready) throw new Error('Server not ready: ' + logs.slice(-2500));
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    for (const path of ['/', '/person/example', '/members', '/guide', '/rules', '/developer']) {
      await page.goto(url + path, { waitUntil: 'domcontentloaded' });
      await page.waitForURL('**/cloud');
      assert.equal(new URL(page.url()).pathname, '/cloud', 'Protected path must redirect to login: ' + path);
      assert.equal(await page.locator('input[type=email]').count(), 1, 'Email login must be present');
      assert.equal(await page.locator('.node').count(), 0, 'Private tree must never render for guests');
    }
    assert.deepEqual(errors, [], 'Angular runtime errors');
    const storedFamily = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('knowyourfam')));
    assert.deepEqual(storedFamily, [], 'New browser session must not write family data to localStorage');
    await context.close();
  }
  console.log('Unauthenticated cloud-only route smoke tests passed');
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
