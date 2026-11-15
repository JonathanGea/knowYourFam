import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const css=readFileSync(resolve(root,'src/main-parity.css'),'utf8')
  +'\n'+readFileSync(resolve(root,'src/family-workspace-pages.css'),'utf8');
const browser=await chromium.launch({headless:true});
try {
 for (const width of [390,768,1024,1440]) {
  const page=await browser.newPage({viewport:{width,height:800}});
  try {
   await page.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
   <style>${css}</style></head><body>
   <div class="app main-parity-ui family-workspace-page family-reference-page">
     <header class="header family-page-header"><a class="brand family-page-brand">KnowYourFam</a>
       <a class="family-page-tree-name">Keluarga Saya</a><div class="header-right family-page-header-actions">Akun</div></header>
     <div class="body"><nav class="family-page-rail">
       <a class="family-page-rail-link is-active"><span>♧</span><small>Pohon</small></a></nav>
       <main class="main family-page-main"><div class="heading"><h1>Semua Anggota</h1></div>
         <section class="member-list active">${'<p style="height:55px">Anggota keluarga</p>'.repeat(25)}</section>
       </main></div>
     <nav class="mobile-nav family-page-mobile-navigation">
       <a class="active"><span>♧</span>Pohon</a><a><span>☷</span>Anggota</a></nav>
   </div></body></html>`);
   const r=await page.evaluate(()=>{
     const rect=sel=>{const e=document.querySelector(sel),r=e.getBoundingClientRect();
       return {...{left:r.left,right:r.right,width:r.width,height:r.height,top:r.top,bottom:r.bottom},
         display:getComputedStyle(e).display, scroll:e.scrollHeight, client:e.clientHeight}};
     return {header:rect('.family-page-header'),rail:rect('.family-page-rail'),
       main:rect('.family-page-main'),nav:rect('.family-page-mobile-navigation'),
       window:document.documentElement.scrollWidth};
   });
   assert.ok(r.header.height>=53&&r.header.height<=65,`header height @${width} ${JSON.stringify(r)}`);
   assert.ok(r.main.width>=width-(width>=900?75:4),`too little content width @${width}`);
   assert.ok(r.window<=width+2,`horizontal page overflow @${width}`);
   assert.ok(r.main.scroll>r.main.client,`content panel must scroll independently @${width}`);
   if(width>=900){
     assert.notEqual(r.rail.display,'none');
     assert.ok(r.rail.width>=62&&r.rail.width<=75);
     assert.equal(r.nav.display,'none');
   } else {
     assert.equal(r.rail.display,'none');
     assert.notEqual(r.nav.display,'none');
     assert.ok(Math.abs(r.nav.bottom-800)<3,`mobile nav not at bottom @${width}`);
   }
   console.log(`PASS authenticated workspace ${width}px main=${Math.round(r.main.width)} header=${Math.round(r.header.height)}`);
  }finally{await page.close()}
 }
}finally{await browser.close()}
