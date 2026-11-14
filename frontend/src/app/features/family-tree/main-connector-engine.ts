// @ts-nocheck
/**
 * Transitional extraction of the latest main Canvas SVG connector routing.
 * Exact source: main/index.html blob c1252c980dd584703b8d054dfb034faaabb43aa9.
 * Preserves family buses, corridor obstacle avoidance and hidden-parent
 * sibling brackets, but outputs typed SVG paths rather than unsafe HTML.
 * TODO: replace string emission with typed edge objects after parity tests.
 */
import type { Person, FamilyRelationship } from '../../domain/family-tree.model';
import type { LegacyLayoutPosition } from './main-layout-engine';

export interface CanvasPath {
  readonly id: string;
  readonly kind: 'parent' | 'partner' | 'sibling';
  readonly d: string;
  readonly unconfirmed: boolean;
}

export function createMainCanvasPaths(input: {
  allPeople: readonly Person[];
  allRelationships: readonly FamilyRelationship[];
  visiblePeople: readonly Person[];
  visibleRelationships: readonly FamilyRelationship[];
  positions: readonly LegacyLayoutPosition[];
}): readonly CanvasPath[] {
  const pairs = (kind: string, source: readonly FamilyRelationship[]) =>
    source.filter(r => r.kind === kind).map(r => [r.fromId, r.toId]);
  const data = { parent: pairs('parent',input.allRelationships),
    partner: pairs('partner',input.allRelationships),
    sibling: pairs('sibling',input.allRelationships) };
  const displayGraph = {
    people: input.visiblePeople,
    parent: pairs('parent',input.visibleRelationships),
    partner: pairs('partner',input.visibleRelationships),
    sibling: pairs('sibling',input.visibleRelationships)
  };
  const positions = new Map(input.positions.map(p=>[p.id,p]));
  const W=185,H=113,ROW=181,TOPY=76;
  const safe=(value: string)=>String(value).replace(/[&<>"']/g, c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
 let lines='';for(const [a,b] of displayGraph.partner){const x=positions.get(a),y=positions.get(b);if(!x||!y||Math.abs(x.y-y.y)>25)continue;const left=x.x<y.x?x:y,right=x.x<y.x?y:x;lines+=`<path class="edge-partner" d="M${left.x+W} ${left.y+H/2} H${right.x}"/><circle cx="${(left.x+W+right.x)/2}" cy="${left.y+H/2}" r="4.4" fill="#fff" stroke="#c88e85" stroke-width="2"/>`}
 // Family-aware connector routing: parent trunks use the free corridor below
 // their own row. If a link skips generations, pass through an open lane
 // between profile cards instead of hiding a line behind them with masking.
 const obstacleByLevel=new Map();
 for(const p of displayGraph.people){
  const pos=positions.get(p.id);if(!pos)continue;
  if(!obstacleByLevel.has(pos.level))obstacleByLevel.set(pos.level,[]);
  obstacleByLevel.get(pos.level).push({left:pos.x-7,right:pos.x+W+7});
 }
 for(const row of obstacleByLevel.values())row.sort((a,b)=>a.left-b.left);
 // ORTHOGONAL_CORRIDOR_ROUTING_V2: use ONE obstacle-free vertical column for
 // cross-generation connections, instead of zigzagging at every ancestor row.
 // All horizontal turns happen in the empty band BETWEEN generations.
 // DYNAMIC_VERTICAL_CORRIDOR_V3: find a low-bend orthogonal route through
 // all INTERMEDIATE generations. Bends occur only between rows, never through
 // a person card. Bounded lateral shifts are preferred to a giant U-shaped
 // detour outside an entire family branch.
 const levelCandidates=(level,fromX,toX)=>{
  const boxes=obstacleByLevel.get(level)||[];
  if(!boxes.length)return [fromX,toX];
  const free=x=>boxes.every(r=>x<r.left||x>r.right);
  const options=[fromX,toX,boxes[0].left-11,boxes.at(-1).right+11];
  for(let i=0;i<boxes.length;i++){
   options.push(boxes[i].left-11,boxes[i].right+11);
   if(i>0&&boxes[i].left-boxes[i-1].right>20)options.push((boxes[i-1].right+boxes[i].left)/2);
  }
  return [...new Set(options.filter(free).map(x=>Math.round(x*100)/100))];
 };
 const intermediateLanes=(parentLevel,childLevel,fromX,toX)=>{
  const levels=[];for(let l=parentLevel+1;l<childLevel;l++)levels.push(l);
  if(!levels.length)return [];
  const turnCost=85;
  let previous=[{x:fromX,cost:0,prev:null}];
  const stages=[];
  for(const level of levels){
   const candidates=levelCandidates(level,fromX,toX);
   const current=candidates.map(x=>{
    let best=null;
    for(const p of previous){
     const d=Math.abs(x-p.x),penalty=d>.5?turnCost:0;
     const cost=p.cost+d+penalty+.014*(Math.abs(x-fromX)+Math.abs(x-toX));
     if(!best||cost<best.cost)best={x,cost,prev:p};
    }
    return best;
   });
   previous=current;stages.push(current);
  }
  let best=null;
  for(const p of previous){const d=Math.abs(toX-p.x),cost=p.cost+d+(d>.5?turnCost:0);
   if(!best||cost<best.cost)best={cost,prev:p};
  }
  const lanes=[];let node=best?.prev;
  while(node&&node.prev){lanes.unshift(node.x);node=node.prev;}
  return lanes;
 };
 const familyTrunk=(fromX,fromY,hubX,busY,parentLevel,childLevel,parentBottom)=>{
  const exitY=Math.min(busY-7,parentBottom+12);
  let path=`M${fromX} ${fromY} V${exitY}`;
  const lanes=intermediateLanes(parentLevel,childLevel,fromX,hubX);
  let lastX=fromX;
  for(let i=0;i<lanes.length;i++){
   const lane=lanes[i],level=parentLevel+1+i;
   const entryY=TOPY+level*ROW-13,clearY=TOPY+level*ROW+H+10;
   path+=` V${entryY}`;
   if(Math.abs(lane-lastX)>.5)path+=` H${lane}`;
   path+=` V${clearY}`;
   lastX=lane;
  }
  const entryY=busY-7;
  path+=` V${entryY}`;
  if(Math.abs(lastX-hubX)>.5)path+=` H${hubX}`;
  return path+` V${busY}`;
 };
 // An entire parent-set remains the same family unit. However a single wide
 // sibling bus must not pass THROUGH unrelated families lying between siblings.
 // Split only the VISUAL bus into islands separated by intervening unrelated
 // cards. Each island retains its OWN trunk to the same actual parents.
 const childParentSets=new Map();
 for(const [parent,child] of displayGraph.parent){
  if(!childParentSets.has(child))childParentSets.set(child,new Set());
  childParentSets.get(child).add(parent);
 }
 const childUnits=new Map();
 for(const [child,parents] of childParentSets){
  const parentIds=[...parents].sort(),pos=positions.get(child);
  if(!pos)continue;
  const key=parentIds.join('|')+'@'+pos.level;
  if(!childUnits.has(key))childUnits.set(key,{parentIds,childIds:[],key});
  childUnits.get(key).childIds.push(child);
 }
 const nodesAtLevel=new Map();
 for(const person of displayGraph.people){
  const position=positions.get(person.id);if(!position)continue;
  if(!nodesAtLevel.has(position.level))nodesAtLevel.set(position.level,[]);
  nodesAtLevel.get(position.level).push({id:person.id,...position});
 }
 const visualUnits=[];
 for(const unit of childUnits.values()){
  const children=unit.childIds.slice().sort((a,b)=>positions.get(a).x-positions.get(b).x);
  const allowed=new Set(children);
  // Spouses of siblings occupy the same family group and may sit between
  // their own sibling and the next sibling without splitting the bus.
  for(const [a,b] of displayGraph.partner){
   if(allowed.has(a))allowed.add(b);
   else if(allowed.has(b))allowed.add(a);
  }
  let island=[];
  for(const child of children){
   if(island.length){
    const before=positions.get(island.at(-1)),after=positions.get(child);
    const from=Math.min(before.x+W/2,after.x+W/2),to=Math.max(before.x+W/2,after.x+W/2);
    const unrelated=(nodesAtLevel.get(after.level)||[]).some(p=>
     !allowed.has(p.id)&&p.x<to-7&&p.x+W>from+7);
    if(unrelated){visualUnits.push({...unit,childIds:island});island=[];}
   }
   island.push(child);
  }
  if(island.length)visualUnits.push({...unit,childIds:island});
 }
 visualUnits.sort((a,b)=>{
  const aa=positions.get(a.childIds[0]),bb=positions.get(b.childIds[0]);
  return aa.level-bb.level||aa.x-bb.x;
 });
 // Allocate separate bus tracks for overlapping family units so different
 // sets of parents do not appear to share one continuous horizontal bar.
 const occupiedTracks=new Map();
 for(const unit of visualUnits){
  const children=unit.childIds.map(id=>positions.get(id));
  const xs=children.map(p=>p.x+W/2),left=Math.min(...xs),right=Math.max(...xs);
  const level=children[0].level;
  if(!occupiedTracks.has(level))occupiedTracks.set(level,[]);
  const tracked=occupiedTracks.get(level);
  const overlap=(track)=>tracked.filter(other=>other.track===track&&!(right+9<other.left||left-9>other.right)).length;
  // The inter-generation band is 68px high. Tracks 0..4 keep bus lines at
  // 26..54px above cards and at least 14px below the preceding card row.
  const track=[0,1,2,3,4].sort((a,b)=>overlap(a)-overlap(b)||a-b)[0];
  tracked.push({track,left,right});
  const parents=unit.parentIds.map(id=>positions.get(id)).filter(Boolean);
  if(!parents.length)continue;
  const sameCouple=parents.length===2&&displayGraph.partner.some(([a,b])=>unit.parentIds.includes(a)&&unit.parentIds.includes(b));
  const startX=parents.reduce((sum,p)=>sum+p.x+W/2,0)/parents.length;
  const parentBottom=Math.max(...parents.map(p=>p.y+H));
  const parentY=sameCouple?parents[0].y+H/2:parentBottom;
  const busY=Math.min(...children.map(c=>c.y))-26-track*7;
  const hubX=Math.min(right,Math.max(left,startX));
  const unitAttr=encodeURIComponent(unit.parentIds.join('|'));
  const trunk=(x,y,p)=>(familyTrunk(x,y,hubX,busY,p.level,level,p.y+H));
  if(sameCouple){
   lines+=`<path class="edge-parent" data-family-unit="${unitAttr}" data-family-island="${unit.childIds.map(safe).join('|')}" d="${familyTrunk(startX,parentY,hubX,busY,parents[0].level,level,parentBottom)}"/>`;
  }else for(const parent of parents){
   const x=parent.x+W/2;
   lines+=`<path class="edge-parent" data-family-unit="${unitAttr}" d="${trunk(x,parent.y+H,parent)}"/>`;
  }
  if(right>left+.1)lines+=`<path class="edge-parent edge-child-bus" data-family-unit="${unitAttr}" data-bus-track="${track}" d="M${left} ${busY} H${right}"/>`;
  for(const c of children){const x=c.x+W/2;
   lines+=`<path class="edge-parent" data-family-unit="${unitAttr}" d="M${x} ${busY} V${c.y-5}"/><circle cx="${x}" cy="${c.y-5}" r="4" fill="#76a887"/>`;
  }
 }
 // Sibling connectors must be derived from the STORED family relationships, not
 // only from parent links present in the Focus viewport. When parents are hidden,
 // their visible children still need a dashed sibling bracket on the SAME row.
 // The shared-parent bracket does not invent a new relationship or reveal the
 // hidden parents, and is omitted if the visible parent-child bus already shows it.
 const visibleIds=new Set(displayGraph.people.map(p=>p.id));
 const hiddenParentChildren=new Map();
 for(const [parent,child] of data.parent){
  if(visibleIds.has(parent)||!visibleIds.has(child))continue;
  const pos=positions.get(child);if(!pos)continue;
  const key=parent+'@'+pos.level;
  if(!hiddenParentChildren.has(key))hiddenParentChildren.set(key,[]);
  hiddenParentChildren.get(key).push(child);
 }
 const siblingPairKey=(a,b)=>[a,b].sort().join('|');
 const siblingDrawnPairs=new Set();
 const siblingGroupsDrawn=new Set();
 let siblingLane=0;
 const addSiblingBracket=(members,source)=>{
  const unique=[...new Set(members)].filter(id=>positions.has(id)).sort((a,b)=>positions.get(a).x-positions.get(b).x);
  if(unique.length<2)return;
  const level=positions.get(unique[0]).level;
  if(unique.some(id=>positions.get(id).level!==level))return;
  const groupKey=unique.slice().sort().join('|');
  if(siblingGroupsDrawn.has(groupKey))return;
  // A visible common parent already has a green parent-child bus; don't duplicate it.
  if(data.parent.some(([parent,child])=>visibleIds.has(parent)&&unique.includes(child)&&unique.every(id=>data.parent.some(([p,c])=>p===parent&&c===id))))return;
  siblingGroupsDrawn.add(groupKey);
  const top=positions.get(unique[0]).y;
  const bandY=top-44-(siblingLane%2)*14;
  siblingLane++;
  const centers=unique.map(id=>positions.get(id).x+W*.24);
  lines+=`<path class="edge-sibling edge-sibling-bus" data-sibling-source="${safe(source)}" data-sibling-members="${safe(groupKey)}" d="M${centers[0]} ${bandY} H${centers.at(-1)}"/>`;
  for(const x of centers)lines+=`<path class="edge-sibling" d="M${x} ${top-1} V${bandY}"/>`;
  for(let i=0;i<unique.length;i++)for(let j=i+1;j<unique.length;j++)siblingDrawnPairs.add(siblingPairKey(unique[i],unique[j]));
 };
 // One bus for each group of visible siblings whose parent is hidden. Siblings
 // with both hidden parents share the SAME bus; partners are not endpoints.
 for(const [source,children] of hiddenParentChildren)addSiblingBracket(children,'hidden-parent');
 // Explicit sibling relations with unknown/different recorded parents still
 // draw their dashed bracket, including in Overview. Do not double-draw pairs
 // already represented by a shared hidden parent above.
 for(const [a,b] of displayGraph.sibling){
  const key=siblingPairKey(a,b);if(siblingDrawnPairs.has(key))continue;
  const pa=positions.get(a),pb=positions.get(b);if(!pa||!pb)continue;
  const knownParents=new Set(data.parent.filter(([,c])=>c===a).map(([p])=>p));
  if(data.parent.some(([p,c])=>c===b&&knownParents.has(p)&&visibleIds.has(p)))continue;
  const left=pa.x<pb.x?pa:pb,right=pa.x<pb.x?pb:pa;
  const fromX=left.x+W*.24,toX=right.x+W*.24;
  const bandY=Math.min(left.y,right.y)-44-(siblingLane%2)*14;
  siblingLane++;
  lines+=`<path class="edge-sibling" data-sibling-source="explicit" d="M${fromX} ${left.y-1} V${bandY} H${toX} V${right.y-1}"/>`;
  siblingDrawnPairs.add(key);
 }

  // Path data is produced by the internal geometry engine only; attributes
  // and embedded HTML from the original prototype are never rendered as HTML.
  const paths: CanvasPath[] = [];
  const nodes = [...lines.matchAll(/<path\\b([^>]+)>/g)];
  for (let i=0;i<nodes.length;i++) {
    const attributes=nodes[i][1];
    const d=/\\bd="([^"]*)"/.exec(attributes)?.[1];
    const className=/\\bclass="([^"]*)"/.exec(attributes)?.[1] || '';
    if (!d || !/^[MmLlHhVvCcSsQqTtAaZz0-9., +\\-Ee]+$/.test(d)) continue;
    const kind: 'parent'|'partner'|'sibling' =
      className.includes('edge-partner')?'partner':className.includes('edge-sibling')?'sibling':'parent';
    const tag=/data-family-unit="([^"]+)"/.exec(attributes)?.[1];
    const parentIds=tag?decodeURIComponent(tag).split('|'):[];
    const provisional=kind==='parent' && parentIds.length>0
      ? input.visibleRelationships.some(r=>r.kind==='parent' && parentIds.includes(r.fromId) && r.status==='unconfirmed')
      : false;
    paths.push({id:'canvas-path-'+i,kind,d,unconfirmed:provisional});
  }
  return paths;
}
