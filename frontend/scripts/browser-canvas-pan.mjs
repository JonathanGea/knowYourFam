import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {chromium} from 'playwright';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const source=read('src/app/features/family-tree/family-tree.page.ts');
const start=source.indexOf('  onPointerDown(event:');
const end=source.indexOf('\n  goBackFocus():',start);
assert.ok(start>0&&end>start,'Could not extract real production pointer handlers');
const realHandlers=source.slice(start,end);
const selectors=[...realHandlers.matchAll(/\.closest(?:<[^>]+>)?\(['"]([^'"]+)['"]\)/g)].map(x=>x[1]);

// Execute the real Angular pointer methods against a small browser fixture.
// Do not reimplement dragging in the test: future selector/gesture regressions
// must break this test if they break the actual component.
const harness=String.raw`
function clampReadableFamilyZoom(z,mode) {
  return Math.min(2.5,Math.max(mode==='focus'?.12:.004,z));
}
class CanvasPointerHarness {
  constructor(){
    const signal=value=>{
      let current=value;
      const get=()=>current;
      get.set=next=>{current=next};
      return get;
    };
    this.panX=signal(0);
    this.panY=signal(0);
    this.store={
      zoom:signal(.88),
      mode:()=> 'focus',
      setZoom:value=>this.store.zoom.set(value)
    };
    this.canvasWindow={nativeElement:document.querySelector('.viewport')};
    this.pointers=new Map();
    this.panGesture=null;
    this.pinchGesture=null;
    this.suppressClickUntil=0;
    this.lastSelected=null;
    this.backgroundClicks=0;
    this.tutorialRecord=()=>{};
    this.previewPerson=id=>{this.lastSelected=id};
    this.closeExplorer=()=>{this.backgroundClicks++};
  }
`+realHandlers+String.raw`
}
window.harness=new CanvasPointerHarness();
const root=window.harness.canvasWindow.nativeElement;
root.addEventListener('pointerdown',event=>window.harness.onPointerDown(event));
root.addEventListener('pointermove',event=>window.harness.onPointerMove(event));
root.addEventListener('pointerup',event=>window.harness.onPointerUp(event));
root.addEventListener('pointercancel',event=>window.harness.onPointerUp(event));
root.addEventListener('click',event=>window.harness.onCanvasBackground(event));
`;
const code=ts.transpileModule(harness,{compilerOptions:{
  target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None
}}).outputText;

const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:760},hasTouch:true});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  try{
    await page.setContent('<!doctype html><html><head>'+
      '<meta name="viewport" content="width=device-width,initial-scale=1">'+
      '<style>'+read('src/main-parity.css')+'</style></head><body>'+
      '<div class="app main-parity-ui">'+
      '<div class="viewport" style="position:relative;width:390px;height:620px">'+
      '<button class="node" data-person-id="person-1" style="left:96px;top:90px">'+
      '<span class="node-name">Saudara User</span></button></div></div></body></html>');
    await page.addScriptTag({content:code});
    assert.equal(await page.locator('.viewport').evaluate(el=>getComputedStyle(el).touchAction),'none');
    for(const selector of selectors){
      await page.locator('.node').evaluate((el,sel)=>el.closest(sel),selector);
    }
    const evt=(selector,type,id,x,y)=>page.dispatchEvent(selector,type,{
      pointerId:id,pointerType:'touch',isPrimary:true,clientX:x,clientY:y,bubbles:true
    });
    // Drag empty canvas with one finger.
    await evt('.viewport','pointerdown',11,54,355);
    await evt('.viewport','pointermove',11,166,428);
    let state=await page.evaluate(()=>({x:window.harness.panX(),y:window.harness.panY()}));
    assert.deepEqual(state,{x:112,y:73},'One-finger pan on empty canvas failed');
    await evt('.viewport','pointerup',11,166,428);
    // Drag starting directly on a Person card, not just empty space.
    await evt('.node','pointerdown',12,145,130);
    await evt('.viewport','pointermove',12,211,184);
    state=await page.evaluate(()=>({x:window.harness.panX(),y:window.harness.panY(),
      selected:window.harness.lastSelected}));
    assert.deepEqual(state,{x:178,y:127,selected:null},
      'Dragging on Person must move the canvas without opening the profile');
    await evt('.viewport','pointerup',12,211,184);
    // An unmoved tap should still open Person Identity Card.
    await evt('.node','pointerdown',13,145,130);
    await evt('.viewport','pointerup',13,145,130);
    assert.equal(await page.evaluate(()=>window.harness.lastSelected),'person-1');
    await page.dispatchEvent('.viewport','click',{bubbles:true});
    assert.equal(await page.evaluate(()=>window.harness.backgroundClicks),1);
    assert.deepEqual(errors,[], 'Canvas emitted JavaScript exceptions');
    console.log('PASS mobile pointerdown, one-finger pan, Person drag, Person tap, background click');
  }finally{await page.close()}
}finally{await browser.close()}
