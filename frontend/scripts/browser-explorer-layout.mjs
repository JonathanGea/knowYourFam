import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const project=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const original=readFileSync(resolve(project,'src/main-parity.css'),'utf8');
const component=readFileSync(resolve(project,'src/app/features/family-tree/family-tree.page.css'),'utf8');

const browser=await chromium.launch({headless:true});
try {
  for(const width of [1440,1024,768,390]) {
    const page=await browser.newPage({viewport:{width,height:850},deviceScaleFactor:1});
    try {
      await page.setContent(`<!doctype html>
      <html><head><meta name="viewport" content="width=device-width,initial-scale=1">
        <style>${original}\n${component}</style>
      </head><body>
        <div class="app main-parity-ui">
          <section class="explorer-stage explorer-open" style="height:600px;flex:0 0 600px">
            <div class="viewport"><div class="scene"><span>Family Tree Canvas</span></div></div>
            <aside class="relationship-explorer">
              <div class="explorer-header">Jelajahi Keluarga</div>
              <div class="explorer-person">Anggota keluarga</div>
              <div class="explorer-main-content">Kerabat</div>
              <div class="explorer-footer">Lihat profil</div>
            </aside>
          </section>
        </div>
      </body></html>`);
      const rect=await page.evaluate(()=>{
        const get=selector=>{
          const el=document.querySelector(selector);
          if(!el) throw new Error('missing '+selector);
          const {left,right,top,bottom,width,height}=el.getBoundingClientRect();
          return {left,right,top,bottom,width,height};
        };
        return {stage:get('.explorer-stage'),viewport:get('.viewport'),
          panel:get('.relationship-explorer'),
          layout:getComputedStyle(document.querySelector('.explorer-stage')).display};
      });
      const {stage,viewport,panel}=rect;
      const near=(a,b,epsilon=3)=>Math.abs(a-b)<epsilon;
      assert.ok(stage.width>=width-2,`stage unexpectedly narrow at ${width}px: ${JSON.stringify(rect)}`);
      assert.ok(viewport.width>=240,`canvas unusably narrow at ${width}px: ${JSON.stringify(rect)}`);
      if(width>=901){
        assert.equal(rect.layout,'grid',`desktop must use grid, at ${width}px`);
        assert.ok(near(viewport.right,panel.left),`inspector must dock to RIGHT of canvas at ${width}px: ${JSON.stringify(rect)}`);
        assert.ok(near(panel.right,stage.right),`inspector must dock to far RIGHT at ${width}px: ${JSON.stringify(rect)}`);
        assert.ok(panel.width>=330 && panel.width<=375,`inspector width out of bounds at ${width}px: ${JSON.stringify(rect)}`);
        assert.ok(near(viewport.left,stage.left),`canvas must begin at stage left at ${width}px`);
      } else if(width>650){
        assert.ok(near(panel.right,stage.right-8),`tablet inspector must float at RIGHT at ${width}px: ${JSON.stringify(rect)}`);
        assert.ok(near(viewport.width,stage.width),`tablet canvas should stay full-width behind overlay at ${width}px`);
      } else {
        assert.ok(near(panel.left,stage.left) && near(panel.right,stage.right),`mobile sheet should span width at ${width}px`);
        assert.ok(near(panel.bottom,stage.bottom),`mobile sheet should sit at bottom at ${width}px`);
        assert.ok(panel.height<stage.height,`mobile sheet cannot cover the whole tree by default at ${width}px`);
      }
      console.log(`PASS ${width}px: canvas x=${Math.round(viewport.left)}..${Math.round(viewport.right)}; inspector x=${Math.round(panel.left)}..${Math.round(panel.right)}`);
    } finally {
      await page.close();
    }
  }
} finally {await browser.close()}
