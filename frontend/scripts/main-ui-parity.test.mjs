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
const ts=read('src/app/features/family-tree/family-tree.page.ts');
const store=read('src/app/application/family-tree.store.ts');

test('main source theme is pinned and covers exact core shell components',()=>{
  assert.match(css,/Source blob 1d52703f6572639c4b64b1e476fe7a0eba201a72/);
  for(const key of [':root{--pine:#245b43','.header{height:68px','.body{flex:1',
    '.side{background:#fff','.canvas-shell{border:1px','.viewport{position:relative',
    '.scene{position:absolute','.node{position:absolute;width:185px;height:113px',
    '.mobile-nav{display:none','.focus-toolbar{display:flex']){
    assert.ok(css.includes(key),'Missing original main CSS: '+key);
  }
});

test('Angular template follows main topbar/sidebar/heading/stats/canvas hierarchy',()=>{
  const order=['class="app main-parity-ui"','class="header"','class="body"','class="side"',
    'class="main"','class="heading"','class="stats"','class="canvas-shell"',
    'class="canvas-top"','class="focus-toolbar"','class="viewport"',
    'class="scene"','class="connections"','class="node"'];
  let last=-1;
  for(const piece of order){
    const at=html.indexOf(piece,last+1);
    assert.ok(at>last,'Missing or out-of-order source UI element '+piece);
    last=at;
  }
});

test('Angular person cards match main 185x113 layout and card information',()=>{
  for(const key of ['class="node-top"','class="person-photo"','class="node-name"',
    'class="node-years"','class="node-bottom"','Profil saya','hubungan','•••']){
    assert.ok(html.includes(key),'Person card missing '+key);
  }
  assert.match(html,/\[style\.left\.px\]="node\.x"/);
  assert.match(html,/\[style\.top\.px\]="node\.y"/);
  assert.match(ts,/relationshipCount\(id: string\): number/);
  assert.match(ts,/yearsOf\(person: Person\): string/);
});

test('main-shaped SVG connectors retain safe-card mask and source edge semantics',()=>{
  assert.match(html,/mask id="kyf-card-clearance-mask"/);
  assert.match(html,/mask="url\(#kyf-card-clearance-mask\)"/);
  for(const edge of ['edge-parent','edge-partner','edge-sibling','parent-dot','partner-dot']) {
    assert.ok(html.includes(edge),'Connector style absent: '+edge);
  }
  assert.match(html,/node\.x-5/);
  assert.match(html,/node\.y-4/);
});

test('source Focus/Overview toolbar, branch toggles, help and quick actions present',()=>{
  for(const key of ['Fokus Orang','Seluruh Pohon','Reset cabang',
   'Kembali','branchControls()','class="branch-toggle"','class="relationship-explorer person-preview"',
   'kinshipPreview().label','class="tree-help-button"','class="tree-help-panel"',
   'toggleFullscreen()','fitCanvasFromToolbar()']){
    assert.ok(html.includes(key),'Behavior control missing: '+key);
  }
});

test('mobile canvas uses exact 9x8x7 padding and restores main heading emphasis',()=>{
  const style=read('src/app/features/family-tree/family-tree.page.css');
  const global=read('src/styles.css');
  assert.match(style,/\.main-parity-ui \.main\{padding:9px 8px 7px/);
  assert.match(global,/h1 \{ font-size: 2em; font-weight: 700; \}/);
});

test('source mobile header/heading controls and onboarding follow source IDs',()=>{
  const template=read('src/app/features/family-tree/family-tree.page.html');
  const component=read('src/app/features/family-tree/family-tree.page.ts');
  const sourceCss=read('src/main-parity.css');
  for(const id of ['export-btn','rename-btn','link-btn','add-btn']){
    assert.ok(template.includes('id="'+id+'"'),'Missing main responsive control ID: '+id);
  }
  assert.match(sourceCss,/\.heading-actions #rename-btn,\.heading-actions #add-btn\{display:none\}/);
  assert.match(template,/class="guide-onboard"/);
  assert.match(template,/Baru menggunakan KnowYourFam\?/);
  assert.match(component,/dismissOnboarding\(\)/);
  assert.match(template,/class="lane-description"/);
  assert.match(template,/\[class\.zoom-compact\]/);
});

test('Angular mobile mode toolbar preserves main responsive zoom-control IDs',()=>{
  const template=read('src/app/features/family-tree/family-tree.page.html');
  const sourceCss=read('src/main-parity.css');
  for(const id of ['zoom-out','zoom-value','zoom-in','fit-btn','fullscreen-btn']){
    assert.ok(template.includes('id="'+id+'"'),'Missing source control id '+id);
  }
  assert.match(sourceCss,/\.canvas-ops #zoom-out,\.canvas-ops #zoom-in,\.canvas-ops #zoom-value\{display:none\}/);
});

test('mobile and drawer mirror main UI while keeping manual docs entry',()=>{
  assert.match(html,/class="mobile-nav"/);
  assert.match(html,/class="mobile-menu-popover"/);
  assert.match(html,/class="shade show"/);
  assert.match(html,/class="drawer open"/);
  assert.match(html,/routerLink="\/developer"/);
  assert.match(html,/routerLink="\/rules"/);
  assert.match(html,/routerLink="\/guide"/);
});

test('database-first mode never seeds production with reference test people',()=>{
  assert.equal(MAIN_REFERENCE_TREE.people.length,124,'reference remains as a fixture');
  assert.doesNotMatch(store,/mergeTestMembers\(/);
  assert.doesNotMatch(html,/Lengkapi data uji/);
});

test('source-style Angular routes include all key pages and full person profile',()=>{
  const app=read('src/app/app.config.ts');
  const profile=read('src/app/features/profile/person-profile.page.html');
  const reference=read('src/app/features/reference/reference.page.html');
  const developer=read('src/app/features/developer/developer.page.html');
  for(const route of ["person/:id","members","guide","rules","developer"]){
    assert.ok(app.includes("path: '"+route+"'"),'Missing route: '+route);
  }
  for(const className of ['profile-container','profile-hero','profile-tabs','profile-content']){
    assert.ok(profile.includes(className),'Missing main profile class '+className);
  }
  for(const className of ['guide-hero','guide-category','guide-search','member-tile','rules-page']){
    assert.ok(reference.includes(className),'Missing main reference class '+className);
  }
  for(const className of ['dev-wrap','dev-hero','dev-panel','dev-toc']){
    assert.ok(developer.includes(className),'Missing main developer class '+className);
  }
});

test('new family is a separate explicit mutation with user confirmation',()=>{
  assert.match(html,/\(click\)="createNewTree\(\)"/);
  assert.match(ts,/window\.confirm\('Buat Family Tree baru/);
  assert.match(store,/async createEmptyTree\(/);
  assert.match(store,/this\.focusPersonId\.set\(''\)/);
});
