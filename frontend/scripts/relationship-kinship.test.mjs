import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveKinship } from '../src/app/application/relationship-kinship.ts';

const person=(id,gender='unknown',birthDate, birthOrder)=>({
  id,name:id,gender,birthDate,birthOrder,claimed:false
});
const people=[
  person('user','male','2000-01-01',2),
  person('father','male','1971-01-01'),
  person('mother','female','1973-01-01'),
  person('older','female','1997-01-01',1),
  person('younger','male','2005-01-01',3),
  person('grandpa','male','1940-01-01'),
  person('grandma','female','1942-01-01'),
  person('uncle','male','1977-01-01'),
  person('aunt','female','1978-01-01'),
  person('cousin','female','2002-01-01'),
  person('niece','female','2025-01-01'),
  person('spouse','female','2001-01-01'),
  person('son','male','2023-01-01'),
  person('grandchild','female','2046-01-01'),
  person('unrelated','unknown'),
  person('unknown-age','male')
];
let index=0;
const parent=(a,b,status='confirmed')=>({
  id:'parent-'+index++,kind:'parent',fromId:a,toId:b,status
});
const partner=(a,b)=>({id:'partner-'+index++,kind:'partner',fromId:a,toId:b,status:'confirmed'});
const edges=[
  parent('father','user'),parent('mother','user'),
  parent('father','older'),parent('mother','older'),
  parent('father','younger'),parent('mother','younger'),
  parent('grandpa','father'),parent('grandma','father'),
  parent('grandpa','uncle'),parent('grandma','uncle'),
  parent('grandpa','aunt'),parent('grandma','aunt'),
  parent('uncle','cousin'),parent('older','niece'),
  parent('user','son'),parent('son','grandchild'),
  partner('user','spouse')
];
const resolve=(id,viewer='user')=>resolveKinship(people,edges,viewer,id);

test('viewer must be explicitly associated with a Person, never guessed from focused tree',()=>{
  const missing=resolve('father',null);
  assert.equal(missing.status,'unlinked');
  assert.match(missing.label,/belum tersedia/i);
  assert.equal(resolve('user').label,'Ini Anda');
  assert.equal(resolve('unrelated').status,'unknown');
});

test('direct family and sibling age labels reflect actual recorded order',()=>{
  assert.equal(resolve('father').label,'Ayah Anda');
  assert.equal(resolve('mother').label,'Ibu Anda');
  assert.equal(resolve('older').label,'Kakak Anda');
  assert.equal(resolve('younger').label,'Adik Anda');
  assert.equal(resolve('son').label,'Putra Anda');
  assert.equal(resolve('spouse').label,'Pasangan Anda');
  assert.equal(resolveKinship(people,edges,'older','user').label,'Adik Anda');
});

test('extended relatives and evidence explanation use the relationship graph',()=>{
  assert.equal(resolve('grandpa').label,'Kakek Anda');
  assert.equal(resolve('grandma').label,'Nenek Anda');
  assert.equal(resolve('uncle').label,'Paman Anda');
  assert.equal(resolve('aunt').label,'Bibi Anda');
  assert.match(resolve('uncle').explanation,/Ayah Anda/);
  assert.deepEqual(resolve('uncle').route,['Anda','Ayah','Paman']);
  assert.equal(resolve('cousin').label,'Sepupu Anda');
  assert.equal(resolve('niece').label,'Keponakan Anda');
  assert.equal(resolve('grandchild').label,'Cucu Anda');
});

test('unknown birth order does not invent older/younger labels',()=>{
  const additional=[
    parent('father','unknown-age'),parent('mother','unknown-age')
  ];
  const value=resolveKinship(people,[...edges,...additional],'user','unknown-age');
  assert.equal(value.label,'Saudara Anda');
});

test('disputed relationship edges cannot establish a specific kinship label',()=>{
  const dis=[parent('father','unrelated','disputed'),parent('mother','unrelated','disputed')];
  assert.equal(resolveKinship(people,[...edges,...dis],'user','unrelated').status,'unknown');
});

test('conflicting equal-distance relationships yield an ambiguous label',()=>{
  const value=resolveKinship(people,[...edges,partner('user','older')],'user','older');
  assert.equal(value.status,'ambiguous');
  assert.equal(value.label,'Kerabat Anda');
});
