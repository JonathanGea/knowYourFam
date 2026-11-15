import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(resolve(root,path),'utf8');
const template=read('src/app/features/family-tree/family-tree.page.html');
const page=read('src/app/features/family-tree/family-tree.page.ts');
const css=read('src/main-parity.css');

test('relationship explorer names relatives instead of repeating numeric relationship tiles',()=>{
  for(const text of ['KELUARGA TERDEKAT','CABANG POHON','Belum tercatat',
    'Lihat profil lengkap','Jadikan fokus pohon','Tambah hubungan']){
    assert.ok(template.includes(text),'Missing explorer UX: '+text);
  }
  assert.match(template, /@for \(group of explorerGroups\(\); track group\.kind\)/);
  assert.match(template, /@for \(relative of group\.people\.slice\(0,/);
  assert.match(template, /explorerExpandedGroups\(\)\.has\(group\.kind\)/);
  assert.doesNotMatch(template, /class="quick-profile-summary"/);
  assert.doesNotMatch(template, /\+0 anggota/);
});

test('relative navigation never implicitly rewrites focused person',()=>{
  const navigation=page.slice(page.indexOf('  exploreRelative(id:string):void {'),
    page.indexOf('  private activateExplorerPerson('));
  assert.ok(navigation.length>200,'exploreRelative should exist');
  assert.match(navigation, /this\.tryRevealRelative\(from,id\)/);
  assert.match(navigation, /this\.activateExplorerPerson\(id,true\)/);
  assert.doesNotMatch(navigation, /setFocus\(/);
  assert.match(page, /readonly explorerHistory = signal/);
  assert.match(page, /backExplorerPerson\(\):void/);
  assert.match(page, /this\.store\.visiblePersonIds\(\)\.has\(target\)/);
  assert.match(template, /\(click\)="exploreRelative\(relative\.id\)"/);
  assert.match(template, /\(click\)="setFocus\(qp\.id\)"/);
  assert.match(template, /\(click\)="backExplorerPerson\(\)"/);
});

test('canvas expansion is separate from people and only exposes hidden relatives',()=>{
  assert.match(template,/\(click\)="expandExplorerBranch\(dir\.key, qp\.id\)"/);
  assert.match(page, /\.filter\(branch=>branch\.hidden>0\)/);
  assert.match(page, /this\.store\.toggleBranch\(key\)/);
  assert.match(page, /this\.explorerBranchError\.set\(/);
  assert.match(page, /private compareBirthOrder\(a: Person, b: Person\)/);
  assert.match(template,/Hubungan \{\{ group\.label\.toLowerCase\(\) \}\} belum tercatat/);
});

test('desktop dock, tablet overlay, mobile expandable sheet preserve canvas',()=>{
  assert.match(template,/class="explorer-stage"/);
  assert.match(template,/class="quick-panel main-angular-quick"/);
  assert.match(css,/\.explorer-stage > \.viewport/);
  assert.match(css,/\.relationship-explorer \{[\s\S]*?flex:0 0 365px/);
  assert.match(css,/@media\(min-width:651px\) and \(max-width:1100px\)/);
  assert.match(css,/@media\(max-width:650px\) \{[\s\S]*?\.explorer-sheet-handle/);
  assert.match(template,/onExplorerHandleDown\(\$event\)/);
  assert.match(template,/\[class\.explorer-compact\]="explorerCompact\(\)"/);
  assert.match(css,/\.node\.selected:not\(\.focus-person\)/);
});
