import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createNameOnlyLabels} from '../src/app/features/family-tree/name-only-layout.ts';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const node=(id,name,x,y,tier=0,claimed=false)=>({person:{id,name,claimed},x,y,tier});
const camera={panX:0,panY:0,zoom:0.15,viewportWidth:390,viewportHeight:720};

test('far zoom displays readable names without blank cards',()=>{
  const people=[node('a','Ayah User',0,80),node('b','Ibu User',230,80),
    node('c','User',230,261,1,true),node('d','Pasangan User',460,261,1)];
  const labels=createNameOnlyLabels(people,camera,'c',null);
  assert.ok(labels.length>1);
  assert.ok(labels.some(label=>label.id==='c'&&label.name==='User'&&label.focus));
  assert.ok(labels.every(label=>label.width>=44&&label.width<=146));
  assert.equal(createNameOnlyLabels(people,{...camera,zoom:.42},'c',null).length,0);
});

test('close siblings at 15% do not produce overlapping names',()=>{
  const people=Array.from({length:34},(_,i)=>node(String(i),'Saudara '+i,i*200,250,1));
  const labels=createNameOnlyLabels(people,camera,'2',null);
  assert.ok(labels.length<people.length);
  assert.ok(labels.some(label=>label.id==='2'));
  for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){
    const a=labels[i],b=labels[j];
    const overlap=Math.abs(a.x-b.x)<(a.width+b.width)/2+12&&Math.abs(a.y-b.y)<24;
    assert.equal(overlap,false,'Labels collided: '+a.name+' / '+b.name);
  }
});

test('focus names win priority in dense viewport regions',()=>{
  const people=[node('one','Kakak Pertama',0,0),node('two','Saya',25,0),
    node('three','Adik',50,0)];
  const labels=createNameOnlyLabels(people,{...camera,panX:110,panY:130},'two','three');
  assert.ok(labels.some(label=>label.id==='two'),'Focus must remain visible');
});

test('name-only mode preserves navigation and graph geometry',()=>{
  const html=read('src/app/features/family-tree/family-tree.page.html');
  const css=read('src/family-explorer-workspace.css');
  const page=read('src/app/features/family-tree/family-tree.page.ts');
  assert.match(html,/family-name-only-layer/);
  assert.match(html,/nameOnlyLabels\(\)/);
  assert.match(html,/selectPerson\(label\.id\)/);
  assert.match(css,/scene\.zoom-far \.node\.focus-person/);
  assert.match(css,/background:transparent!important;border:0!important/);
  assert.match(css,/family-name-label/);
  assert.doesNotMatch(css,/scene\.zoom-far \.node\{\s*background:#dae5db/);
  assert.match(page,/createNameOnlyLabels\(/);
  assert.match(page,/\.family-name-label/);
});
