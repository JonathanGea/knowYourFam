import test from 'node:test';
import assert from 'node:assert/strict';
import { computeMainCanvasLayout, CANVAS_CARD_WIDTH, CANVAS_CARD_HEIGHT } from '../src/app/features/family-tree/main-layout-engine.ts';
import { createMainCanvasPaths } from '../src/app/features/family-tree/main-connector-engine.ts';

const person = (id, date, gender='unknown') => ({
  id, name:id, gender, birthDate:date, claimed:false
});
const people = [
  person('hasan','1940-01-01','male'),person('aminah','1942-01-01','female'),
  person('budi','1970-01-01','male'),person('santi','1973-01-01','female'),
  person('tono','1972-01-01','male'),person('siti','1975-01-01','female'),
  person('surya','1998-01-01','male'),person('rudi','2000-01-01','male'),
  person('dewi','2004-01-01','female'),person('lina','2000-10-01','female'),
  person('joko','1971-01-01','male'),person('ratih','1974-01-01','female'),
  person('arka','2024-01-01','male')
];
const parents = [
  ['hasan','budi'],['aminah','budi'],['hasan','tono'],['aminah','tono'],
  ['budi','surya'],['santi','surya'],
  ['tono','rudi'],['siti','rudi'],['tono','dewi'],['siti','dewi'],
  ['joko','lina'],['ratih','lina'],
  ['rudi','arka'],['lina','arka']
];
const partners = [
  ['hasan','aminah'],['budi','santi'],['tono','siti'],['joko','ratih'],
  // Reverse stored order: male/female pairing is still male-left in canvas.
  ['lina','rudi']
];
const relationship = (kind, pairs) => pairs.map(([fromId,toId],index)=>({
  id:kind+index,kind,fromId,toId,status:'confirmed'
}));
const links = [...relationship('parent',parents),...relationship('partner',partners)];
const context = (visiblePeople=people,visibleRelationships=links,mode='overview') => ({
  allPeople:people,allRelationships:links,visiblePeople,visibleRelationships,
  focusId:'rudi',mode
});
const geometry = input => computeMainCanvasLayout(input);
const byId = result => new Map(result.positions.map(p=>[p.id,p]));

test('Partner groups remain atomic, siblings share level and children are below parents', () => {
  const result=geometry(context()), positions=byId(result);
  assert.equal(result.positions.length,people.length);
  assert.equal(positions.get('rudi').level,positions.get('lina').level);
  assert.ok(positions.get('rudi').x < positions.get('lina').x);
  assert.equal(positions.get('budi').level,positions.get('tono').level);
  assert.ok(positions.get('budi').x < positions.get('tono').x);
  assert.equal(positions.get('rudi').level,positions.get('dewi').level);
  assert.ok(positions.get('arka').level > positions.get('rudi').level);
  assert.ok(positions.get('lina').level > positions.get('joko').level);
  assert.equal(result.maxDepth+1,4);
});

test('Card positions do not overlap on same generation; no duplicate Persons', () => {
  const result=geometry(context());
  assert.equal(new Set(result.positions.map(p=>p.id)).size,result.positions.length);
  for(let i=0;i<result.positions.length;i++)for(let j=i+1;j<result.positions.length;j++){
    const a=result.positions[i],b=result.positions[j];
    if(a.level!==b.level)continue;
    const overlap= a.x < b.x+CANVAS_CARD_WIDTH && b.x < a.x+CANVAS_CARD_WIDTH &&
      a.y < b.y+CANVAS_CARD_HEIGHT && b.y < a.y+CANVAS_CARD_HEIGHT;
    assert.equal(overlap,false,`Overlap: ${a.id} / ${b.id}`);
  }
});

test('Orthogonal connectors use a shared family bus, separate partner links', () => {
  const input=context(),geom=geometry(input);
  const paths=createMainCanvasPaths({...input,positions:geom.positions});
  assert.ok(paths.length >= 10);
  assert.ok(paths.some(x=>x.kind==='partner'));
  assert.ok(paths.some(x=>x.kind==='parent'));
  assert.ok(paths.every(p=>/^[MmLlHhVvCcSsQqTtAaZz0-9., +\-Ee]+$/.test(p.d)));
});

test('Hidden parent relatives preserve sibling tier and get dashed bracket', () => {
  const shown=new Set(['rudi','dewi']);
  const input=context(people.filter(p=>shown.has(p.id)),[], 'focus');
  const geom=geometry(input),p=byId(geom);
  assert.equal(p.get('rudi').level,p.get('dewi').level);
  const paths=createMainCanvasPaths({...input,positions:geom.positions});
  assert.ok(paths.some(path=>path.kind==='sibling'));
});

test('Adding a fifth ancestor generation does not clip the family tree', () => {
  const elder=person('great','1910-01-01','male');
  const allPeople=[...people,elder];
  const allRelationships=[...links,...relationship('parent',[['great','hasan']])];
  const input={...context(),allPeople,allRelationships,visiblePeople:allPeople,visibleRelationships:allRelationships};
  const result=geometry(input),p=byId(result);
  assert.ok(p.get('hasan').level>p.get('great').level);
  assert.ok(result.height>=p.get('arka').y+CANVAS_CARD_HEIGHT);
});
