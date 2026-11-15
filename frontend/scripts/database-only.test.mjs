import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory()
    ? walk(resolve(dir, e.name)) : e.name.endsWith('.ts') ? [resolve(dir, e.name)] : []);
}

test('Angular sources never read or write browser-local family state', () => {
  for (const file of walk(resolve(root, 'src/app'))) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), /\blocalStorage\b/, file);
  }
  assert.equal(existsSync(resolve(root, 'src/app/infrastructure/demo-family-tree.repository.ts')), false);
});
test('all data routes require Supabase authentication', () => {
  const app = read('src/app/app.config.ts');
  const lines = app.split('\n');
  for (const path of ["''", "'person/:id'", "'members'", "'guide'", "'guide/:id'", "'rules'", "'developer'"]) {
    assert.ok(lines.some(line => line.includes('path: ' + path + ',') && line.includes('canActivate: [requireCloudAuth]')),
      'Protected route missing: ' + path);
  }
  assert.match(app, /useClass: SupabaseFamilyTreeRepository/);
});
test('repository requires auth and never falls back to demo', () => {
  const adapter = read('src/app/infrastructure/supabase-family-tree.repository.ts');
  const auth = read('src/app/infrastructure/supabase-connection.service.ts');
  assert.equal((adapter.match(/requireUserId\(\)/g) || []).length, 2);
  assert.doesNotMatch(adapter, /DemoFamilyTreeRepository|this\.demo\.load|this\.demo\.save/);
  assert.match(auth, /storage: sessionStorage/);
  assert.match(read('src/app/infrastructure/learning-progress.service.ts'), /\.from\('user_learning_states'\)/);
});
