import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createCompactPersonCards,COMPACT_CARD_WIDTH,COMPACT_CARD_HEIGHT} from '../src/app/features/family-tree/compact-person-card-layout.ts';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const n=(id,name,x,y)=>({person:{id,name},x,y,tier:0});
const cam={panX:110,panY:110,zoom:.15,viewportWidth:390,viewportHeight:720};
test('cards keep Person identity at zoom 15%',()=>{
  const nodes=[n('a','Ayah User',0,0),n('b','Ibu User',800,0),n('c','User',400,400)];
  const cards=createCompactPersonCards(nodes,cam,'c',null);
  assert.ok(cards.some(c=>c.id==='c'&&c.focus));
  assert.ok(cards.some(c=>['Ayah User','Ibu User'].includes(c.name)),'At least one readable parent card must remain');
  assert.equal(createCompactPersonCards(nodes,{...cam,zoom:.42},'c',null).length,0);
});
test('avoid overlaps without changing graph data',()=>{
  const nodes=Array.from({length:30},(_,i)=>n(String(i),'Saudara '+i,i*200,200));
  const cards=createCompactPersonCards(nodes,cam,'3',null);
  assert.ok(cards.length<nodes.length);
  assert.ok(cards.some(c=>c.id==='3'));
  for(let i=0;i<cards.length;i++)for(let j=i+1;j<cards.length;j++){
    const a=cards[i],b=cards[j];
    assert.equal(Math.abs(a.x-b.x)<COMPACT_CARD_WIDTH+12&&
      Math.abs(a.y-b.y)<COMPACT_CARD_HEIGHT+8,false,'Overlap '+a.name+'/'+b.name);
  }
});
test('UI renders boxed cards with avatar and interactive name',()=>{
  const html=read('src/app/features/family-tree/family-tree.page.html');
  const css=read('src/family-explorer-workspace.css');
  const page=read('src/app/features/family-tree/family-tree.page.ts');
  assert.match(html,/compact-person-layer/);
  assert.match(html,/compact-person-avatar/);
  assert.match(html,/compact-person-name/);
  assert.match(html,/selectPerson\(card\.id\)/);
  assert.match(css,/background:#fff;box-shadow/);
  assert.match(page,/createCompactPersonCards/);
  assert.doesNotMatch(html,/family-name-only-layer|family-name-label/);
});
