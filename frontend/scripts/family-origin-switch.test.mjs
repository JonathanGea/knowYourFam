import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const store=read('src/app/application/family-tree.store.ts');
const page=read('src/app/features/family-tree/family-tree.page.ts');
const html=read('src/app/features/family-tree/family-tree.page.html');

test('family selector is limited to multi-family Focus views',()=>{
  assert.match(html,/store\.mode\(\)==='focus' && store\.familyOrigins\(\)\.length>1/);
  assert.match(html,/switchFamilyOrigin\(origin\.id\)/);
  assert.match(html,/hiddenFamilyOriginCount\(origin\.id\)/);
});
test('the chosen birth family does not replace the focus anchor or children',()=>{
  assert.match(store,/readonly activeFamilyOriginId = computed/);
  assert.match(store,/this\.relationsFor\(focus\)\.partners\.forEach\(add\)/);
  assert.match(store,/this\.pairKeys\(focus\)\.forEach\(reveal\)/);
  assert.match(store,/const up = 'up:' \+ encodeURIComponent\(origin\)/);
  assert.match(store,/reveal\('side:' \+ encodeURIComponent\(origin\)\)/);
  const switching=store.split('switchFamilyOrigin(id: string): boolean {')[1].split('resetBranches(): void')[0];
  assert.doesNotMatch(switching,/focusPersonId\.set/);
});
test('each origin retains its branch state; opening spouse branch switches origin',()=>{
  assert.match(store,/this\.originBranchStates\.set\(current/);
  assert.match(store,/this\.originBranchStates\.get\(id\)/);
  assert.match(store,/this\.originBranchStates\.clear\(\)/);
  assert.match(page,/toggleBranchOrSwitchOrigin/);
  assert.match(page,/this\.keepAnchor\(this\.store\.focusPersonId\(\)/);
});
