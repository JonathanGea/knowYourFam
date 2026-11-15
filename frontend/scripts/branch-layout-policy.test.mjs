import test from 'node:test';
import assert from 'node:assert/strict';
import { countNodeCrowding, branchOwnerIds } from '../src/app/features/family-tree/branch-layout-policy.ts';
import { readFileSync } from 'node:fs';
import { dirname,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const page=readFileSync(resolve(root,'src/app/features/family-tree/family-tree.page.ts'),'utf8');
const html=readFileSync(resolve(root,'src/app/features/family-tree/family-tree.page.html'),'utf8');

test('wide, evenly spaced trees stay expanded regardless of viewport width',()=>{
  const nodes=Array.from({length:120},(_,i)=>({x:i*211,y:76,tier:0}));
  assert.equal(countNodeCrowding(nodes),0);
});

test('card collisions are measured within generations, not merely by count',()=>{
  const nodes=[
    {x:0,y:76,tier:0},
    {x:182,y:76,tier:0},
    {x:50,y:257,tier:1},
    {x:240,y:257,tier:1}
  ];
  assert.equal(countNodeCrowding(nodes),2);
  assert.equal(countNodeCrowding(nodes.slice(0,1)),0);
  assert.equal(countNodeCrowding([{x:0,y:76,tier:0},{x:0,y:257,tier:1}]),0);
});

test('encoded branch owners compare by ID, not substring',()=>{
  assert.deepEqual(branchOwnerIds('side:p1'),['p1']);
  assert.deepEqual(branchOwnerIds('pair:person%2Fone|person%20two'),['person/one','person two']);
  assert.notDeepEqual(branchOwnerIds('side:p11'),branchOwnerIds('side:p1'));
  assert.deepEqual(branchOwnerIds('bad-key'),[]);
});

test('page protects pin branches and makes reset, undo and camera transitions explicit',()=>{
  assert.match(page,/pinnedVisible/);
  assert.match(page,/this\.store\.isBranchOpen\(key\) &&\s*branchOwnerIds/);
  assert.match(page,/afterCrowding<initialCrowding/);
  assert.match(page,/this\.pinnedBranchKeys\.set\(new Set\(\)\)/);
  assert.match(page,/collapseNotice\.set\(null\)/);
  assert.match(page,/preserveCameraWhenDockChanges/);
  assert.match(page,/focusCameraBeforeMap/);
  assert.match(page,/onResize\(\): void/);
  assert.match(html,/class="workspace-more-results"/);
  assert.match(html,/explorerSearchInput/);
});
