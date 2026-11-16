import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {chromium} from 'playwright';
import {MIN_FOCUS_ZOOM} from '../src/app/features/family-tree/readable-zoom-policy.ts';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const source=read('src/app/features/family-tree/family-tree.page.ts');
const start=source.indexOf('  zoomAt(newZoom:');
const end=source.indexOf('\n  onCanvasBackground(',start);
assert.ok(start>=0&&end>start,'Production zoom handlers not found');
const methods=source.slice(start,end);
for(const name of ['zoomAt','zoomBy','onWheel','onPointerDown','onPointerMove','onPointerUp']){
  assert.ok(methods.includes(name+'('),'Missing '+name);
}
const html=read('src/app/features/family-tree/family-tree.page.html');
assert.ok(html.includes('0.12001'),'Zoom-out button is disabled at 78%');
const prefix=[
 'function clampReadableFamilyZoom(value,mode){return Math.min(2.5,Math.max(mode==="focus"?.12:.004,value));}',
 'function signal(v){let current=v;const read=()=>current;read.set=n=>{current=n};return read;}',
 'class CameraHarness {',
 'constructor(){',
 'this.panX=signal(0);this.panY=signal(0);',
 'this.store={zoom:signal(.88),mode:()=>"focus",setZoom:v=>this.store.zoom.set(v)};',
 'this.canvasWindow={nativeElement:document.querySelector(".viewport")};',
 'this.pointers=new Map();this.panGesture=null;this.pinchGesture=null;',
 'this.suppressClickUntil=0;this.tutorialRecord=()=>{};this.previewPerson=()=>{};',
 '}'
].join('\n');
const suffix=[
 '}',
 'window.cam=new CameraHarness();',
 'const vp=window.cam.canvasWindow.nativeElement;',
 'vp.addEventListener("wheel",e=>window.cam.onWheel(e),{passive:false});',
 'vp.addEventListener("pointerdown",e=>window.cam.onPointerDown(e));',
 'vp.addEventListener("pointermove",e=>window.cam.onPointerMove(e));',
 'vp.addEventListener("pointerup",e=>window.cam.onPointerUp(e));',
 'document.querySelector("#minus").addEventListener("click",()=>window.cam.zoomBy(-.1));',
 'document.querySelector("#plus").addEventListener("click",()=>window.cam.zoomBy(.1));'
].join('\n');
const code=ts.transpileModule(prefix+'\n'+methods+'\n'+suffix,{
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}
}).outputText;
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:760},hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.setContent('<!doctype html><html><head>'+
      '<meta name="viewport" content="width=device-width,initial-scale=1">'+
      '<style>.viewport{position:relative;touch-action:none;width:390px;height:600px;overflow:hidden}'+
      '</style></head><body><button id="minus">Out</button><button id="plus">In</button>'+
      '<div class="viewport"><button class="node" data-person-id="p1">User</button></div>'+
      '</body></html>');
    await page.addScriptTag({content:code});
    const state=()=>page.evaluate(()=>({z:window.cam.store.zoom(),x:window.cam.panX(),y:window.cam.panY()}));
    assert.equal((await state()).z,.88);
    await page.locator('#minus').click();
    const out=await state();
    assert.ok(out.z<.78&&out.z>.6,'Zoom-out stuck at 78%');
    assert.ok(Math.abs((195-out.x)/out.z-195/.88)<.001,'Zoom centre drifted');
    assert.ok(Math.abs((300-out.y)/out.z-300/.88)<.001);
    await page.locator('#plus').click();
    assert.ok(Math.abs((await state()).z-.88)<.0001,'Zoom-in failed');
    await page.dispatchEvent('.viewport','wheel',
      {deltaY:300,clientX:195,clientY:300,bubbles:true,cancelable:true});
    assert.ok((await state()).z<.88,'Wheel zoom failed');
    const pointer=(type,id,x,y)=>page.dispatchEvent('.viewport',type,{
      pointerId:id,pointerType:'touch',isPrimary:id===1,clientX:x,clientY:y,bubbles:true
    });
    await pointer('pointerdown',1,100,200);
    await pointer('pointerdown',2,250,200);
    await pointer('pointermove',2,175,200);
    const pinch=await state();
    assert.ok(pinch.z<.6&&pinch.z>.3,'Pinch-out stuck above 78%');
    await pointer('pointermove',2,116,200);
    assert.ok(Math.abs((await state()).z-MIN_FOCUS_ZOOM)<.001,'Minimum not 12%');
    await pointer('pointermove',2,275,200);
    assert.ok((await state()).z>pinch.z,'Pinch-in failed');
    await pointer('pointerup',2,275,200);
    await pointer('pointerup',1,100,200);
    const old=await state();
    await pointer('pointerdown',3,85,385);
    await pointer('pointermove',3,145,425);
    const now=await state();
    assert.ok(Math.abs(now.x-old.x-60)<.01,'Pan X broke after pinch');
    assert.ok(Math.abs(now.y-old.y-40)<.01,'Pan Y broke after pinch');
    await pointer('pointerup',3,145,425);
    assert.deepEqual(errors,[],'Production handlers threw browser exceptions');
    console.log('PASS zoom buttons, wheel, pinch both directions, and drag after pinch');
  }finally{await page.close()}
}finally{await browser.close()}
