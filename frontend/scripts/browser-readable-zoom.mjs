import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {clampReadableFamilyZoom} from '../src/app/features/family-tree/readable-zoom-policy.ts';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const css=[read('src/main-parity.css'),
  read('src/app/features/family-tree/family-tree.page.css'),
  read('src/family-explorer-workspace.css')].join('\n');
const people=[
  {id:'parent-one',name:'Ayah User',x:80,y:80},
  {id:'parent-two',name:'Ibu User',x:300,y:80},
  {id:'focus',name:'User / Diri Sendiri',x:190,y:260},
  {id:'sibling',name:'Saudara User',x:410,y:260},
  {id:'child',name:'Anak User',x:190,y:440}
];
const zoom=clampReadableFamilyZoom(.15,'focus');
assert.equal(zoom,.78);
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:760},hasTouch:true});
 try{
  await page.setContent('<!doctype html><html><head>'+
    '<meta name="viewport" content="width=device-width,initial-scale=1"><style>'+
    css+'</style></head><body><div class="app main-parity-ui family-explorer-page">'+
    '<div class="viewport" style="position:relative;width:390px;height:620px;overflow:hidden">'+
    '<div class="scene" style="width:1200px;height:800px;transform:translate(-60px,16px) scale('+zoom+')">'+
    people.map(p=>'<button class="node'+(p.id==='focus'?' focus-person':'')+
      '" data-person-id="'+p.id+'" style="left:'+p.x+'px;top:'+p.y+'px" onclick="window.selected=this.dataset.personId">'+
      '<span class="node-top"><span class="person-photo">U</span><span class="node-copy">'+
      '<span class="node-name">'+p.name+'</span><span class="node-years">1990</span>'+
      '</span></span></button>').join('')+
    '</div></div></div></body></html>');
  const result=await page.evaluate(()=>{
    return [...document.querySelectorAll('.scene .node')].map(node=>{
      const rect=node.getBoundingClientRect(),style=getComputedStyle(node);
      const text=node.querySelector('.node-name');
      return {id:node.dataset.personId,width:rect.width,height:rect.height,
        visibility:style.visibility,display:style.display,
        nameDisplay:getComputedStyle(text).display,nameText:text.textContent};
    });
  });
  assert.equal(result.length,people.length,'All nodes must survive zoom changes');
  assert.ok(result.every(node=>node.visibility==='visible'&&node.display!=='none'));
  assert.ok(result.every(node=>node.width>135&&node.height>75));
  assert.ok(result.every(node=>node.nameDisplay!=='none'&&node.nameText.trim()));
  await page.locator('[data-person-id="focus"]').click();
  assert.equal(await page.evaluate(()=>window.selected),'focus');
  console.log('PASS all five Persons visible at readable mobile zoom; no card culling, tap works');
 }finally{await page.close()}
}finally{await browser.close()}
