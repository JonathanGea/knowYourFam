import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDemoTreeJson } from '../src/app/infrastructure/demo-import.ts';
import { MAIN_SAMPLE_TREE } from '../src/app/infrastructure/main-sample.data.ts';

const legacy = {
  version:1,treeName:'Keluarga Uji',
  people:[
    {id:'a',name:'Ayah',gender:'male',birth:'1970-01-01',self:true},
    {id:'b',name:'Anak',gender:'female',birth:'2000-01-01',self:false}
  ],
  parent:[['a','b']],partner:[],sibling:[]
};

test('main legacy JSON import preserves people and directed parent relations', () => {
  const tree=parseDemoTreeJson(JSON.stringify(legacy));
  assert.equal(tree.name,'Keluarga Uji');
  assert.equal(tree.people.length,2);
  assert.equal(tree.people[0].birthDate,'1970-01-01');
  assert.equal(tree.relationships[0].fromId,'a');
  assert.equal(tree.relationships[0].toId,'b');
  assert.equal(tree.people[0].claimed,true);
});

test('Angular JSON export can round-trip through parser', () => {
  const parsed=parseDemoTreeJson(JSON.stringify(MAIN_SAMPLE_TREE));
  assert.equal(parsed.people.length,31);
  assert.equal(parsed.relationships.length,MAIN_SAMPLE_TREE.relationships.length);
  assert.equal(parsed.name,MAIN_SAMPLE_TREE.name);
});

test('rejects duplicate identities and orphaned relationships', () => {
  assert.throws(()=>parseDemoTreeJson(JSON.stringify({...legacy,
    people:[legacy.people[0],legacy.people[0]]})),/duplikat/);
  assert.throws(()=>parseDemoTreeJson(JSON.stringify({...legacy,parent:[['a','missing']]})),/tidak valid/);
});

test('rejects a parent-child ancestry cycle', () => {
  assert.throws(()=>parseDemoTreeJson(JSON.stringify({...legacy,parent:[['a','b'],['b','a']]})),/siklus/);
});

test('rejects invalid dates and duplicate links in both directions', () => {
  assert.throws(()=>parseDemoTreeJson(JSON.stringify({...legacy,
    people:[{...legacy.people[0],birth:'1970-99-50'},legacy.people[1]]})),/Tanggal/);
  assert.throws(()=>parseDemoTreeJson(JSON.stringify({...legacy,
    partner:[['a','b'],['b','a']]})),/duplikat/);
});
