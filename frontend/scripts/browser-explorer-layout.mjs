import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const project=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const original=readFileSync(resolve(project,'src/main-parity.css'),'utf8');
const component=readFileSync(resolve(project,'src/app/features/family-tree/family-tree.page.css'),'utf8');
const workspace=readFileSync(resolve(project,'src/family-explorer-workspace.css'),'utf8');
const browser=await chromium.launch({headless:true});
try {
  for (const config of [
    {width:1440,touch:false},{width:1024,touch:false},
    {width:768,touch:false},{width:390,touch:true},
    {width:1440,touch:true}
  ]) {
    const {width,touch}=config;
    const page=await browser.newPage({viewport:{width,height:850},deviceScaleFactor:1,hasTouch:touch});
    try {
      await page.setContent(`<!doctype html><html>
        <head><meta name="viewport" content="width=device-width,initial-scale=1">
          <style>${original}\n${component}\n${workspace}</style>
        </head>
        <body>
          <div class="app main-parity-ui family-explorer-page">
            <section class="canvas-shell explorer-modal-open">
              <section class="explorer-stage explorer-open" style="height:600px;flex:0 0 600px">
                <div class="viewport"><div class="scene">Family Tree Canvas</div></div>
                <div class="relationship-explorer-backdrop"></div>
                <aside class="relationship-explorer person-preview" role="dialog" aria-label="Jelajahi keluarga">
                  <div class="explorer-header">Jelajahi Keluarga</div>
                  <div class="explorer-person">Anggota keluarga</div>
                  <div class="explorer-main-content">
                    ${'<div class="explorer-relative" style="min-height:42px">Hubungan keluarga terdekat</div>'.repeat(23)}
                  </div>
                  <div class="explorer-footer">Lihat profil</div>
                </aside>
              </section>
            </section>
          </div>
        </body>
      </html>`);
      const state=await page.evaluate(()=>{
        const rect=selector=>{
          const elem=document.querySelector(selector);
          if(!elem)throw new Error('missing '+selector);
          const {left,right,top,bottom,width,height}=elem.getBoundingClientRect();
          return {left,right,top,bottom,width,height};
        };
        return {
          stage:rect('.explorer-stage'), viewport:rect('.viewport'),
          panel:rect('.relationship-explorer'),
          backdrop:rect('.relationship-explorer-backdrop'),
          backdropDisplay:getComputedStyle(document.querySelector('.relationship-explorer-backdrop')).display,
          coarse:matchMedia('(any-pointer:coarse)').matches,
          body: {
            clientHeight:document.querySelector('.explorer-main-content').clientHeight,
            scrollHeight:document.querySelector('.explorer-main-content').scrollHeight
          }
        };
      });
      const near=(a,b,epsilon=3)=>Math.abs(a-b)<epsilon;
      const {stage,viewport,panel,backdrop,backdropDisplay,coarse,body}=state;
      assert.ok(viewport.width>=250,`canvas too narrow at ${width}: ${JSON.stringify(state)}`);
      const shouldOverlay=width<=1100||coarse;
      if(!shouldOverlay){
        assert.equal(backdropDisplay,'none');
        assert.ok(near(viewport.right,panel.left),`desktop panel not docked to right: ${JSON.stringify(state)}`);
        assert.ok(near(panel.right,stage.right),`desktop panel not flush right: ${JSON.stringify(state)}`);
      } else {
        assert.equal(backdropDisplay,'block',`overlay missing backdrop: ${JSON.stringify(state)}`);
        assert.ok(near(viewport.width,stage.width),`overlay must not shrink canvas: ${JSON.stringify(state)}`);
        assert.ok(backdrop.width>=width&&backdrop.height>=850,`backdrop must cover viewport: ${JSON.stringify(state)}`);
        if(width>=900) {
          assert.ok(near(panel.right,width),`tablet side sheet must attach to right edge: ${JSON.stringify(state)}`);
          assert.ok(panel.width>=300&&panel.width<=390,`tablet side sheet width invalid: ${JSON.stringify(state)}`);
        } else if(width<=650) {
          assert.ok(near(panel.bottom,850),`phone bottom sheet must attach to bottom: ${JSON.stringify(state)}`);
          assert.ok(panel.width>=width-3,`phone bottom sheet too narrow: ${JSON.stringify(state)}`);
        } else {
          assert.ok(near(panel.left+panel.width/2,width/2),`portrait tablet overlay not centered: ${JSON.stringify(state)}`);
        }
        assert.ok(body.scrollHeight>body.clientHeight,`family list should scroll independently: ${JSON.stringify(state)}`);
      }
      console.log(`PASS ${width}px touch=${touch} coarse=${coarse}: panel x=${Math.round(panel.left)}..${Math.round(panel.right)}, y=${Math.round(panel.top)}..${Math.round(panel.bottom)}`);
    } finally {await page.close();}
  }
} finally {await browser.close()}
