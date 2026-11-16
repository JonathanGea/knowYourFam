import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(resolve(root,path),'utf8');
const html=read('src/app/features/family-tree/family-tree.page.html');
const component=read('src/app/features/family-tree/family-tree.page.ts');
const workspace=read('src/family-explorer-workspace.css');
const original=read('src/main-parity.css');

test('navigation rail and contextual member explorer replace persistent sidebar',()=>{
  assert.match(html,/class="workspace-navigation-rail"/);
  assert.match(html,/class="workspace-explorer-panel"/);
  assert.match(html,/class="workspace-search-field"/);
  assert.match(html,/@for \(person of sidebarPeople\(\); track person\.id\)/);
  assert.match(html,/openSearchPerson\(person\.id\)/);
  assert.match(component,/readonly sidebarQuery = signal\(''\)/);
  assert.match(component,/readonly sidebarPeople = computed\(/);
  assert.match(component,/\.slice\(0, this\.searchResultsLimit\(\)\)/);
  assert.match(workspace,/width:68px;flex:0 0 68px/);
});

test('primary actions are accessible while backups stay behind settings panel',()=>{
  assert.match(html,/class="btn primary workspace-header-add"/);
  assert.match(html,/explorerTab\(\)==='settings'/);
  assert.match(html,/id="export-btn"/);
  assert.match(html,/id="rename-btn"|dialog\.set\('rename'\)/);
  assert.match(html,/\(click\)="downloadJson\(\)"/);
  assert.match(html,/routerLink="\/developer"/);
});

test('desktop focus remains readable and Fit remains explicitly available',()=>{
  assert.match(component,/width < 1150 \? 1\.0 : width < 1600 \? 1\.08 : 1\.15/);
  assert.match(component,/fitCanvasFromToolbar\(\): void/);
  assert.match(html,/dari \{\{ store\.people\(\)\.length \}\} terlihat/);
  assert.match(original,/\.main-parity-ui \.scene:not\(\.zoom-compact\) \.node-name/);
  assert.match(html,/\[title\]="node\.person\.name"/);
  assert.match(component,/readableFitCenter\(/);
  assert.match(component,/clampReadableFamilyZoom\(/);
  assert.doesNotMatch(workspace,/visibility:hidden!important;pointer-events:none!important/);
});
