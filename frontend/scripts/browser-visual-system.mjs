import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const styles=read('src/styles.css');
const css=[read('src/main-parity.css'),read('src/app/features/family-tree/family-tree.page.css'),
  read('src/family-explorer-workspace.css'),styles.slice(styles.indexOf('.ui-icon'))].join('\n');
const browser=await chromium.launch({headless:true});
try {
  for(const width of [390,768,1024,1440]){
    const page=await browser.newPage({viewport:{width,height:820}});
    try {
      await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+
        css+'</style></head><body><div class="app main-parity-ui family-explorer-page">'+
        '<header class="header workspace-global-header"><a class="brand workspace-brand">'+
        '<span class="logo"><svg class="ui-icon"></svg></span><span>KnowYourFam</span></a>'+
        '<button class="workspace-family-button"><strong>Keluarga Saya</strong></button>'+
        '<div class="header-right workspace-header-actions">'+
        '<button class="workspace-header-search"><svg class="ui-icon"></svg><span>Cari anggota</span></button>'+
        '<button class="btn primary workspace-header-add"><svg class="ui-icon"></svg><span>Tambah anggota</span></button>'+
        '<a class="workspace-account-link"><svg class="ui-icon"></svg></a></div></header>'+
        '<div class="body"><nav class="workspace-navigation-rail">'+
        '<a class="rail-link is-active"><svg class="ui-icon"></svg><small>Pohon</small></a></nav>'+
        '<main class="main"><section class="canvas-shell">'+
        '<div class="canvas-top workspace-canvas-toolbar"><div class="workspace-canvas-identity">'+
        '<strong>Pohon keluarga</strong><small>Menjelajahi saya · 24 dari 204 terlihat</small></div>'+
        '<div class="workspace-canvas-toolbar-actions"><button class="workspace-map-toggle">Peta keluarga</button>'+
        '<div class="canvas-ops"><button class="btn icon">+</button></div></div></div>'+
        '<div class="explorer-stage"><div class="viewport"><div class="scene" style="width:1100px;height:470px">'+
        '<div class="lane" style="top:0;height:200px"></div>'+
        '<button class="node focus-person" style="left:210px;top:100px">'+
        '<span class="node-top"><span class="person-photo">SU</span><span class="node-copy">'+
        '<span class="node-name">Saudara User</span><span class="node-years">1995</span></span></span>'+
        '<span class="node-self-tag">Akun saya</span></button></div></div></div>'+
        '</section></main></div><nav class="mobile-nav workspace-mobile-navigation">'+
        '<a class="active"><svg class="ui-icon"></svg>Pohon</a></nav></div></body></html>');
      const result=await page.evaluate(()=>{
        const el=s=>document.querySelector(s);
        const rect=s=>{const r=el(s).getBoundingClientRect();
          return {width:r.width,height:r.height};};
        return {overflow:document.documentElement.scrollWidth,header:rect('.workspace-global-header'),
          rail:rect('.workspace-navigation-rail'),viewport:rect('.viewport'),
          railDisplay:getComputedStyle(el('.workspace-navigation-rail')).display,
          nameFont:getComputedStyle(el('.node-name')).fontSize,
          canvasRadius:getComputedStyle(el('.canvas-shell')).borderRadius,
          canvasBorder:getComputedStyle(el('.canvas-shell')).borderTopWidth};
      });
      assert.ok(result.overflow<=width+3,'page overflow at '+width+': '+JSON.stringify(result));
      assert.ok(result.header.height>=52&&result.header.height<=67,'header height at '+width);
      assert.ok(result.viewport.width>=width-(width>=900?76:4),'viewport width at '+width);
      assert.equal(result.nameFont,'14px','Person name must remain legible at '+width);
      assert.equal(result.canvasRadius,'0px','No dashboard card radius at '+width);
      assert.equal(result.canvasBorder,'0px','No decorative canvas border at '+width);
      if(width>=900)assert.ok(result.rail.width>=65&&result.rail.width<=70);
      else assert.equal(result.railDisplay,'none');
      console.log('PASS visual system '+width+'px canvas='+Math.round(result.viewport.width));
    } finally {await page.close();}
  }
} finally {await browser.close();}
