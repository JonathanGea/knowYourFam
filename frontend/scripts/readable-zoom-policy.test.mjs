import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {clampReadableFamilyZoom,READABLE_FOCUS_MIN_ZOOM,
  readableFitCenter} from '../src/app/features/family-tree/readable-zoom-policy.ts';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(resolve(root,p),'utf8');

test('15% 4% 0.4% zoom requests cannot hide Person cards in focus view',()=>{
  for(const requested of [.15,.04,.004,0,-2]){
    assert.equal(clampReadableFamilyZoom(requested,'focus'),READABLE_FOCUS_MIN_ZOOM);
  }
  assert.equal(clampReadableFamilyZoom(.88,'focus'),.88);
  assert.equal(clampReadableFamilyZoom(1.08,'focus'),1.08);
});
test('Peta Keluarga retains true whole-tree fit and all graph positions',()=>{
  assert.equal(clampReadableFamilyZoom(.15,'overview'),.15);
  assert.equal(clampReadableFamilyZoom(.004,'overview'),.004);
  assert.equal(clampReadableFamilyZoom(99,'overview'),2.5);
});
test('Fit on narrow mobile centers the active Person at readable zoom',()=>{
  const camera=readableFitCenter(.15,'focus',{x:4000,y:1800},
    {width:390,height:550},{width:12000,height:4200});
  assert.equal(camera.zoom,.78);
  assert.ok(Math.abs(camera.panX+4000*.78-195)<.01);
  assert.ok(Math.abs(camera.panY+1800*.78-275)<.01);
});
test('map fits entire tree without centering on the focused Person',()=>{
  const camera=readableFitCenter(.15,'overview',{x:4000,y:1800},
    {width:390,height:550},{width:2000,height:1800});
  assert.equal(camera.zoom,.15);
  assert.equal(camera.panX,45);
});
test('no screen-space overlay, orphan connector or missing node on zoom',()=>{
  const html=read('src/app/features/family-tree/family-tree.page.html');
  const ts=read('src/app/features/family-tree/family-tree.page.ts');
  const css=read('src/family-explorer-workspace.css');
  assert.doesNotMatch(html,/compact-person-layer|family-name-only-layer/);
  assert.doesNotMatch(html,/aria-hidden.*store.zoom\(\)/);
  assert.doesNotMatch(css,/visibility:hidden!important;pointer-events:none!important/);
  assert.match(html,/@for \(node of layout\(\)\.nodes; track node\.person\.id\)/);
  assert.match(ts,/clampReadableFamilyZoom\(newZoom,this\.store\.mode\(\)\)/);
  assert.match(ts,/clampReadableFamilyZoom\(\s*pinch\.initialZoom/);
  assert.match(html,/Pusatkan keluarga terdekat/);
});
