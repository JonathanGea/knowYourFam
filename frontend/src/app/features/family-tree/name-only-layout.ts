/** Screen-space names for semantic zoom. A transformed canvas makes regular
 * card text unreadable at 15% and below; these names remain 12px on screen.
 * Labels that collide are omitted, but all graph nodes remain intact. */
export interface NameOnlyPerson {
  readonly id:string;
  readonly name:string;
  readonly claimed?:boolean;
}
export interface NameOnlyNode {
  readonly person:NameOnlyPerson;
  readonly x:number;
  readonly y:number;
  readonly tier:number;
}
export interface NameOnlyCamera {
  readonly panX:number;
  readonly panY:number;
  readonly zoom:number;
  readonly viewportWidth:number;
  readonly viewportHeight:number;
}
export interface NameOnlyLabel {
  readonly id:string;
  readonly name:string;
  readonly x:number;
  readonly y:number;
  readonly width:number;
  readonly focus:boolean;
  readonly selected:boolean;
}
const CARD_WIDTH=185;
const CARD_HEIGHT=113;
const CELL_X=80;
const CELL_Y=26;
const ZOOM_THRESHOLD=.42;
function estimatedLabelWidth(name:string):number{
  let px=14;
  for(const ch of name){
    px+=ch===' '?3.4:/[MW@%]/.test(ch)?9:/[ilI.,']/u.test(ch)?3.3:6.4;
  }
  return Math.max(44,Math.min(146,Math.ceil(px)));
}
function occupiedCells(left:number,right:number,top:number,bottom:number):string[]{
  const cells:string[]=[];
  for(let col=Math.floor(left/CELL_X);col<=Math.floor(right/CELL_X);col++){
    for(let row=Math.floor(top/CELL_Y);row<=Math.floor(bottom/CELL_Y);row++){
      cells.push(col+':'+row);
    }
  }
  return cells;
}
/** Prioritize focus/selection, then distribute names across free screen-space.
 * Other names return as the user zooms in or navigates the graph. */
export function createNameOnlyLabels(
  nodes:readonly NameOnlyNode[],
  camera:NameOnlyCamera,
  focusPersonId:string,
  selectedPersonId:string|null
):NameOnlyLabel[]{
  const {panX,panY,zoom,viewportWidth,viewportHeight}=camera;
  if(zoom>=ZOOM_THRESHOLD||zoom<=0||viewportWidth<50||viewportHeight<50)return [];
  const candidates:Array<NameOnlyLabel&{priority:number;distance:number}>=[];
  for(const node of nodes){
    const x=panX+(node.x+CARD_WIDTH/2)*zoom;
    const y=panY+(node.y+CARD_HEIGHT/2)*zoom;
    const name=node.person.name.trim()||'Tanpa nama';
    const width=estimatedLabelWidth(name);
    if(x+width/2<8||x-width/2>viewportWidth-8||y<12||y>viewportHeight-12)continue;
    const focus=node.person.id===focusPersonId;
    const selected=node.person.id===selectedPersonId;
    const priority=focus?0:selected?1:node.person.claimed?2:3;
    const distance=Math.hypot(x-viewportWidth/2,(y-viewportHeight/2)*1.25);
    candidates.push({id:node.person.id,name,x:Math.round(x),y:Math.round(y),
      width,focus,selected,priority,distance});
  }
  candidates.sort((a,b)=>a.priority-b.priority||a.distance-b.distance||a.y-b.y||a.x-b.x||a.id.localeCompare(b.id));
  const cells=new Map<string,number[]>();
  const boxes:Array<{left:number;right:number;top:number;bottom:number}>=[];
  const accepted:NameOnlyLabel[]=[];
  for(const candidate of candidates){
    const box={left:candidate.x-candidate.width/2-6,right:candidate.x+candidate.width/2+6,
      top:candidate.y-12,bottom:candidate.y+12};
    const keys=occupiedCells(box.left,box.right,box.top,box.bottom);
    const indexes=new Set(keys.flatMap(key=>cells.get(key)??[]));
    let collision=false;
    for(const index of indexes){
      const occupied=boxes[index];
      if(box.left<occupied.right&&box.right>occupied.left&&box.top<occupied.bottom&&box.bottom>occupied.top){
        collision=true;break;
      }
    }
    if(collision)continue;
    const index=boxes.length;
    boxes.push(box);
    for(const key of keys){
      if(!cells.has(key))cells.set(key,[]);
      cells.get(key)!.push(index);
    }
    accepted.push({id:candidate.id,name:candidate.name,x:candidate.x,y:candidate.y,
      width:candidate.width,focus:candidate.focus,selected:candidate.selected});
  }
  return accepted.sort((a,b)=>a.y-b.y||a.x-b.x||a.id.localeCompare(b.id));
}
