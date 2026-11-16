import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {createNameOnlyLabels} from '../src/app/features/family-tree/name-only-layout.ts';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const css=[
  read('src/main-parity.css'),read('src/app/features/family-tree/family-tree.page.css'),
  read('src/family-explorer-workspace.css')
].join('\n');
const nodes=[
  {person:{id:'a',name:'Ayah User'},x:0,y:180,tier:0},
  {person:{id:'b',name:'Ibu User'},x:245,y:180,tier:0},
  {person:{id:'c',name:'User',claimed:true},x:150,y:360,tier:1},
  {person:{id:'d',name:'Saudara User'},x:450,y:360,tier:1}
];
const camera={panX:100,panY:130,zoom:.15,viewportWidth:390,viewportHeight:720};
const labels=createNameOnlyLabels(nodes,camera,'c',null);
assert.ok(labels.length>=2,'Screen-space labels missing for small zoom');
const markup=labels.map(label=>'<button class="family-name-label'+(label.focus?' is-focus':'')+
  '" data-person-id="'+label.id+'" style="left:'+label.x+'px;top:'+label.y+
  'px;width:'+label.width+'px" onclick="window.lastClicked=this.dataset.personId">'+
  label.name+'</button>').join('');
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:760},hasTouch:true});
  try{
    await page.setContent('<!doctype html><html><head>'+
      '<meta name="viewport" content="width=device-width,initial-scale=1"><style>'+
      css+'</style></head><body><div class="app main-parity-ui family-explorer-page">'+
      '<div class="viewport" style="width:390px;height:720px;position:relative">'+
      '<div class="scene zoom-far" style="width:1300px;height:700px;transform:translate(100px,130px) scale(.15)">'+
      nodes.map(node=>'<button class="node" style="left:'+node.x+'px;top:'+node.y+'px">'+
        '<span class="node-top"><span class="person-photo">U</span>'+
        '<span class="node-copy"><span class="node-name">'+node.person.name+'</span>'+
        '</span></span></button>').join('')+'</div>'+
      '<div class="family-name-only-layer">'+markup+'</div></div></div></body></html>');
    const result=await page.evaluate(()=>{
      const node=document.querySelector('.scene.zoom-far .node');
      const top=node.querySelector('.node-top');
      const label=document.querySelector('.family-name-label');
      const style=getComputedStyle(node);
      const rect=label.getBoundingClientRect();
      return {nodeBackground:style.backgroundColor,nodeBorder:style.borderTopWidth,
        nodePointer:style.pointerEvents,nodeTopDisplay:getComputedStyle(top).display,
        font:getComputedStyle(label).fontSize,visible:rect.width>35&&rect.height>=18,
        labelPointer:getComputedStyle(label).pointerEvents};
    });
    assert.equal(result.nodeBackground,'rgba(0, 0, 0, 0)','Blank card boxes still rendered');
    assert.equal(result.nodeBorder,'0px','Far zoom still has card borders');
    assert.equal(result.nodePointer,'none');
    assert.equal(result.nodeTopDisplay,'none','Hidden card contents must not create ghosts');
    assert.equal(result.font,'12px','Person names must remain legible at 15%');
    assert.equal(result.labelPointer,'auto','Name labels must be interactive');
    assert.ok(result.visible,'Name label should occupy visible screen space');
    await page.locator('.family-name-label.is-focus').click();
    assert.equal(await page.evaluate(()=>window.lastClicked),'c','Tapping the focus name failed');
    console.log('PASS far-zoom names, 390px viewport, 15% canvas, tap interaction');
  }finally{await page.close()}
}finally{await browser.close()}
