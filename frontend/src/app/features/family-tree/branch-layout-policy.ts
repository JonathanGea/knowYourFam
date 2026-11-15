/** Geometry-first, device-independent conservative branch policy. */
export interface MeasuredTreeNode {
  readonly x: number;
  readonly y: number;
  readonly tier: number;
}

/** Actual card collisions/crowding, not width relative to the viewport.
 * A wide family tree is allowed to scroll without being collapsed.
 */
export function countNodeCrowding(
  nodes: readonly MeasuredTreeNode[], cardWidth=185, cardHeight=113, gap=9
): number {
  let collisions=0;
  const rows=new Map<number,MeasuredTreeNode[]>();
  for(const node of nodes) {
    if(!rows.has(node.tier)) rows.set(node.tier,[]);
    rows.get(node.tier)!.push(node);
  }
  for(const row of rows.values()) {
    row.sort((a,b)=>a.x-b.x);
    for(let i=0;i<row.length-1;i++) {
      const current=row[i], next=row[i+1];
      if(next.x<current.x+cardWidth+gap &&
        Math.abs(next.y-current.y)<cardHeight+gap) collisions++;
    }
  }
  return collisions;
}

/** Decode relation key by token, never by substring: 'p1' must not match 'p11'. */
export function branchOwnerIds(key:string): string[] {
  const colon=key.indexOf(':');
  if(colon<0)return [];
  const tokens=key.startsWith('pair:') ? key.slice(colon+1).split('|') : [key.slice(colon+1)];
  return tokens.map(token=>{
    try{return decodeURIComponent(token)}catch{return ''}
  }).filter(Boolean);
}
