/** One readability policy, applied to Fit, mouse wheel, pinch and camera restore.
 * A whole-tree map may use much smaller zoom without hiding graph nodes.
 */
export type FamilyTreeViewMode='focus'|'overview';
export const READABLE_FOCUS_MIN_ZOOM=0.78;
const MAX_ZOOM=2.5;
const MIN_MAP_ZOOM=0.004;

export function clampReadableFamilyZoom(value:number,mode:FamilyTreeViewMode):number{
  const minimum=mode==='focus'?READABLE_FOCUS_MIN_ZOOM:MIN_MAP_ZOOM;
  if(!Number.isFinite(value))return mode==='focus'?1:minimum;
  return Math.min(MAX_ZOOM,Math.max(minimum,value));
}

export function readableFitCenter(
  naturalFit:number,mode:FamilyTreeViewMode,
  focused:{x:number;y:number}|null,viewport:{width:number;height:number},
  worldSize:{width:number;height:number}
):{zoom:number;panX:number;panY:number}{
  const zoom=clampReadableFamilyZoom(naturalFit,mode);
  if(mode==='focus' && naturalFit<READABLE_FOCUS_MIN_ZOOM && focused){
    return {zoom,panX:viewport.width/2-focused.x*zoom,
      panY:viewport.height/2-focused.y*zoom};
  }
  const extraY=viewport.height-worldSize.height*zoom;
  return {zoom,panX:(viewport.width-worldSize.width*zoom)/2,
    panY:extraY>80?Math.max(16,extraY*.22):extraY/2};
}
