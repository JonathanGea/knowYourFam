import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium} from 'playwright';

const frontend=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const root=resolve(frontend,'..');
const sourceMain=resolve(root,'main-reference');
const output=resolve(frontend,'artifacts/browser-parity');
mkdirSync(output,{recursive:true});
const mainPort=18971,appPort=18972;
const mainUrl='http://127.0.0.1:'+mainPort,appUrl='http://127.0.0.1:'+appPort;
const processes=[];
function launch(command,args,options={}){
 const child=spawn(command,args,{cwd:options.cwd??frontend,
   env:{...process.env,...options.env},stdio:['ignore','pipe','pipe']});
 let logs='';
 child.stdout.on('data',chunk=>{logs+=chunk.toString();});
 child.stderr.on('data',chunk=>{logs+=chunk.toString();});
 processes.push({child,get logs(){return logs;}});
}
async function ready(url){
 for(let i=0;i<90;i++){
   try{const response=await fetch(url);if(response.status===200)return;}
   catch{}
   await sleep(125);
 }
 throw new Error('Cannot connect to '+url+': '+processes.map(p=>p.logs).join('\n').slice(-4000));
}
function approx(a,b,limit,label){
 assert.ok(Math.abs(a-b)<=limit,label+': main='+a+' angular='+b+' tolerance='+limit);
}
async function positions(page,attribute){
 return page.locator('.node').evaluateAll((elements,attr)=>elements.map(el=>({
   id:el.getAttribute(attr),x:parseFloat(el.style.left),y:parseFloat(el.style.top)
 })),attribute);
}
async function snapshot(main,angular,label){
 await Promise.all([
   main.screenshot({path:resolve(output,'main-'+label+'.png'),animations:'disabled'}),
   angular.screenshot({path:resolve(output,'angular-'+label+'.png'),animations:'disabled'})
 ]);
}
let browser;
try{
 launch('python3',['-m','http.server',String(mainPort),'--bind','127.0.0.1','--directory',sourceMain],{cwd:sourceMain});
 launch(process.execPath,['server.mjs'],{env:{PORT:String(appPort)}});
 await Promise.all([ready(mainUrl+'/index.html'),ready(appUrl+'/')]);
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const sizes=[{name:'desktop',width:1440,height:900},
   {name:'tablet',width:1024,height:768},{name:'mobile',width:390,height:844}];
 for(const size of sizes){
   const context=await browser.newContext({viewport:{width:size.width,height:size.height},deviceScaleFactor:1});
   const main=await context.newPage(),angular=await context.newPage();
   const mainErrors=[],angularErrors=[];
   main.on('pageerror',e=>mainErrors.push(e.message));
   angular.on('pageerror',e=>angularErrors.push(e.message));
   await Promise.all([
     main.goto(mainUrl+'/index.html',{waitUntil:'domcontentloaded'}),
     angular.goto(appUrl+'/',{waitUntil:'domcontentloaded'})
   ]);
   await Promise.all([
     main.waitForFunction(()=>document.querySelectorAll('.node').length>0),
     angular.waitForFunction(()=>document.querySelectorAll('.node').length>0)
   ]);
   const focusMain=await main.locator('.node').count();
   const focusAngular=await angular.locator('.node').count();
   const focusedMainName=await main.locator('#focus-name').innerText();
   const focusedAngularName=await angular.locator('.focus-identity strong').innerText();
   const mainFocusIds=await positions(main,'data-person');
   const angularFocusIds=await positions(angular,'data-person-id');
   const idsA=new Set(mainFocusIds.map(x=>x.id)),idsB=new Set(angularFocusIds.map(x=>x.id));
   console.log('FOCUS '+size.name+': main='+focusedMainName+
     ' ('+focusMain+') Angular='+focusedAngularName+' ('+focusAngular+')');
   console.log('Only main:',mainFocusIds.filter(x=>!idsB.has(x.id)).map(x=>x.id));
   console.log('Only Angular:',angularFocusIds.filter(x=>!idsA.has(x.id)).map(x=>x.id));
   await snapshot(main,angular,size.name+'-focus');
   assert.equal(focusAngular,focusMain,'Focus visibility mismatch at '+size.name);
   assert.ok(focusMain>3,'Missing Focus graph at '+size.name);
   const h1=await main.locator('.header').boundingBox();
   const h2=await angular.locator('.header').boundingBox();
   approx(h1.height,h2.height,1,'header height '+size.name);
   if(size.width>=1100){
     const b1=await main.locator('.side').boundingBox();
     const b2=await angular.locator('.side').boundingBox();
     approx(b1.width,b2.width,1,'sidebar width '+size.name);
   }
   const inspect=page=>page.evaluate(()=>{
     const node=document.querySelector('.node');
     const viewport=document.querySelector('.viewport');
     const scene=document.querySelector('.scene');
     const style=getComputedStyle(node);
     const matrix=new DOMMatrix(getComputedStyle(scene).transform);
     return {
       cssWidth:parseFloat(style.width),cssHeight:parseFloat(style.height),
       renderedWidth:node.getBoundingClientRect().width,
       zoom:matrix.a,
       viewportWidth:viewport.clientWidth,viewportHeight:viewport.clientHeight
     };
   });
   const n1=await inspect(main);
   const n2=await inspect(angular);
   console.log('CAMERA '+size.name, {main:n1,angular:n2});
   approx(n1.cssWidth,185,1,'main CSS card width');
   approx(n2.cssWidth,185,1,'angular CSS card width');
   approx(n1.cssHeight,113,1,'main CSS card height');
   approx(n2.cssHeight,113,1,'angular CSS card height');
   approx(n1.zoom,n2.zoom,0.03,'zoom scale '+size.name);
   approx(n1.viewportHeight,n2.viewportHeight,3,'viewport height '+size.name);
   approx(n1.viewportWidth,n2.viewportWidth,4,'viewport width '+size.name);
   assert.equal(await angular.locator('.guide-onboard').isVisible(),
     await main.locator('#guide-onboard').isVisible(),
     'first-visit tutorial invitation visibility '+size.name);
   await snapshot(main,angular,size.name+'-focus');
   await Promise.all([
     main.locator('#mode-overview').click(),
     angular.getByRole('button',{name:'Seluruh Pohon'}).click()
   ]);
   await Promise.all([
     main.waitForFunction(()=>document.querySelectorAll('.node').length===124),
     angular.waitForFunction(()=>document.querySelectorAll('.node').length===124)
   ]);
   // Layout updates synchronously, but main's fitView runs in requestAnimationFrame.
   // Compare camera AFTER both versions complete at least two animation frames.
   await Promise.all([
     main.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))),
     angular.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
   ]);
   const overviewMain=await inspect(main),overviewAngular=await inspect(angular);
   approx(overviewMain.zoom,overviewAngular.zoom,0.03,'overview fitted zoom '+size.name);
   const reference=new Map((await positions(main,'data-person')).map(p=>[p.id,p]));
   const result=new Map((await positions(angular,'data-person-id')).map(p=>[p.id,p]));
   assert.deepEqual([...result.keys()].sort(),[...reference.keys()].sort(),'Overview Person IDs '+size.name);
   const differences=[];
   for(const [id,ref] of reference){
     const actual=result.get(id);
     if(Math.abs(ref.x-actual.x)>2||Math.abs(ref.y-actual.y)>2)
       differences.push({id,main:[ref.x,ref.y],angular:[actual.x,actual.y]});
   }
   assert.equal(differences.length,0,
     size.name+' Overview world coordinates: '+JSON.stringify(differences.slice(0,12)));
   await snapshot(main,angular,size.name+'-overview');
   await Promise.all([main.locator('.node').first().evaluate(node=>node.click()),
     angular.locator('.node').first().evaluate(node=>node.click())]);
   assert.ok(await main.locator('#quick-panel:not([hidden])').count(),'Missing main quick actions');
   assert.ok(await angular.locator('.quick-panel').count(),'Missing angular quick actions');
   await snapshot(main,angular,size.name+'-quick');
   if(size.name==='mobile'){
     await Promise.all([
       main.locator('#quick-profile').evaluate(button=>button.click()),
       angular.locator('.quick-actions .btn').last().evaluate(button=>button.click())
     ]);
     assert.ok(await main.locator('.drawer.open').isVisible(),'main profile bottom-sheet missing');
     assert.ok(await angular.locator('.drawer.open').isVisible(),'Angular profile bottom-sheet missing');
     await snapshot(main,angular,size.name+'-sheet');
     // The HTML reference uses synthetic events; keep its contract unchanged.
     const mainGrab=main.locator('.sheet-grab-zone');
     await mainGrab.dispatchEvent('pointerdown',{pointerId:41,clientY:700,pointerType:'touch'});
     await mainGrab.dispatchEvent('pointerup',{pointerId:41,clientY:625,pointerType:'touch'});
     assert.ok(await main.locator('.drawer.expanded').count(),'main up-swipe did not expand');
     await mainGrab.dispatchEvent('pointerdown',{pointerId:42,clientY:600,pointerType:'touch'});
     await mainGrab.dispatchEvent('pointerup',{pointerId:42,clientY:690,pointerType:'touch'});
     assert.equal(await main.locator('.drawer.expanded').count(),0,'main down-swipe did not collapse');
     await mainGrab.dispatchEvent('pointerdown',{pointerId:43,clientY:600,pointerType:'touch'});
     await mainGrab.dispatchEvent('pointerup',{pointerId:43,clientY:690,pointerType:'touch'});
     assert.equal(await main.locator('.drawer.open').count(),0,'main second down-swipe did not close');
     // Real browser pointer drags catch click-after-swipe bugs dispatchEvent misses.
     const swipeAngular=async deltaY=>{
       const box=await angular.locator('.sheet-grab').boundingBox();
       assert.ok(box,'Angular drawer grab handle missing');
       const x=box.x+box.width/2,y=box.y+box.height/2;
       await angular.mouse.move(x,y);
       await angular.mouse.down();
       await angular.mouse.move(x,y+deltaY,{steps:6});
       await angular.mouse.up();
     };
     await swipeAngular(-80);
     assert.ok(await angular.locator('.drawer.expanded').count(),
       'Real up-swipe must expand Angular sheet without click toggling it back');
     await swipeAngular(90);
     assert.equal(await angular.locator('.drawer.expanded').count(),0,
       'Real down-swipe must collapse Angular sheet');
     await swipeAngular(90);
     assert.equal(await angular.locator('.drawer.open').count(),0,
       'Second real down-swipe must close Angular sheet');
   }
   if(size.name==='desktop'){
     const focusId=await main.locator('.node').first().getAttribute('data-person');
     await Promise.all([
       main.locator('#quick-focus').evaluate(button=>button.click()),
       angular.locator('.quick-actions button').first().evaluate(button=>button.click())
     ]);
     await Promise.all([
       main.waitForFunction(()=>document.querySelectorAll('.node').length<124),
       angular.waitForFunction(()=>document.querySelectorAll('.node').length<124)
     ]);
     const focusedSource=await positions(main,'data-person');
     const focusedAngular=await positions(angular,'data-person-id');
     assert.deepEqual(focusedSource.map(p=>p.id).sort(),focusedAngular.map(p=>p.id).sort(),
       'Focus graph after quick action on '+focusId);
     await snapshot(main,angular,size.name+'-refocus');
   }
   if(size.width<650){
     assert.ok(await main.locator('.mobile-nav').isVisible(),'Main mobile nav hidden');
     assert.ok(await angular.locator('.mobile-nav').isVisible(),'Angular mobile nav hidden');
   }
   assert.deepEqual(mainErrors,[],'Source JS errors '+size.name);
   assert.deepEqual(angularErrors,[],'Angular JS errors '+size.name);
   console.log(size.name+': Focus '+focusMain+', Overview 124, same card geometry and world positions');

   await context.close();
 }
 // Run the actual main and Angular tutorial side by side, never mutating family data.
 const practiceContext=await browser.newContext({viewport:{width:1440,height:900}});
 const mainTraining=await practiceContext.newPage();
 const angularTraining=await practiceContext.newPage();
 await Promise.all([
   mainTraining.goto(mainUrl+'/index.html',{waitUntil:'domcontentloaded'}),
   angularTraining.goto(appUrl+'/',{waitUntil:'domcontentloaded'})
 ]);
 await Promise.all([
   mainTraining.waitForSelector('#guide-onboard:not([hidden])'),
   angularTraining.waitForSelector('.guide-onboard')
 ]);
 const originalMainCount=await mainTraining.locator('.node').count();
 const originalAngularCount=await angularTraining.locator('.node').count();
 assert.equal(originalAngularCount,originalMainCount);
 const readOriginal=async()=>{
   return Promise.all([
     mainTraining.evaluate(()=>localStorage.getItem('knowyourfam_mvp_v1')),
     angularTraining.evaluate(()=>localStorage.getItem('knowyourfam.angular.main-parity.v2'))
   ]);
 };
 const before=await readOriginal();
 await Promise.all([
   mainTraining.locator('#guide-onboard [data-guide-run="kartu"]').evaluate(el=>el.click()),
   angularTraining.locator('.guide-onboard .btn.primary').evaluate(el=>el.click())
 ]);
 await Promise.all([
   mainTraining.waitForSelector('.node[data-person="edu-self"]'),
   angularTraining.waitForSelector('.node[data-person-id="edu-self"]')
 ]);
 assert.equal(await mainTraining.locator('.node').count(),
   await angularTraining.locator('.node').count(),
   'Tutorial course training seed differs');
 await snapshot(mainTraining,angularTraining,'tutorial-kartu-start');
 const mainStep=async()=>(await mainTraining.locator('.guide-step-kicker').textContent()).trim();
 const angularStep=async()=>(await angularTraining.locator('.guide-step-kicker').textContent()).trim();
 assert.equal(await mainStep(),await angularStep(),'Tutorial step title mismatch');
 // Wrong action must not advance; click step Back when already on first.
 await angularTraining.getByRole('button',{name:'← Sebelumnya'}).evaluate(el=>el.click());
 assert.equal(await angularStep(),'Langkah 1 dari 3');
 await Promise.all([
   mainTraining.locator('.node[data-person="edu-self"]').evaluate(el=>el.click()),
   angularTraining.locator('.node[data-person-id="edu-self"]').evaluate(el=>el.click())
 ]);
 assert.equal(await mainStep(),'Langkah 2 dari 3');
 assert.equal(await angularStep(),'Langkah 2 dari 3');
 await Promise.all([
   mainTraining.locator('#quick-profile').evaluate(el=>el.click()),
   angularTraining.locator('.quick-actions .btn').last().evaluate(el=>el.click())
 ]);
 assert.equal(await mainStep(),'Langkah 3 dari 3');
 assert.equal(await angularStep(),'Langkah 3 dari 3');
 assert.ok(await mainTraining.locator('#profile-page .profile-container').count(),'Main training profile page not visible');
 assert.ok(await angularTraining.locator('.training-profile .profile-container').count(),'Angular training full profile not visible');
 await snapshot(mainTraining,angularTraining,'tutorial-kartu-profile');
 await Promise.all([
   mainTraining.locator('[data-tutorial-action="action"]').evaluate(el=>el.click()),
   angularTraining.locator('.guide-tutorial-bottom .btn.primary').evaluate(el=>el.click())
 ]);
 assert.ok(await mainTraining.getByText('Tutorial selesai!').count());
 assert.ok(await angularTraining.getByText('Tutorial selesai!').count());
 await Promise.all([
   mainTraining.locator('[data-tutorial-action="finish"]').evaluate(el=>el.click()),
   angularTraining.getByRole('button',{name:'Kembali ke Pohon Asli'}).evaluate(el=>el.click())
 ]);
 assert.equal(await mainTraining.locator('.node').count(),originalMainCount,
   'main original tree not restored after tutorial');
 assert.equal(await angularTraining.locator('.node').count(),originalAngularCount,
   'Angular original tree not restored after tutorial');
 assert.deepEqual(await readOriginal(),before,'Training must not write family localStorage');
 const completion=await angularTraining.evaluate(()=>{
   const state=JSON.parse(localStorage.getItem('knowyourfam_learning_v1')||'{}');
   return state.completed||[];
 });
 assert.ok(completion.includes('kartu'),'Training completion not recorded');
 console.log('Tutorial Kartu: course data, 3 verified actions, completion and no family write passed');
 await practiceContext.close();
}finally{
 if(browser)await browser.close();
 for(const proc of processes)proc.child.kill('SIGTERM');
}
