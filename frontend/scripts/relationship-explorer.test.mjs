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
const repository=read('src/app/infrastructure/supabase-family-tree.repository.ts');
const identity=read('src/app/application/person-identity.service.ts');
const resolver=read('src/app/application/relationship-kinship.ts');

test('person preview contains identity, viewer relationship and a reason, not family lists or branches',()=>{
  for(const text of ['PROFIL ANGGOTA','kinshipPreview().label','personOverview()?.nickname',
    'overview.familyContext','overview.facts','Lihat profil lengkap','Fokus pohon','Tambah hubungan']){
    assert.ok(template.includes(text),'Missing Person Preview feature: '+text);
  }
  assert.doesNotMatch(template,/KELUARGA TERDEKAT/);
  assert.doesNotMatch(template,/CABANG POHON/);
  assert.doesNotMatch(template,/@for \(group of explorerGroups/);
  assert.doesNotMatch(template,/HUBUNGAN DENGAN ANDA/);
  assert.doesNotMatch(template,/preview-relation-route/);
  assert.doesNotMatch(template,/Berdasarkan hubungan yang tercatat/);
  assert.match(template,/@if \(overview\.familyContext; as familyContext\)/);
  assert.match(template,/@if \(overview\.facts\.length\)/);
  assert.match(template,/@for \(fact of overview\.facts; track fact\.id\)/);
  assert.match(template,/@if \(qp\.birthDate \|\| qp\.deathDate\)/);
  assert.doesNotMatch(template,/\(click\)="exploreRelative/);
  assert.match(template,/\(click\)="viewPersonDetails\(\)"/);
  assert.match(template,/class="explorer-focus preview-profile-primary"/);
  assert.match(template,/\(click\)="setFocus\(qp\.id\)"/);
});

test('logged in account is linked to Person independently of canvas focus',()=>{
  assert.match(page,/this\.cloud\.userId\(\)/);
  assert.match(page,/person\.claimedBy === uid/);
  assert.match(page,/resolveKinship\(/);
  assert.match(resolver,/if\(!viewerId \|\| !map\.has\(viewerId\)\)/);
  assert.doesNotMatch(resolver,/focusPersonId/);
  assert.match(repository,/from\('person_account_links'\)/);
  assert.match(identity,/from\('person_account_links'\)/);
  assert.doesNotMatch(identity,/update\(\{claimed_by:/);
  assert.match(template,/Ini profil saya/);
});

test('mobile/tablet centered popup and desktop right inspector remain intact',()=>{
  assert.match(template,/class="explorer-stage"/);
  assert.match(template,/class="relationship-explorer person-preview"/);
  assert.match(template,/class="relationship-explorer-backdrop"/);
  assert.match(css,/@media\(max-width:1100px\), \(any-pointer:coarse\)/);
  assert.match(css,/transform:translate\(-50%,-50%\)/);
  assert.match(css,/\.person-preview/);
  assert.match(css,/max-height:min\(82dvh,620px\)/);
  assert.match(css,/\.explorer-stage\.explorer-open \{\s*grid-template-columns:minmax\(0,1fr\) 342px/);
  assert.match(page,/isExplorerPopup\(\):boolean/);
});

test('overview derives its semantic context from kinship resolver, not names or focus person',()=>{
  const source=read('src/app/application/person-overview.ts');
  assert.match(source,/kinship\.kind/);
  assert.match(source,/case 'partner'/);
  assert.match(source,/case 'aunt-uncle'/);
  assert.match(source,/facts\.length < 2/);
  assert.doesNotMatch(source,/focusPersonId/);
  assert.match(page,/buildPersonOverview\(/);
  assert.match(css,/\.overview-personal-grid/);
  assert.match(css,/\.overview-family-context/);
  assert.match(css,/backdrop-filter:none/);
});
