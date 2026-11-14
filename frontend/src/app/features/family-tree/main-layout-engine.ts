// @ts-nocheck
/**
 * Transitional pure-logic port of KnowYourFam main canvas layout.
 * Original source: main/index.html at blob c1252c980dd584703b8d054dfb034faaabb43aa9.
 * Keeps original spouse groups, ancestor cohorts, birth-order constraints,
 * family balancing and collision-avoidance passes intact.
 * TODO: type the internal groups/maps and remove ts-nocheck after parity tests.
 * This module has NO browser, Supabase or DOM dependencies.
 */
import type { Person, FamilyRelationship } from '../../domain/family-tree.model';

export interface LegacyGraphContext {
  readonly visiblePeople: readonly Person[];
  readonly visibleRelationships: readonly FamilyRelationship[];
  readonly allPeople: readonly Person[];
  readonly allRelationships: readonly FamilyRelationship[];
  readonly focusId: string;
  readonly mode: 'focus' | 'overview';
}
export interface LegacyLayoutPosition {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly level: number;
}
export interface LegacyLayoutOutput {
  readonly width: number;
  readonly height: number;
  readonly maxDepth: number;
  readonly positions: readonly LegacyLayoutPosition[];
  readonly warnings: readonly string[];
}
export const MAIN_LAYOUT_SOURCE_BLOB = 'c1252c980dd584703b8d054dfb034faaabb43aa9';
export const CANVAS_CARD_WIDTH = 185;
export const CANVAS_CARD_HEIGHT = 113;

export function computeMainCanvasLayout(input: LegacyGraphContext): LegacyLayoutOutput {
  const full = input.allPeople, visible = input.visiblePeople;
  const allToPairs = (kind: string, source: readonly FamilyRelationship[]) =>
    source.filter(r => r.kind === kind).map(r => [r.fromId, r.toId]);
  const data = {
    people: full.map(p => ({ id: p.id, name: p.name, gender: p.gender,
      birth: p.birthDate || '', birthOrder: p.birthOrder ?? null })),
    parent: allToPairs('parent', input.allRelationships),
    partner: allToPairs('partner', input.allRelationships),
    sibling: allToPairs('sibling', input.allRelationships)
  };
  const gdata = {
    people: data.people.filter(p => visible.some(x => x.id === p.id)),
    parent: allToPairs('parent', input.visibleRelationships),
    partner: allToPairs('partner', input.visibleRelationships),
    sibling: allToPairs('sibling', input.visibleRelationships)
  };
  let treeMode=input.mode,focusRoot=input.focusId,defaultBranchKeys=new Set(),
    displayGraph=gdata,maxDepth=0,size={w:900,h:600},positions=new Map();
  const W=185,H=113,GAP=26,SPACE=80,ROW=181,PADX=167,TOPY=76;
  const warnings: string[] = [];
  const toast = (text: string) => { if(!warnings.includes(text))warnings.push(text); };
  const byId = (id: string) => data.people.find(p => p.id === id);
  const rel = (id: string) => ({
    parents:data.parent.filter(x=>x[1]===id).map(x=>x[0]),
    children:data.parent.filter(x=>x[0]===id).map(x=>x[1]),
    partners:data.partner.filter(x=>x.includes(id)).map(x=>x[0]===id?x[1]:x[0]),
    siblings:[...new Set([...data.sibling.filter(x=>x.includes(id)).map(x=>x[0]===id?x[1]:x[0]),
      ...data.parent.filter(x=>x[1]===id).flatMap(([parent])=>data.parent.filter(([pa,ch])=>pa===parent&&ch!==id).map(x=>x[1]))])]
  });
  const focusDefaultBranchKeys=(_id: string)=>new Set();
  const visibleFamilyGraph=()=>gdata;
function siblingBirthCompare(a,b){
 const p=typeof a==='string'?byId(a):a,q=typeof b==='string'?byId(b):b;
 if(!p||!q)return 0;
 const rank=x=>Number.isInteger(x.birthOrder)&&x.birthOrder>=1&&x.birthOrder<=999?x.birthOrder:null;
 const pa=rank(p),pb=rank(q);
 if(pa!==null&&pb!==null&&pa!==pb)return pa<pb?-1:1;
 const validDate=x=>typeof x.birth==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x.birth)&&!Number.isNaN(Date.parse(x.birth))?x.birth:null;
 const da=validDate(p),db=validDate(q);
 if(da&&db&&da!==db)return da<db?-1:1;
 return 0;
}
function makeLayout(){
 // A spouse is a member of a couple, NOT a member of the same birth-family as their partner.
 // Keep each spouse's parents in separate ancestor branches. Couple groups are used only
 // to put partners on the same horizontal generation.
 defaultBranchKeys=treeMode==='focus'&&focusRoot?focusDefaultBranchKeys(focusRoot):new Set();
 displayGraph=visibleFamilyGraph();const gdata=displayGraph;
 // Generation and sibling placement must use FAMILY FACTS, not just currently
 // rendered parent edges. In Focus mode, a spouse's parents can be hidden even
 // while that spouse and their expanded siblings are visible. Such siblings
 // still belong to the spouse's generation, never to the top ancestor row.
 const fullVisibleSiblings=new Map(gdata.people.map(p=>[p.id,new Set()]));
 const addVisibleSibling=(a,b)=>{
  if(a===b||!fullVisibleSiblings.has(a)||!fullVisibleSiblings.has(b))return;
  fullVisibleSiblings.get(a).add(b);fullVisibleSiblings.get(b).add(a);
 };
 for(const [a,b] of data.sibling)addVisibleSibling(a,b);
 const childrenByRecordedParent=new Map();
 for(const [parent,child] of data.parent){
  if(!fullVisibleSiblings.has(child))continue;
  if(!childrenByRecordedParent.has(parent))childrenByRecordedParent.set(parent,[]);
  childrenByRecordedParent.get(parent).push(child);
 }
 for(const children of childrenByRecordedParent.values())
  for(let i=0;i<children.length;i++)for(let j=i+1;j<children.length;j++)addVisibleSibling(children[i],children[j]);
 const knownVisibleSibling=(a,b)=>!!fullVisibleSiblings.get(a)?.has(b);
 const ds=Object.fromEntries(gdata.people.map(p=>[p.id,p.id]));
 const find=x=>{if(ds[x]!==x)ds[x]=find(ds[x]);return ds[x]};
 const join=(a,b)=>{if(ds[a]&&ds[b])ds[find(b)]=find(a)};
 for(const [a,b] of gdata.partner)join(a,b);
 const groups=new Map(),idGroup=new Map();
 for(let i=0;i<gdata.people.length;i++){
  const person=gdata.people[i],gid=find(person.id);
  if(!groups.has(gid))groups.set(gid,{id:gid,members:[],i,level:0,children:new Set(),parents:new Set()});
  const group=groups.get(gid);group.members.push(person.id);group.i=Math.min(group.i,i);idGroup.set(person.id,gid);
 }
 // Partner order is a stable visual orientation. Keep the first recorded partner
 // on the left and the second on the right, regardless of when Person records
 // were added/imported. This is NOT a birth-order or gender assumption.
 for(const g of groups.values()){
  if(g.members.length!==2)continue;
  const pair=gdata.partner.find(([a,b])=>g.members.includes(a)&&g.members.includes(b));
  if(pair){
   const first=byId(pair[0]),second=byId(pair[1]);
   g.members=first?.gender==='female'&&second?.gender==='male'?[pair[1],pair[0]]:pair.slice();
  }
 }
 // Partner groups determine card placement, but explicit sibling relations must also
 // keep people on the same GENERATION, even if neither parent is recorded.
 // A separate cohort graph preserves generation depth without merging sibling cards.
 for(const [a,b] of gdata.parent){
  const ga=idGroup.get(a),gb=idGroup.get(b);
  if(!ga||!gb||ga===gb||groups.get(ga).children.has(gb))continue;
  groups.get(ga).children.add(gb);groups.get(gb).parents.add(ga);
 }
 const cohortParent=new Map([...groups.keys()].map(id=>[id,id]));
 const cohortFind=id=>{const p=cohortParent.get(id);if(p!==id)cohortParent.set(id,cohortFind(p));return cohortParent.get(id)};
 const cohortJoin=(a,b)=>{if(a&&b&&a!==b)cohortParent.set(cohortFind(b),cohortFind(a))};
 // Shared-parent siblings should also remain aligned when one branch has deeper ancestors.
 const siblingsByParent=new Map();
 for(const [parent,child] of gdata.parent){
  if(!siblingsByParent.has(parent))siblingsByParent.set(parent,[]);
  siblingsByParent.get(parent).push(child);
 }
 for(const children of siblingsByParent.values()){
  for(let i=1;i<children.length;i++)cohortJoin(idGroup.get(children[0]),idGroup.get(children[i]));
 }
 // Hidden parents still establish that these visible people are siblings.
 for(const [a,siblings] of fullVisibleSiblings)for(const b of siblings)cohortJoin(idGroup.get(a),idGroup.get(b));
 const cohorts=new Map();
 for(const g of groups.values()){
  const cid=cohortFind(g.id);g.cohort=cid;
  if(!cohorts.has(cid))cohorts.set(cid,{id:cid,level:0,children:new Set(),i:g.i});
  cohorts.get(cid).i=Math.min(cohorts.get(cid).i,g.i);
 }
 const cohortIn=new Map([...cohorts.keys()].map(id=>[id,0]));
 let invalidEqualRelation=false;
 for(const g of groups.values())for(const next of g.children){
  const from=cohortFind(g.id),to=cohortFind(next);
  if(from===to){invalidEqualRelation=true;continue;}
  if(!cohorts.get(from).children.has(to)){
   cohorts.get(from).children.add(to);cohortIn.set(to,cohortIn.get(to)+1);
  }
 }
 const cohortQueue=[...cohorts.values()].filter(g=>!cohortIn.get(g.id)).sort((a,b)=>a.i-b.i);
 let cohortVisited=0;
 while(cohortQueue.length){
  const g=cohortQueue.shift();cohortVisited++;
  for(const next of g.children){
   const c=cohorts.get(next);c.level=Math.max(c.level,g.level+1);
   cohortIn.set(next,cohortIn.get(next)-1);
   if(!cohortIn.get(next))cohortQueue.push(c);
  }
 }
 if(cohortVisited===cohorts.size&&!invalidEqualRelation){
  for(const g of groups.values())g.level=cohorts.get(g.cohort).level;
 }else{
  // Contradictory parent/partner/sibling data: preserve the old DAG layout
  // instead of fabricating ancestry or recursively cycling.
  const indegree=new Map([...groups.keys()].map(id=>[id,0]));
  for(const g of groups.values())for(const next of g.children)indegree.set(next,indegree.get(next)+1);
  const queue=[...groups.values()].filter(g=>!indegree.get(g.id)).sort((a,b)=>a.i-b.i);
  let visited=0;
  while(queue.length){
   const g=queue.shift();visited++;
   for(const next of g.children){
    const c=groups.get(next);c.level=Math.max(c.level,g.level+1);
    indegree.set(next,indegree.get(next)-1);
    if(!indegree.get(next))queue.push(c);
   }
  }
  if(visited!==groups.size||invalidEqualRelation)toast('Ada relasi generasi yang bertentangan; periksa data keluarga');
 }
 maxDepth=Math.max(0,...[...groups.values()].map(g=>g.level));
 // Arrange each row from descendants to ancestors. For parents, use their own children's
 // card positions, not the horizontal center of a spouse's entire family group.
 const rows=new Map();
 for(const g of groups.values()){if(!rows.has(g.level))rows.set(g.level,[]);rows.get(g.level).push(g)}
 const ownWidth=g=>g.members.length*W+Math.max(0,g.members.length-1)*GAP;
 const groupCenter=g=>g.x+ownWidth(g)/2;
 // A person's children count makes the primary branch more stable when a sibling branches.
 const descendants=id=>new Set(gdata.parent.filter(([p])=>p===id).map(([,c])=>c)).size;
 // Anchor both birth families on opposite sides of the couple that links them.
 // Parent-side selection is based on the person's parents and the stable
 // partner-record order, not gender or the order of child-parent links.
 // If the focused person has no known pair of parents, their own partner unit
 // supplies an equivalent left/right reference.
 const focusedParents=treeMode==='focus'&&focusRoot?rel(focusRoot).parents.filter(id=>idGroup.has(id)):[];
 let corePair=focusedParents.length>=2?focusedParents.slice(0,2):[];
 // Parent edges can be added in any order for different siblings. The couple
 // record provides one stable left-to-right orientation across every focus.
 if(corePair.length===2){
  const couple=data.partner.find(([a,b])=>corePair.includes(a)&&corePair.includes(b));
  if(couple)corePair=couple.slice();
 }
 if(corePair.length<2&&treeMode==='focus'&&focusRoot){
  const ownPartner=rel(focusRoot).partners.find(id=>idGroup.has(id));
  if(ownPartner)corePair=(data.partner.find(([a,b])=>(a===focusRoot&&b===ownPartner)||(b===focusRoot&&a===ownPartner))||[focusRoot,ownPartner]).slice();
 }
 const centerGroup=corePair.length===2&&idGroup.get(corePair[0])===idGroup.get(corePair[1])?idGroup.get(corePair[0]):null;
 const clanOf=(start,exclude)=>{
  const included=new Set(),seen=new Set(),pending=[start];
  while(pending.length){
   const id=pending.pop();if(seen.has(id)||id===exclude||!idGroup.has(id))continue;
   seen.add(id);included.add(id);
   const r=rel(id);
   // Descendants do not become members of an ancestor clan merely because
   // their parents belong to it. Siblings and their spouses do.
   for(const next of [...r.parents,...r.siblings,...r.partners])if(!seen.has(next)&&next!==exclude)pending.push(next);
  }
  return included;
 };
 const leftClan=centerGroup?clanOf(corePair[0],corePair[1]):new Set();
 const rightClan=centerGroup?clanOf(corePair[1],corePair[0]):new Set();
 const familySide=g=>{
  if(!centerGroup)return 0;
  if(g.id===centerGroup)return 0;
  let left=0,right=0;
  for(const id of g.members){if(leftClan.has(id))left++;if(rightClan.has(id))right++}
  return left>right?-1:right>left?1:0;
 };
 const rowGap=96;
 for(let level=maxDepth;level>=0;level--){
  const row=rows.get(level)||[];
  for(const g of row){
   const anchors=[];
   for(const id of g.members){
    for(const [,childId] of gdata.parent.filter(([parentId])=>parentId===id)){
     const childGroup=groups.get(idGroup.get(childId));
     if(!childGroup||!Number.isFinite(childGroup.x))continue;
     const memberIndex=childGroup.members.indexOf(childId);
     const childX=childGroup.x+memberIndex*(W+GAP)+W/2;
     const importance=1+Math.min(5,descendants(childId));
     anchors.push({x:childX,weight:importance});
    }
   }
   if(anchors.length){
    const weighted=anchors.reduce((sum,a)=>sum+a.x*a.weight,0)/anchors.reduce((sum,a)=>sum+a.weight,0);
    g.ideal=weighted;
   }else g.ideal=null;
  }
  // Cohort groups are sorted as atomic family units. When two people are a
  // recorded couple, the sibling family of the LEFT partner goes outward left,
  // and the sibling family of the RIGHT partner goes outward right.
  // No assumption about older/younger siblings is made from display position.
  const rowIds=new Set(row.map(g=>g.id));
  const sibBlock=new Map(row.map(g=>[g.id,g.id]));
  const root=id=>{const p=sibBlock.get(id);if(p!==id)sibBlock.set(id,root(p));return sibBlock.get(id)};
  const link=(a,b)=>{if(a&&b&&a!==b&&rowIds.has(a)&&rowIds.has(b))sibBlock.set(root(b),root(a))};
  const groupEdges=new Map(row.map(g=>[g.id,new Set()]));
  const connect=(a,b)=>{
   if(!a||!b||a===b||!rowIds.has(a)||!rowIds.has(b))return;
   if(familySide(groups.get(a))!==familySide(groups.get(b)))return;
   link(a,b);groupEdges.get(a).add(b);groupEdges.get(b).add(a);
  };
  // Both explicit siblings (unknown parents) AND siblings sharing a parent
  // have the same left/right rules; only their connector styles differ.
  for(const [a,siblings] of fullVisibleSiblings)for(const b of siblings)connect(idGroup.get(a),idGroup.get(b));
  const registeredParentKey=id=>gdata.parent.filter(([,child])=>child===id).map(([parent])=>parent).sort().join('|');
  for(const children of siblingsByParent.values()){
   for(let i=0;i<children.length;i++)for(let j=i+1;j<children.length;j++){
    // Half-siblings can appear nearby but must never share one child-bus.
    if(registeredParentKey(children[i])===registeredParentKey(children[j]))connect(idGroup.get(children[i]),idGroup.get(children[j]));
   }
  }
  const areSiblings=knownVisibleSibling;
  const blocks=new Map();
  for(const g of row){const id=root(g.id);g.siblingBlock=id;if(!blocks.has(id))blocks.set(id,[]);blocks.get(id).push(g)}
  const idealOf=arr=>{const anchors=arr.filter(g=>g.ideal!==null);return anchors.length?anchors.reduce((s,g)=>s+g.ideal,0)/anchors.length:null};
  const arranged=[...blocks.values()].sort((a,b)=>{
   const sideA=familySide(a[0]),sideB=familySide(b[0]);
   if(sideA!==sideB)return sideA-sideB;
   const ia=idealOf(a),ib=idealOf(b);
   return ia!==null&&ib!==null?ia-ib||a[0].i-b[0].i:
    ia!==null?-1:ib!==null?1:a[0].i-b[0].i;
  });
  row.length=0;
  for(const block of arranged){
   const side=familySide(block[0]);
   const orderedId=g=>g.members.slice().sort().join('|');
   // Prefer a couple with children as the anchor, rather than a newly-added
   // spouse of a sibling. Both ends stay stable when more siblings are added.
   const anchors=block.filter(g=>g.members.length===2&&block.some(other=>other!==g&&
    other.members.some(id=>g.members.some(mid=>areSiblings(id,mid)))));
   anchors.sort((a,b)=>Number(b.ideal!==null)-Number(a.ideal!==null)||
    b.members.reduce((n,id)=>n+descendants(id),0)-a.members.reduce((n,id)=>n+descendants(id),0)||
    orderedId(a).localeCompare(orderedId(b)));
   const anchor=anchors[0]||null;
   if(anchor){
    const sideByGroup=new Map([[anchor.id,0]]);
    // Traverse each spouse's sibling network separately; never cross through
    // the anchor couple to reach the opposite spouse's relatives.
    for(let partnerIndex=0;partnerIndex<2;partnerIndex++){
     const direction=partnerIndex===0?-1:1;
     const start=anchor.members[partnerIndex],queue=[];
     for(const other of block){
      if(other===anchor)continue;
      if(other.members.some(id=>areSiblings(start,id))){
       if(!sideByGroup.has(other.id)){sideByGroup.set(other.id,direction);queue.push(other.id)}
      }
     }
     while(queue.length){
      const current=queue.shift();
      for(const n of groupEdges.get(current)||[]){
       if(n===anchor.id||sideByGroup.has(n))continue;
       sideByGroup.set(n,direction);queue.push(n);
      }
     }
    }
    block.sort((a,b)=>{
     const da=sideByGroup.get(a.id)??0,db=sideByGroup.get(b.id)??0;
     if(da!==db)return da-db;
     // Use immutable person IDs for unspecified sibling order. Birth-order
     // data may be used later only when explicitly known.
     return orderedId(a).localeCompare(orderedId(b));
    });
    // Each sibling's own spouse stays on the outside of the main couple.
    for(const group of block){
     if(group===anchor||group.members.length!==2)continue;
     const direction=sideByGroup.get(group.id);
     if(!direction)continue;
     const relative=group.members.find(id=>areSiblings(id,anchor.members[direction===-1?0:1]));
     if(relative){
      const spouse=group.members.find(id=>id!==relative);
      group.members=direction===-1?[spouse,relative]:[relative,spouse];
     }
    }
   }else{
    block.sort((a,b)=>{
     if(a.ideal!==null&&b.ideal!==null)return a.ideal-b.ideal||orderedId(a).localeCompare(orderedId(b));
     if(a.ideal!==null)return side===-1?1:-1;
     if(b.ideal!==null)return side===-1?-1:1;
     return orderedId(a).localeCompare(orderedId(b));
    });
   }
   row.push(...block);
  }
  let lastRight=-Infinity,previous=null;
  for(const g of row){
   const gap=previous&&g.siblingBlock===previous.siblingBlock?56:rowGap;
   const ideal=g.ideal===null?(Number.isFinite(lastRight)?lastRight+gap+ownWidth(g)/2:ownWidth(g)/2):g.ideal;
   g.x=Math.max(ideal-ownWidth(g)/2,Number.isFinite(lastRight)?lastRight+gap:0);
   lastRight=g.x+ownWidth(g);previous=g;
  }
  // Fit the packed row around the weighted targets, without allowing nodes to overlap.
  const anchored=row.filter(g=>g.ideal!==null);
  if(anchored.length){
   const correction=anchored.reduce((sum,g)=>sum+(g.ideal-groupCenter(g)),0)/anchored.length;
   for(const g of row)g.x+=correction;
  }
 }
 // Follow-up layout pass: keep every exact parent-set child cohort together,
 // and position that cohort below its own parent unit, not by global Person input order.
 // Partner nodes remain an indivisible group, so spouse's own birth-family stays connected.
 const rowsAscending=[...rows.keys()].sort((a,b)=>a-b);
 for(const level of rowsAscending){
  if(level===0)continue;
  const row=rows.get(level)||[],chunks=new Map();
  for(const g of row){
   const key=g.siblingBlock||g.id;
   if(!chunks.has(key))chunks.set(key,[]);
   chunks.get(key).push(g);
  }
  const centersFor=chunk=>{
   const anchors=[];
   for(const g of chunk)for(const personId of g.members){
    const ids=gdata.parent.filter(([,child])=>child===personId).map(([parent])=>parent);
    const parentPositions=ids.map(id=>{
     const parentGroup=groups.get(idGroup.get(id));
     if(!parentGroup||!Number.isFinite(parentGroup.x)||parentGroup.level>=g.level)return null;
     return parentGroup.x+parentGroup.members.indexOf(id)*(W+GAP)+W/2;
    }).filter(x=>x!==null);
    if(parentPositions.length)anchors.push(parentPositions.reduce((a,b)=>a+b,0)/parentPositions.length);
   }
   return anchors.length?anchors.reduce((a,b)=>a+b,0)/anchors.length:null;
  };
  const ordered=[...chunks.values()].sort((a,b)=>{
   const sideA=familySide(a[0]),sideB=familySide(b[0]);
   if(sideA!==sideB)return sideA-sideB;
   const ca=centersFor(a),cb=centersFor(b);
   if(ca!==null&&cb!==null)return ca-cb||a[0].x-b[0].x;
   if(ca!==null)return -1;
   if(cb!==null)return 1;
   return a[0].x-b[0].x;
  });
  // Use the previous-pass group ordering INSIDE a sibling block. Only blocks move.
  let lastRight=-Infinity;
  for(const chunk of ordered){
   const anchorX=centersFor(chunk);
   const width=chunk.reduce((n,g)=>n+ownWidth(g),0)+Math.max(0,chunk.length-1)*56;
   const preferred=anchorX!==null?anchorX-width/2:chunk[0].x;
   let start=Math.max(0,preferred,Number.isFinite(lastRight)?lastRight+rowGap:0);
   for(const g of chunk){g.x=start;start+=ownWidth(g)+56;}
   lastRight=start-56;
  }
 }
 // Restore the stable couple order AFTER the sibling-placement passes, which
 // may have temporarily reversed a spouse pair while arranging side branches.
 // A known male/female pair uses male-left; unspecified pairs use recorded order.
 for(const g of groups.values()){
  if(g.members.length!==2)continue;
  const pair=gdata.partner.find(([a,b])=>g.members.includes(a)&&g.members.includes(b));
  if(pair)g.members=byId(pair[0])?.gender==='female'&&byId(pair[1])?.gender==='male'?[pair[1],pair[0]]:pair.slice();
 }
 // OVERVIEW_V4_FAMILY_CONSTRAINTS: build family-oriented layer order without
 // inventing new relationships. Every spouse couple is one visual group and
 // its birth families are distinct blocks, separated left/right in that order.
 if(treeMode==='overview'){
  const siblings=knownVisibleSibling;
  const cx=g=>g.x+ownWidth(g)/2;
  const parentAnchor=g=>{
   const xs=[];
   for(const member of g.members){
    const ps=gdata.parent.filter(([,child])=>child===member).map(([parent])=>parent);
    const parents=ps.map(id=>groups.get(idGroup.get(id))).filter(pg=>pg&&pg.level<g.level&&Number.isFinite(pg.x));
    if(!parents.length)continue;
    const pm=ps.map(id=>{
     const pg=groups.get(idGroup.get(id));
     if(!pg||pg.level>=g.level)return null;
     return pg.x+pg.members.indexOf(id)*(W+GAP)+W/2;
    }).filter(x=>x!==null);
    if(pm.length)xs.push(pm.reduce((s,x)=>s+x,0)/pm.length);
   }
   return xs.length?xs.reduce((s,x)=>s+x,0)/xs.length:null;
  };
  const descendantAnchor=g=>{
   const xs=[];
   for(const id of g.members)for(const [parent,child] of gdata.parent){
    if(parent!==id)continue;
    const cg=groups.get(idGroup.get(child));
    if(cg&&cg.level>g.level&&Number.isFinite(cg.x))xs.push(cg.x+cg.members.indexOf(child)*(W+GAP)+W/2);
   }
   return xs.length?xs.reduce((s,x)=>s+x,0)/xs.length:null;
  };
  // Parent-origin orientation constraints: if a couple is [left,right], the
  // left spouse's ancestral family must precede the right spouse's ancestors.
  // These constraints matter even if the original Person records were shuffled.
  const beforeByLevel=new Map();
  for(const level of rows.keys())beforeByLevel.set(level,[]);
  for(const childGroup of groups.values()){
   if(childGroup.members.length!==2)continue;
   const [left,right]=childGroup.members;
   const leftParents=[...new Set(gdata.parent.filter(([,c])=>c===left).map(([p])=>groups.get(idGroup.get(p))).filter(Boolean))];
   const rightParents=[...new Set(gdata.parent.filter(([,c])=>c===right).map(([p])=>groups.get(idGroup.get(p))).filter(Boolean))];
   for(const a of leftParents)for(const b of rightParents)
    if(a.id!==b.id&&a.level===b.level)beforeByLevel.get(a.level).push([a.id,b.id]);
  }
  // Sibling of first spouse expands outward LEFT, sibling of second spouse
  // expands outward RIGHT. Never impose gender ordering on siblings.
  for(const g of groups.values()){
   if(g.members.length!==2)continue;
   const [left,right]=g.members;
   for(const h of groups.values()){
    if(h.id===g.id||h.level!==g.level)continue;
    if(h.members.some(id=>siblings(id,left))&&!h.members.some(id=>siblings(id,right)))beforeByLevel.get(g.level).push([h.id,g.id]);
    if(h.members.some(id=>siblings(id,right))&&!h.members.some(id=>siblings(id,left)))beforeByLevel.get(g.level).push([g.id,h.id]);
   }
  }
  for(let level=0;level<=maxDepth;level++){
   const row=rows.get(level)||[];if(!row.length)continue;
   const prior=new Map(row.map((g,i)=>[g.id,i]));
   const ideals=new Map(row.map(g=>[g.id,level>0?parentAnchor(g)??cx(g):descendantAnchor(g)??cx(g)]));
   const outgoing=new Map(row.map(g=>[g.id,new Set()]));
   const indeg=new Map(row.map(g=>[g.id,0]));
   for(const [a,b] of beforeByLevel.get(level)||[]){
    if(a===b||!outgoing.has(a)||!outgoing.has(b)||outgoing.get(a).has(b))continue;
    outgoing.get(a).add(b);indeg.set(b,indeg.get(b)+1);
   }
   // Stable topological ordering; any contradictions fall back to visual order.
   const ready=row.filter(g=>!indeg.get(g.id));const ordered=[];
   while(ready.length){
    ready.sort((a,b)=>ideals.get(a.id)-ideals.get(b.id)||prior.get(a.id)-prior.get(b.id));
    const g=ready.shift();ordered.push(g);
    for(const id of outgoing.get(g.id)){
     indeg.set(id,indeg.get(id)-1);
     if(!indeg.get(id))ready.push(groups.get(id));
    }
   }
   if(ordered.length!==row.length){
    const used=new Set(ordered.map(g=>g.id));
    ordered.push(...row.filter(g=>!used.has(g.id)).sort((a,b)=>ideals.get(a.id)-ideals.get(b.id)));
   }
   // Pack the entire row. Avoid collisions and leave visible separation
   // between unrelated households. Related siblings get a smaller gap.
   let last=-Infinity;
   for(let i=0;i<ordered.length;i++){
    const g=ordered[i],previous=ordered[i-1];
    const related=previous&&previous.members.some(a=>g.members.some(b=>siblings(a,b)));
    const gap=related?44:92;
    const proposed=ideals.get(g.id)-ownWidth(g)/2;
    // Limit the unassigned empty gap. Family lanes remain distinct, but distant
    // ideal coordinates never force an isolated card thousands of pixels away.
    const compacted=Number.isFinite(last)?Math.min(proposed,last+gap+34):proposed;
    g.x=Math.max(0,compacted,Number.isFinite(last)?last+gap:0);
    last=g.x+ownWidth(g);
   }
   // Correct a whole row toward its parents without disturbing order.
   if(level>0){
    const anchors=ordered.filter(g=>parentAnchor(g)!==null);
    if(anchors.length){
     const shift=anchors.reduce((s,g)=>s+parentAnchor(g)-cx(g),0)/anchors.length;
     for(const g of ordered)g.x+=shift;
    }
   }
   row.splice(0,row.length,...ordered);
  }
 }

 // FAMILY_BALANCE_V3: organize complete birth-family blocks around their
 // couple, then align each family unit with the midpoint of its descendants.
 // A sibling of the left spouse goes left; a sibling of the right spouse goes right.
 // Couple and siblings move as atomic groups, never individual cards.
 const siblingRelated=knownVisibleSibling;
 const unitCx=g=>g.x+ownWidth(g)/2;
 const weightedChildrenCx=g=>{
  const childIds=new Set();
  for(const person of g.members)for(const [parent,child] of gdata.parent)if(parent===person)childIds.add(child);
  const xs=[...childIds].map(id=>{
   const cg=groups.get(idGroup.get(id));return cg&&cg.level>g.level?cg.x+cg.members.indexOf(id)*(W+GAP)+W/2:null;
  }).filter(x=>x!==null);
  return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
 };
 const parentCx=g=>{
  const xs=[];
  for(const person of g.members)for(const [parent,child] of gdata.parent){
   if(child!==person)continue;
   const pg=groups.get(idGroup.get(parent));
   if(pg&&pg.level<g.level)xs.push(pg.x+pg.members.indexOf(parent)*(W+GAP)+W/2);
  }
  return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
 };
 function balanceFamilyRow(level,allowReorder,parentMix=0){
  const row=rows.get(level)||[];if(!row.length)return;
  const used=new Set(),blocks=[];
  const coupleCandidates=row.filter(g=>g.members.length===2&&weightedChildrenCx(g)!==null).sort((a,b)=>{
   const score=g=>g.members.reduce((sum,id)=>sum+gdata.parent.filter(([pa])=>pa===id).length,0)*2+
    row.filter(h=>h!==g&&h.members.some(mid=>g.members.some(id=>siblingRelated(id,mid)))).length;
   return score(b)-score(a)||a.i-b.i;
  });
  if(allowReorder)for(const anchor of coupleCandidates){
   if(used.has(anchor.id))continue;
   const left=[],right=[];
   for(const g of row){
    if(used.has(g.id)||g===anchor)continue;
    const a=g.members.some(mid=>siblingRelated(mid,anchor.members[0]));
    const b=g.members.some(mid=>siblingRelated(mid,anchor.members[1]));
    if(a&&!b)left.push(g);
    else if(b&&!a)right.push(g);
   }
   if(!left.length&&!right.length)continue;
   const rank=g=>weightedChildrenCx(g)??unitCx(g);
   left.sort((a,b)=>rank(a)-rank(b));right.sort((a,b)=>rank(a)-rank(b));
   const members=[...left,anchor,...right];
   members.forEach(g=>used.add(g.id));
   blocks.push(members);
  }
  for(const g of row)if(!used.has(g.id)){blocks.push([g]);used.add(g.id)}
  const gapInside=36,gapBetween=76;
  const widthOf=block=>block.reduce((n,g)=>n+ownWidth(g),0)+(block.length-1)*gapInside;
  const blockAnchor=block=>{
   const main=block.find(g=>g.members.length===2&&weightedChildrenCx(g)!==null)||block.find(g=>weightedChildrenCx(g)!==null)||block[0];
   const children=weightedChildrenCx(main);
   const parents=parentCx(main);
   // On the bottom-up pass direct children dominate; on the top-down pass
   // known parents can guide groups which do not yet have descendants.
   const target=children!==null&&parents!==null?children*(1-parentMix)+parents*parentMix:children??parents??unitCx(main);
   let before=0;for(const g of block){if(g===main)break;before+=ownWidth(g)+gapInside}
   return target-(before+ownWidth(main)/2);
  };
  if(allowReorder)blocks.sort((a,b)=>blockAnchor(a)-blockAnchor(b)||a[0].i-b[0].i);
  else blocks.sort((a,b)=>row.indexOf(a[0])-row.indexOf(b[0]));
  // Shift each cluster towards its own descendants while keeping the ordered
  // clusters collision-free. Isotonic regression avoids arbitrary large gaps.
  const xs=[],ws=[],off=[];let total=0;
  for(let i=0;i<blocks.length;i++){
   if(i)total+=widthOf(blocks[i-1])+gapBetween;
   off.push(total);
   const ideal=blockAnchor(blocks[i]);
   const anchor=blocks[i].find(g=>weightedChildrenCx(g)!==null);
   xs.push(ideal-total);ws.push(anchor?4:1);
  }
  const pools=[];
  for(let i=0;i<blocks.length;i++){
   pools.push({start:i,end:i,w:ws[i],v:xs[i]});
   while(pools.length>1){
    const end=pools.at(-1),prior=pools.at(-2);if(prior.v<=end.v)break;
    pools.splice(-2,2,{start:prior.start,end:end.end,w:prior.w+end.w,v:(prior.v*prior.w+end.v*end.w)/(prior.w+end.w)});
   }
  }
  const target=new Array(blocks.length);
  for(const pool of pools)for(let i=pool.start;i<=pool.end;i++)target[i]=pool.v+off[i];
  row.length=0;
  for(let i=0;i<blocks.length;i++){
   let x=target[i];
   for(const g of blocks[i]){g.x=x;x+=ownWidth(g)+gapInside;row.push(g)}
  }
 }
 // Descendant-first placement brings each ancestor closer to its own branch;
 // the second sweep aligns descendant blocks where a parent already exists.
 for(let lev=maxDepth;lev>=0;lev--)balanceFamilyRow(lev,true,0);
 for(let lev=1;lev<=maxDepth;lev++)balanceFamilyRow(lev,true,.85);
 for(let lev=maxDepth-1;lev>=0;lev--)balanceFamilyRow(lev,false,.4);
 // SIBLING_BIRTH_ORDER: enforce comparable sibling facts on the FINAL row order.
 // This is a stable topological reorder of atomic groups (a couple never splits).
 // Isotonic packing moves groups as little as possible and prevents overlap.
 // No constraints are introduced when birth information is incomplete.
 for(const row of rows.values()){
  if(row.length<2)continue;
  const initial=row.slice().sort((a,b)=>a.x-b.x),index=new Map(initial.map((g,i)=>[g.id,i]));
  const edges=new Map(initial.map(g=>[g.id,new Set()])),indeg=new Map(initial.map(g=>[g.id,0]));
  for(let i=0;i<initial.length;i++)for(let j=i+1;j<initial.length;j++){
   const a=initial[i],b=initial[j];let direction=0;
   for(const pa of a.members)for(const pb of b.members){
    if(!knownVisibleSibling(pa,pb))continue;
    const comparison=siblingBirthCompare(pa,pb);
    if(comparison&&(!direction||direction===comparison))direction=comparison;
    else if(comparison&&direction!==comparison)direction=0; // inconsistent mixed-family claims
   }
   if(!direction)continue;
   const from=direction<0?a.id:b.id,to=direction<0?b.id:a.id;
   if(!edges.get(from).has(to)){edges.get(from).add(to);indeg.set(to,indeg.get(to)+1)}
  }
  if(![...edges.values()].some(v=>v.size))continue;
  const ready=initial.filter(g=>!indeg.get(g.id)),ordered=[];
  while(ready.length){
   ready.sort((a,b)=>index.get(a.id)-index.get(b.id));
   const g=ready.shift();ordered.push(g);
   for(const n of edges.get(g.id)){
    indeg.set(n,indeg.get(n)-1);
    if(indeg.get(n)===0)ready.push(initial[index.get(n)]);
   }
  }
  if(ordered.length!==initial.length)continue; // conflicting graph: keep existing order
  if(ordered.every((g,i)=>g===initial[i]))continue;
  const offsets=[],observed=[];let offset=0;
  for(let i=0;i<ordered.length;i++){
   const g=ordered[i],prev=ordered[i-1];
   if(i)offset+=ownWidth(prev)+(prev.members.some(a=>g.members.some(b=>knownVisibleSibling(a,b)))?40:76);
   offsets.push(offset);observed.push(g.x-offset);
  }
  const pools=[];
  for(let i=0;i<ordered.length;i++){
   pools.push({start:i,end:i,weight:1,value:observed[i]});
   while(pools.length>1){
    const b=pools.at(-1),a=pools.at(-2);if(a.value<=b.value)break;
    pools.splice(-2,2,{start:a.start,end:b.end,weight:a.weight+b.weight,value:(a.value*a.weight+b.value*b.weight)/(a.weight+b.weight)});
   }
  }
  for(const pool of pools)for(let i=pool.start;i<=pool.end;i++)ordered[i].x=pool.value+offsets[i];
  row.splice(0,row.length,...ordered);
 }
 // BIDIRECTIONAL_FAMILY_CENTERING_V2: locally optimize parent/child midpoints
 // across adjacent generations while preserving the established horizontal
 // order, sibling birth constraints, and atomic partner groups.
 function relaxFamilyCenters(){
  const parentSets=new Map();
  for(const [parent,child] of gdata.parent){
   if(!idGroup.has(parent)||!idGroup.has(child))continue;
   if(!parentSets.has(child))parentSets.set(child,[]);
   parentSets.get(child).push(parent);
  }
  const units=new Map();
  for(const [child,parents] of parentSets){
   const childGroup=groups.get(idGroup.get(child));if(!childGroup)continue;
   const ps=[...new Set(parents)].sort();
   if(!ps.every(id=>groups.get(idGroup.get(id))?.level<childGroup.level))continue;
   const key=ps.join('|')+'@'+childGroup.level;
   if(!units.has(key))units.set(key,{parents:ps,children:[],level:childGroup.level});
   units.get(key).children.push(child);
  }
  const families=[...units.values()].filter(unit=>unit.parents.length&&unit.children.length);
  if(!families.length)return;
  const orderedRows=[...rows.values()].map(row=>row.slice().sort((a,b)=>a.x-b.x));
  const initialX=new Map([...groups.values()].map(g=>[g.id,g.x]));
  const siblingGap=(a,b)=>a.members.some(id=>b.members.some(other=>knownVisibleSibling(id,other)))?36:64;
  const penalty=0.015;
  const state=[...groups.values()];
  for(let iter=0;iter<150;iter++){
   const gradients=new Map(state.map(g=>[g.id,2*penalty*(g.x-initialX.get(g.id))]));
   for(const family of families){
    const parentMembers=family.parents.map(id=>({group:groups.get(idGroup.get(id)),id}));
    const childMembers=family.children.map(id=>({group:groups.get(idGroup.get(id)),id}));
    const xOf=m=>m.group.x+m.group.members.indexOf(m.id)*(W+GAP)+W/2;
    const parentsX=parentMembers.map(xOf);
    const parentMid=parentsX.reduce((s,x)=>s+x,0)/parentsX.length;
    childMembers.sort((a,b)=>xOf(a)-xOf(b));
    const kids=childMembers.length;
    const childMid=(xOf(childMembers[0])+xOf(childMembers.at(-1)))/2;
    const delta=parentMid-childMid;
    for(const p of parentMembers)gradients.set(p.group.id,gradients.get(p.group.id)+2*delta/parentMembers.length);
    for(const c of [childMembers[0],childMembers.at(-1)])gradients.set(c.group.id,gradients.get(c.group.id)-delta);
   }
   // Conservative gradient step; clamping prevents oscillation when multiple
   // family units push a shared group in different directions.
   for(const g of state){const grad=gradients.get(g.id);g.x-=Math.max(-32,Math.min(32,.105*grad));}
   // Project each row onto nonoverlap constraints (isotonic regression).
   for(const row of orderedRows){
    if(row.length<2)continue;
    let gapOff=0;const pool=[],off=[];
    for(let i=0;i<row.length;i++){
     if(i)gapOff+=ownWidth(row[i-1])+siblingGap(row[i-1],row[i]);
     off.push(gapOff);
     const value=row[i].x-gapOff;
     pool.push({from:i,to:i,w:1,v:value});
     while(pool.length>1){
      const b=pool.at(-1),a=pool.at(-2);if(a.v<=b.v)break;
      pool.splice(-2,2,{from:a.from,to:b.to,w:a.w+b.w,v:(a.v*a.w+b.v*b.w)/(a.w+b.w)});
     }
    }
    for(const p of pool)for(let i=p.from;i<=p.to;i++)row[i].x=p.v+off[i];
   }
  }
 }
 relaxFamilyCenters();
 // Normalize all generations into the same positive coordinate system.
 const allGroups=[...groups.values()];
 const minX=allGroups.length?Math.min(...allGroups.map(g=>g.x)):0;
 const shift=PADX-minX;
 positions=new Map();
 for(const g of allGroups){
  const x=g.x+shift;
  g.members.forEach((id,i)=>positions.set(id,{x:x+i*(W+GAP),y:TOPY+g.level*ROW,level:g.level}));
 }
 const farRight=allGroups.length?Math.max(...allGroups.map(g=>g.x+shift+ownWidth(g))):PADX+W;
 size={w:Math.max(620,farRight+110),h:TOPY+maxDepth*ROW+H+60};
 return {groups};
}
  makeLayout();
  return {
    width:size.w,
    height:size.h,
    maxDepth,
    positions:[...positions].map(([id,p])=>({ id, ...p })),
    warnings
  };
}
