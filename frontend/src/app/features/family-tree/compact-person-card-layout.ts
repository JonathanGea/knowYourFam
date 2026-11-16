/** Compact Person identity cards, projected from world coordinates onto
 * a fixed-size screen overlay when zoom < 42%. */
export interface CompactNode {
  readonly person:{readonly id:string;readonly name:string;readonly photo?:string|null;readonly claimed?:boolean};
  readonly x:number;readonly y:number;readonly tier:number;
}
export interface CompactCamera {
  readonly panX:number;readonly panY:number;readonly zoom:number;
  readonly viewportWidth:number;readonly viewportHeight:number;
}
export interface CompactCard {
  readonly id:string;readonly name:string;readonly photo:string|null;
  readonly claimed:boolean;readonly focus:boolean;readonly selected:boolean;
  readonly x:number;readonly y:number;
}
export const COMPACT_CARD_WIDTH=144;
export const COMPACT_CARD_HEIGHT=52;
const GUTTER=7;
export function createCompactPersonCards(
  nodes:readonly CompactNode[],camera:CompactCamera,
  focusId:string,selectedId:string|null
):CompactCard[]{
  const {panX,panY,zoom,viewportWidth:vw,viewportHeight:vh}=camera;
  if(zoom>=.42||zoom<=0||vw<160||vh<68)return [];
  const candidates=nodes.map(node=>{
    const person=node.person;
    const x=Math.round(panX+(node.x+185/2)*zoom);
    const y=Math.round(panY+(node.y+113/2)*zoom);
    const focus=person.id===focusId,selected=person.id===selectedId;
    return {id:person.id,name:person.name||'Tanpa nama',
      photo:person.photo||null,claimed:!!person.claimed,focus,selected,x,y,
      priority:focus?0:selected?1:person.claimed?2:3,
      distance:Math.hypot(x-vw/2,y-vh/2)};
  }).filter(c=>c.x-COMPACT_CARD_WIDTH/2>=GUTTER&&
    c.x+COMPACT_CARD_WIDTH/2<=vw-GUTTER&&
    c.y-COMPACT_CARD_HEIGHT/2>=GUTTER&&
    c.y+COMPACT_CARD_HEIGHT/2<=vh-GUTTER);
  candidates.sort((a,b)=>a.priority-b.priority||a.distance-b.distance||
    a.y-b.y||a.x-b.x||a.id.localeCompare(b.id));
  const cards:CompactCard[]=[];
  // At 204 people and 15%, a readable card for every node is geometrically
  // impossible. Prioritize the focal family and avoid overlap.
  for(const card of candidates){
    if(cards.some(prev=>Math.abs(prev.x-card.x)<COMPACT_CARD_WIDTH+12&&
      Math.abs(prev.y-card.y)<COMPACT_CARD_HEIGHT+8))continue;
    cards.push({id:card.id,name:card.name,photo:card.photo,claimed:card.claimed,
      focus:card.focus,selected:card.selected,x:card.x,y:card.y});
  }
  return cards.sort((a,b)=>a.y-b.y||a.x-b.x||a.id.localeCompare(b.id));
}
