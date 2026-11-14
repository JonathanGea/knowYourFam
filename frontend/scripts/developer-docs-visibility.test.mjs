import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

test('developer documentation toggle defaults to enabled in development and disabled in production', () => {
  const dev = read('src/environments/environment.ts');
  const prod = read('src/environments/environment.production.ts');
  assert.match(dev, /showDeveloperDocs:\s*true/);
  assert.match(prod, /showDeveloperDocs:\s*false/);
});

test('Angular production build replaces the developer environment configuration', () => {
  const config = JSON.parse(read('angular.json'));
  const build = config.projects.knowyourfam.architect.build;
  assert.ok(build.configurations.production.fileReplacements.some(replacement =>
    replacement.replace === 'src/environments/environment.ts'
    && replacement.with === 'src/environments/environment.production.ts'));
  assert.equal(build.defaultConfiguration, 'production');
  assert.equal(config.projects.knowyourfam.architect.serve.defaultConfiguration, 'development');
});

test('developer route and temporary navigation both use the environment flag', () => {
  const router = read('src/app/app.config.ts');
  const page = read('src/app/features/family-tree/family-tree.page.ts');
  const template = read('src/app/features/family-tree/family-tree.page.html');
  assert.match(router, /environment\.showDeveloperDocs/);
  assert.match(router, /path:\s*'developer'/);
  assert.match(page, /showDeveloperDocs\s*=\s*environment\.showDeveloperDocs/);
  assert.match(template, /@if\s*\(showDeveloperDocs\)/);
  assert.match(template, /DEV ONLY/);
});
