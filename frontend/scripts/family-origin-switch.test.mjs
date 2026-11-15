import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const store=read('src/app/application/family-tree.store.ts');
const page=read('src/app/features/family-tree/family-tree.page.ts');
const html=read('src/app/features/family-tree/family-tree.page.html');

test('origin selector lives in the contextual branch explorer and compact toolbar',()=>{
  assert.match(html,/store\.familyOrigins\(\)\.length>1 && store\.mode\(\)==='focus'/);
  assert.match(html,/switchFamilyOrigin\(origin\.id\)/);
  assert.match(html,/hiddenFamilyOriginCount\(origin\.id\)/);
  assert.match(html,/workspace-branch-picker/);
});

test('birth-family selection retains the central Person, partners and their children',()=>{
  assert.match(store,/readonly activeFamilyOriginId = computed/);
  assert.match(store,/this\.relationsFor\(focus\)\.partners\.forEach\(add\)/);
  assert.match(store,/this\.pairKeys\(focus\)\.forEach\(reveal\)/);
  assert.match(store,/const up = 'up:' \+ encodeURIComponent\(origin\)/);
  assert.match(store,/reveal\('side:' \+ encodeURIComponent\(origin\)\)/);
  const switching=store.split('switchFamilyOrigin(id: string): boolean {')[1].split('resetBranches(): void')[0];
  assert.doesNotMatch(switching,/focusPersonId\.set/);
});

test('switching family origin retains previously opened sibling branches',()=>{
  const switching=store.split('switchFamilyOrigin(id: string): boolean {')[1].split('resetBranches(): void')[0];
  assert.match(switching,/const manual = \{\.\.\.this\.expandedBranches\(\)\}/);
  assert.match(switching,/this\.defaultBranchKeys\(\)/);
  assert.match(switching,/this\.expandedBranches\.set\(manual\)/);
  assert.match(page,/toggleBranchOrSwitchOrigin/);
  assert.match(page,/this\.keepAnchor\(this\.store\.focusPersonId\(\)/);
});
