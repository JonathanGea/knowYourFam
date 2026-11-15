import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const template = read('src/app/features/family-tree/family-tree.page.html');
const component = read('src/app/features/family-tree/family-tree.page.ts');
const css = read('src/main-parity.css');

test('desktop sidebar is searchable and bounded instead of rendering every member', () => {
  assert.match(template, /class="sidebar-search"/);
  assert.match(template, /@for \(person of sidebarPeople\(\); track person\.id\)/);
  const sidebar = template.slice(template.indexOf('<aside class="side"'), template.indexOf('</aside>'));
  assert.doesNotMatch(sidebar, /@for \(person of store\.people\(\); track person\.id\)/);
  assert.match(component, /readonly sidebarQuery = signal\(''\)/);
  assert.match(component, /readonly sidebarPeople = computed\(/);
  assert.match(component, /\.slice\(0, 18\)/);
  assert.match(template, /class="sidebar-person-focus"/);
  assert.match(template, /\(click\)="setFocus\(person\.id\)"/);
  assert.match(template, /class="sidebar-view-all" routerLink="\/members"/);
});

test('desktop keeps one primary add action and moves backups to collapsible tools', () => {
  assert.match(template, /id="top-add"/);
  assert.match(template, /id="add-btn"/);
  assert.match(css, /\.main-parity-ui \.header #top-add \{ display:none; \}/);
  assert.match(template, /<details class="sidebar-tools">/);
  assert.match(template, /id="export-btn"/);
  assert.match(template, /class="side-bottom"/);
});

test('desktop focus starts at a readable scale while Fit still spans the whole layout', () => {
  assert.match(component, /width < 1150 \? 1\.0 : width < 1600 \? 1\.08 : 1\.15/);
  assert.match(component, /fitCanvasFromToolbar\(\): void/);
  assert.match(template, /generasi terlihat/);
  assert.match(css, /\.main-parity-ui \.scene:not\(\.zoom-compact\) \.node-name/);
  assert.match(template, /\[title\]="node\.person\.name"/);
});
