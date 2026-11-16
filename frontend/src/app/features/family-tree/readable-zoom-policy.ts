/** Two separate intents:
 * Manual zoom remains free for exploring the tree (12%-250% in focus mode).
 * Fit is a deliberate readable framing command, NOT a global zoom restriction.
 * Never remove nodes or relationships to make a zoomed-out view look tidy.
 */
export type FamilyTreeViewMode='focus'|'overview';
export const MIN_FOCUS_ZOOM=0.12;
export const READABLE_FOCUS_FIT_ZOOM=0.78;
export const MAX_ZOOM=2.5;
export const MIN_MAP_ZOOM=0.004;

export function clampReadableFamilyZoom(value:number,mode:FamilyTreeViewMode):number{
  const minimum=mode==='focus'?MIN_FOCUS_ZOOM:MIN_MAP_ZOOM;
  if(!Number.isFinite(value))return mode==='focus'?1:minimum;
  return Math.min(MAX_ZOOM,Math.max(minimum,value));
}

export function readableFitCenter(
  naturalFit:number,mode:FamilyTreeViewMode,
  focused:{x:number;y:number}|null,viewport:{width:number;height:number},
  worldSize:{width:number;height:number}
):{zoom:number;panX:number;panY:number}{
  const fitTarget=mode==='focus'
    ?Math.max(naturalFit,READABLE_FOCUS_FIT_ZOOM):naturalFit;
  const zoom=clampReadableFamilyZoom(fitTarget,mode);
  if(mode==='focus' && naturalFit<READABLE_FOCUS_FIT_ZOOM && focused){
    return {zoom,panX:viewport.width/2-focused.x*zoom,
      panY:viewport.height/2-focused.y*zoom};
  }
  const extraY=viewport.height-worldSize.height*zoom;
  return {zoom,panX:(viewport.width-worldSize.width*zoom)/2,
    panY:extraY>80?Math.max(16,extraY*.22):extraY/2};
}
