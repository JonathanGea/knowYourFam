import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {MAIN_REFERENCE_TREE} from '../src/app/infrastructure/main-reference.data.ts';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(resolve(root,path),'utf8');
const html=read('src/app/features/family-tree/family-tree.page.html');
const css=read('src/main-parity.css');
const workspaceCss=read('src/family-explorer-workspace.css');
const ts=read('src/app/features/family-tree/family-tree.page.ts');
const store=read('src/app/application/family-tree.store.ts');

test('original tree canvas tokens and shape semantics stay intact',()=>{
  assert.match(css,/Source blob 1d52703f6572639c4b64b1e476fe7a0eba201a72/);
  for(const key of [':root{--pine:#245b43','.canvas-shell{border:1px',
    '.viewport{position:relative','.scene{position:absolute',
    '.node{position:absolute;width:185px;height:113px']){
    assert.ok(css.includes(key),'Missing core family canvas CSS: '+key);
  }
  assert.match(read('src/styles.css'),/family-explorer-workspace.css/);
});

test('Angular Family Explorer hierarchy is header, rail, optional explorer, canvas',()=>{
  const order=['class="app main-parity-ui family-explorer-page"','class="header workspace-global-header"',
    'class="body"','class="workspace-navigation-rail"',
    'class="workspace-explorer-panel"','class="main"',
    'class="canvas-shell"','class="canvas-top workspace-canvas-toolbar"',
    'class="viewport"','class="scene"','class="connections"','class="node"'];
  let last=-1;
  for(const piece of order){
    const at=html.indexOf(piece,last+1);
    assert.ok(at>last,'Missing/out-of-order workspace element '+piece);
    last=at;
  }
  assert.doesNotMatch(html,/class="mode-switch"/);
  assert.match(workspaceCss,/workspace-navigation-rail/);
});

test('tree cards preserve identity, position and single-person SVG connections',()=>{
  for(const key of ['class="node-top"','class="person-photo"','class="node-name"',
    'class="node-years"','class="node-bottom"','Profil saya']){
    assert.ok(html.includes(key),'Person card missing '+key);
  }
  assert.match(html,/\[style\.left\.px\]="node\.x"/);
  assert.match(html,/\[style\.top\.px\]="node\.y"/);
  assert.match(ts,/yearsOf\(person: Person\): string/);
  assert.match(html,/mask id="kyf-card-clearance-mask"/);
  assert.match(html,/mask="url\(#kyf-card-clearance-mask\)"/);
  for(const edge of ['edge-parent','edge-partner','edge-sibling','parent-dot','partner-dot']){
    assert.ok(html.includes(edge),'Connector style absent: '+edge);
  }
});

test('family map is secondary to one progressive exploration canvas',()=>{
  assert.match(html,/Peta keluarga/);
  assert.match(html,/Jelajahi pohon/);
  assert.match(html,/setMode\('overview'\)/);
  assert.match(html,/setMode\('focus'\)/);
  assert.match(html,/workspace-branch-picker/);
  assert.match(html,/store\.visiblePeople\(\)\.length/);
  assert.match(html,/class="branch-toggle"/);
  assert.match(html,/isBranchPinned\(control\.key\)/);
  assert.match(ts,/maybeConserveLayout/);
  assert.match(ts,/keepAnchor\(/);
  assert.match(html,/class="tree-help-button"/);
  assert.match(html,/class="tree-help-panel"/);
});

test('canvas commands retain zoom, fit, fullscreen and reliable return-to-self action',()=>{
  for(const id of ['zoom-out','zoom-value','zoom-in','fit-btn','fullscreen-btn']){
    assert.ok(html.includes('id="'+id+'"'),'Missing canvas action '+id);
  }
  assert.match(html,/returnToMyPerson\(\)/);
  assert.match(ts,/returnToMyPerson\(\): void/);
  assert.match(ts,/fitCanvasFromToolbar\(\): void/);
  assert.match(ts,/toggleFullscreen\(\): void/);
});

test('panel search, branch and settings retain original capabilities',()=>{
  assert.match(html,/class="workspace-search-field"/);
  assert.match(html,/@for \(person of sidebarPeople\(\); track person\.id\)/);
  assert.match(ts,/\.slice\(0, this\.searchResultsLimit\(\)\)/);
  for(const command of ['downloadLegacyJson()','downloadJson()',
    'importJson($event)','createNewTree()',"dialog.set('rename')",'openLink()']){
    assert.ok(html.includes(command),'Missing management command '+command);
  }
  assert.match(html,/routerLink="\/developer"/);
  assert.match(html,/routerLink="\/rules"/);
});

test('touch navigation and Person Preview stay available',()=>{
  assert.match(html,/class="mobile-nav workspace-mobile-navigation"/);
  assert.match(html,/class="mobile-menu-popover workspace-mobile-more"/);
  assert.match(html,/class="relationship-explorer person-preview"/);
  assert.match(html,/kinshipPreview\(\)\.label/);
  assert.match(html,/class="shade show"/);
  assert.match(html,/class="drawer open"/);
  assert.match(workspaceCss,/max-width:650px/);
});

test('database-first mode never seeds production with reference test people',()=>{
  assert.equal(MAIN_REFERENCE_TREE.people.length,124);
  assert.doesNotMatch(store,/mergeTestMembers\(/);
  assert.doesNotMatch(html,/Lengkapi data uji/);
});

test('source-style Angular routes and person profile remain accessible',()=>{
  const app=read('src/app/app.config.ts');
  const profile=read('src/app/features/profile/person-profile.page.html');
  for(const route of ['person/:id','members','guide','rules','developer']){
    assert.ok(app.includes("path: '"+route+"'"),'Missing route: '+route);
  }
  for(const className of ['profile-container','profile-hero','profile-tabs','profile-content']){
    assert.ok(profile.includes(className),'Missing profile element '+className);
  }
});

test('creating a new family requires explicit confirmation and does not auto-import fixtures',()=>{
  assert.match(html,/\(click\)="createNewTree\(\)"/);
  assert.match(ts,/window\.confirm\('Buat Family Tree baru/);
  assert.match(store,/async createEmptyTree\(/);
});
