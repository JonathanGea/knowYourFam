import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';

async function availablePort() {
  const probe = createServer();
  await new Promise((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', resolve);
  });
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  return port;
}

const port = await availablePort();
const base = 'http://127.0.0.1:' + port;
const app = spawn(process.execPath, ['server.mjs'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe']
});
let log = '';
app.stdout.on('data', data => { log += data.toString(); });
app.stderr.on('data', data => { log += data.toString(); });

try {
  let healthy = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    if (app.exitCode !== null) throw new Error('Server exited: ' + log);
    try {
      const response = await fetch(base + '/health');
      if (response.ok) {
        assert.deepEqual(await response.json(), {status:'ok'});
        healthy = true;
        break;
      }
    } catch { /* Server not listening yet. */ }
    await sleep(100);
  }
  assert.ok(healthy, 'Static server healthcheck failed: ' + log);
  for (const route of ['/', '/developer']) {
    const response = await fetch(base + route);
    assert.equal(response.status, 200, route);
    assert.match(await response.text(), /<app-root\b/i, route);
  }
  const asset404 = await fetch(base + '/missing-bundle.js');
  assert.equal(asset404.status, 404);
  const head = await fetch(base + '/', {method:'HEAD'});
  assert.equal(head.status, 200);
  console.log('Static server smoke test passed: /health, /, /developer, 404 and HEAD');
} finally {
  app.kill('SIGTERM');
}
