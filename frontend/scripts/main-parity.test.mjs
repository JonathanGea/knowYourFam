import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  addRelation, archivePerson, createPerson, editPerson,
  linkChildToCouple, renameFamilyTree, unlinkRelation
} from '../src/app/application/family-graph.ts';
import { MAIN_REFERENCE_TREE } from '../src/app/infrastructure/main-reference.data.ts';
import { LEARNING_ARTICLES, LEARNING_GROUPS } from '../src/app/features/reference/guide-content.data.ts';

const sample={
  id:'t1',name:'Keluarga Tes',
  people:[
    {id:'rudi',name:'Rudi',gender:'male',claimed:false},
    {id:'lina',name:'Lina',gender:'female',claimed:false},
    {id:'anak',name:'Anak',gender:'unknown',claimed:false},
    {id:'surya',name:'Surya',gender:'male',claimed:false}
  ],
  relationships:[{id:'rel-partner',kind:'partner',fromId:'rudi',toId:'lina',status:'confirmed'}]
};

test('main reference seed matches main source count and preserves self identity',()=>{
  assert.equal(MAIN_REFERENCE_TREE.people.length,124);
  assert.equal(MAIN_REFERENCE_TREE.relationships.length,198);
  assert.equal(new Set(MAIN_REFERENCE_TREE.people.map(p=>p.id)).size,124);
  assert.ok(MAIN_REFERENCE_TREE.people.some(p=>p.claimed));
  const ids=new Set(MAIN_REFERENCE_TREE.people.map(p=>p.id));
  assert.ok(MAIN_REFERENCE_TREE.relationships.every(r=>ids.has(r.fromId)&&ids.has(r.toId)));
});

test('create Person with child, parent or sibling relation, keeping other Persons',()=>{
  const child=createPerson(sample,{name:'Baru',gender:'male',targetId:'rudi',relationTo:'child'});
  assert.equal(child.tree.people.length,5);
  assert.ok(child.tree.relationships.some(r=>r.fromId==='rudi'&&r.toId===child.person.id&&r.kind==='parent'));
  const parent=createPerson(sample,{name:'Ibu',gender:'female',targetId:'rudi',relationTo:'parent'});
  assert.ok(parent.tree.relationships.some(r=>r.fromId===parent.person.id&&r.toId==='rudi'));
  const sibling=createPerson(sample,{name:'Saudara',gender:'female',targetId:'rudi',relationTo:'sibling'});
  assert.ok(sibling.tree.relationships.some(r=>r.kind==='sibling'&&r.toId===sibling.person.id));
  assert.equal(sample.people.length,4);
});

test('rejects invalid dates, duplicate family links and ancestry cycles',()=>{
  assert.throws(()=>createPerson(sample,{name:'X',gender:'male',birthDate:'2000-02-31',relationTo:'none'}),/tidak valid/);
  assert.throws(()=>createPerson(sample,{name:'X',gender:'male',birthOrder:0,relationTo:'none'}),/1–999/);
  const parent=addRelation(sample,'rudi','anak','parent');
  assert.throws(()=>addRelation(parent,'rudi','anak','parent'),/sudah tercatat/);
  assert.throws(()=>addRelation(parent,'anak','rudi','parent'),/siklus/);
});

test('link child to both recorded partners atomically without duplicates',()=>{
  const next=linkChildToCouple(sample,'rudi','lina','anak');
  assert.equal(next.relationships.filter(r=>r.kind==='parent').length,2);
  assert.equal(next.relationships.find(r=>r.fromId==='rudi'&&r.toId==='anak')?.status,'unconfirmed');
  assert.throws(()=>linkChildToCouple(next,'rudi','lina','anak'),/sudah terhubung/);
  const broken=addRelation(sample,'anak','rudi','parent');
  assert.throws(()=>linkChildToCouple(broken,'rudi','lina','anak'),/siklus/);
  assert.equal(broken.relationships.filter(r=>r.kind==='parent').length,1,'no partial changes');
});

test('edit biodata, rename tree, unlink edge and archive person are immutable',()=>{
  const renamed=renameFamilyTree(sample,'Keluarga Baru');
  assert.equal(renamed.name,'Keluarga Baru');
  const edited=editPerson(sample,'rudi',{name:'Rudi Baru',gender:'male',birthDate:'2000-05-20',birthOrder:1});
  assert.equal(edited.people.find(p=>p.id==='rudi')?.name,'Rudi Baru');
  assert.equal(sample.people.find(p=>p.id==='rudi')?.name,'Rudi');
  const unlinked=unlinkRelation(sample,'rel-partner');
  assert.ok(unlinked.relationships[0].deletedAt);
  const removed=archivePerson(sample,'rudi');
  assert.ok(removed.tree.people.find(p=>p.id==='rudi')?.deletedAt);
  assert.equal(removed.affectedRelationships,1);
  assert.ok(removed.tree.people.some(p=>p.id==='lina'&&!p.deletedAt));
  assert.ok(!sample.people.some(p=>p.deletedAt));
});

test('all 14 main learning articles and 6 guide categories are migrated',()=>{
  assert.equal(LEARNING_ARTICLES.length,14);
  assert.equal(LEARNING_GROUPS.length,6);
  assert.ok(LEARNING_ARTICLES.every(a=>a.steps.length===4&&LEARNING_GROUPS.some(g=>g.id===a.group)));
});

test('tutorial mutations never save to browser storage and route exits restore data',()=>{
  const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
  const store=readFileSync(resolve(root,'src/app/application/family-tree.store.ts'),'utf8');
  const page=readFileSync(resolve(root,'src/app/features/family-tree/family-tree.page.ts'),'utf8');
  assert.match(store,/if\s*\(!this\.tutorialActive\(\)\)\s*await this\.repository\.save/);
  assert.match(store,/endTutorialTree\(\)/);
  assert.match(page,/ngOnDestroy\(\): void/);
  assert.match(page,/this\.store\.endTutorialTree\(\)/);
});
