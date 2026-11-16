import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {createCompactPersonCards} from '../src/app/features/family-tree/compact-person-card-layout.ts';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const css=[read('src/main-parity.css'),read('src/app/features/family-tree/family-tree.page.css'),
  read('src/family-explorer-workspace.css')].join('\n');
const nodes=[
  {person:{id:'a',name:'Ayah User'},x:0,y:0,tier:0},
  {person:{id:'c',name:'User',claimed:true},x:400,y:400,tier:1},
  {person:{id:'d',name:'Anak User'},x:1000,y:600,tier:2}
];
const camera={panX:110,panY:120,zoom:.15,viewportWidth:390,viewportHeight:720};
const cards=createCompactPersonCards(nodes,camera,'c',null);
assert.ok(cards.some(c=>c.id==='c'));
const markup=cards.map(c=>'<button class="compact-person-card'+(c.focus?' is-focus':'')+
  '" data-person-id="'+c.id+'" style="left:'+c.x+'px;top:'+c.y+'px" onclick="window.lastClicked=this.dataset.personId">'+
  '<span class="compact-person-avatar">U</span><span class="compact-person-name">'+c.name+'</span></button>').join('');
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:760},hasTouch:true});
  try{
    await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+
      css+'</style></head><body><div class="app main-parity-ui family-explorer-page">'+
      '<div class="viewport" style="width:390px;height:720px;position:relative">'+
      '<div class="scene zoom-far" style="width:1500px;height:900px;transform:translate(110px,120px) scale(.15)">'+
      nodes.map(n=>'<button class="node" style="left:'+n.x+'px;top:'+n.y+'px">'+
        '<span class="node-top"><span class="person-photo">U</span></span></button>').join('')+
      '</div><div class="compact-person-layer">'+markup+'</div></div></div></body></html>');
    const value=await page.evaluate(()=>{
      const old=document.querySelector('.scene.zoom-far .node');
      const card=document.querySelector('.compact-person-card');
      return {oldVisibility:getComputedStyle(old).visibility,
        background:getComputedStyle(card).backgroundColor,
        border:getComputedStyle(card).borderTopWidth,
        font:getComputedStyle(card.querySelector('.compact-person-name')).fontSize,
        avatar:getComputedStyle(card.querySelector('.compact-person-avatar')).display,
        pointer:getComputedStyle(card).pointerEvents};
    });
    assert.equal(value.oldVisibility,'hidden');
    assert.equal(value.background,'rgb(255, 255, 255)');
    assert.ok(parseFloat(value.border)>=1);
    assert.equal(value.font,'12px');
    assert.equal(value.avatar,'grid');
    assert.equal(value.pointer,'auto');
    await page.locator('.compact-person-card.is-focus').click();
    assert.equal(await page.evaluate(()=>window.lastClicked),'c');
    console.log('PASS far-zoom 15% compact cards with initial, name, border and tap');
  }finally{await page.close()}
}finally{await browser.close()}
