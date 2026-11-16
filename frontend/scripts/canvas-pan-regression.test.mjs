import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const ts=readFileSync(resolve(root,'src/app/features/family-tree/family-tree.page.ts'),'utf8');
const html=readFileSync(resolve(root,'src/app/features/family-tree/family-tree.page.html'),'utf8');
const css=readFileSync(resolve(root,'src/main-parity.css'),'utf8');

test('pointer targets never contain invalid comma-separated selectors',()=>{
  const pointer=ts.slice(ts.indexOf('  onPointerDown(event:'),ts.indexOf('  goBackFocus():'));
  const matches=[...pointer.matchAll(/\.closest(?:<[^>]+>)?\(['"]([^'"]+)['"]\)/g)].map(m=>m[1]);
  assert.ok(matches.length>=4,'Missing pointer and click target selectors');
  for(const selector of matches){
    assert.ok(selector.split(',').every(part=>part.trim().length>0),
      'Invalid empty selector segment in '+JSON.stringify(selector));
    assert.doesNotMatch(selector,/,\s*$/, 'Trailing comma prevents touch gestures');
  }
  assert.match(pointer,/this\.panX\.set\(this\.panGesture\.startPanX\+dx\)/);
  assert.match(pointer,/this\.panY\.set\(this\.panGesture\.startPanY\+dy\)/);
});

test('mobile canvas keeps pointer and pinch bindings and native scroll disabled',()=>{
  for(const event of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture']){
    assert.match(html,new RegExp('\\('+event+'\\)="onPointer'));
  }
  assert.match(css,/\.viewport\{[^\n]*touch-action:none/);
});
