import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPersonOverview } from '../src/app/application/person-overview.ts';
import { resolveKinship } from '../src/app/application/relationship-kinship.ts';

const p=(id,gender='unknown',extra={})=>({id,name:id,gender,claimed:false,...extra});
const people=[
  p('user','male'),p('partner','female',{nickname:'Ira',residence:' Medan ',occupation:'Guru',birthPlace:'Medan'}),
  p('father','male'),p('mother','female'),
  p('uncle','male',{residence:'Jakarta',occupation:'Dokter',birthPlace:'Bogor'}),
  p('grandfather','male'),p('child','female',{residence:'Tangerang'}),
  p('grandchild','male'),p('niece','female'),p('sibling','female'),
  p('stranger','unknown',{birthPlace:'Bandung'}),
  p('secondChild','male')
];
let count=0;
const parent=(a,b)=>({id:'e'+count++,kind:'parent',fromId:a,toId:b,status:'confirmed'});
const partner=(a,b)=>({id:'e'+count++,kind:'partner',fromId:a,toId:b,status:'confirmed'});
const edges=[
  parent('father','user'),parent('mother','user'),
  parent('father','sibling'),parent('mother','sibling'),
  parent('grandfather','father'),parent('grandfather','uncle'),
  parent('user','child'),parent('partner','child'),
  parent('user','secondChild'),parent('partner','secondChild'),
  parent('child','grandchild'),parent('sibling','niece'),
  partner('user','partner')
];
function preview(id,viewer='user',givenPeople=people,givenEdges=edges){
  const target=givenPeople.find(item=>item.id===id);
  assert.ok(target);
  return buildPersonOverview(target,viewer,givenPeople,givenEdges,
    resolveKinship(givenPeople,givenEdges,viewer,id));
}

test('partner context counts only children recorded for both partners, never duplicates badge',()=>{
  const result=preview('partner');
  assert.equal(result.familyContext,'2 anak bersama yang tercatat di silsilah');
  assert.equal(result.nickname,'Ira');
  assert.deepEqual(result.facts,[
    {id:'residence',label:'Domisili',value:'Medan'},
    {id:'occupation',label:'Pekerjaan',value:'Guru'}
  ]);
  assert.equal(result.facts.length,2);
});

test('indirect relatives get one meaningful context rather than repeated relationship breadcrumbs',()=>{
  const uncle=preview('uncle');
  assert.match(uncle.familyContext,/Saudara laki-laki dari Ayah Anda/);
  const grand=preview('grandfather');
  assert.equal(grand.familyContext,'Orang tua dari father');
  const grandson=preview('grandchild');
  assert.equal(grandson.familyContext,'Anak dari child');
  const niece=preview('niece');
  assert.equal(niece.familyContext,'Anak dari sibling');
});

test('direct relationships without a new family insight remain compact',()=>{
  assert.equal(preview('father').familyContext,null);
  assert.equal(preview('sibling').familyContext,null);
  assert.equal(preview('user').familyContext,null);
  assert.equal(preview('stranger').familyContext,null);
});

test('unlinked account never guesses kinship or a family context',()=>{
  const result=preview('uncle',null);
  assert.equal(result.familyContext,null);
  assert.equal(result.facts.length,2);
});

test('personal facts omit blanks, use birth place only as fallback and never exceed two',()=>{
  assert.deepEqual(preview('stranger').facts,[
    {id:'birthPlace',label:'Tempat lahir',value:'Bandung'}
  ]);
  assert.deepEqual(preview('father').facts,[]);
  const duplicate=p('user-2','male',{name:'Alias',nickname:'alias',occupation:' ',birthPlace:'  '});
  const result=buildPersonOverview(duplicate,null,[duplicate],[],{
    status:'unlinked',label:'Hubungan belum tersedia',explanation:'',route:[]
  });
  assert.equal(result.nickname,null);
  assert.deepEqual(result.facts,[]);
});

test('disputed family edges cannot create family overview insights',()=>{
  const disputedEdges=edges.map(edge=>edge.kind==='parent'&&edge.fromId==='partner'?
    {...edge,status:'disputed'}:edge);
  const result=preview('partner','user',people,disputedEdges);
  assert.equal(result.familyContext,null);
});
