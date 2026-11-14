import {
  AfterViewInit, Component, computed, effect, ElementRef, HostListener,
  inject, signal, ViewChild
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FamilyTreeStore } from '../../application/family-tree.store';
import { Gender, Person } from '../../domain/family-tree.model';
import { CANVAS_CARD_WIDTH, CANVAS_CARD_HEIGHT, createFamilyLayout } from './family-layout';

interface TouchPoint { x: number; y: number }
interface PointerGesture {
  readonly startX: number;
  readonly startY: number;
  readonly startPanX: number;
  readonly startPanY: number;
  readonly tapId: string | null;
  moved: boolean;
}
interface PinchGesture {
  readonly initialDistance: number;
  readonly initialZoom: number;
  readonly worldX: number;
  readonly worldY: number;
}

@Component({
  selector: 'app-family-tree-page',
  standalone: true,
  templateUrl: './family-tree.page.html',
  styleUrl: './family-tree.page.css'
})
export class FamilyTreePage implements AfterViewInit {
  readonly store = inject(FamilyTreeStore);
  readonly layout = computed(() => createFamilyLayout(
    this.store.visiblePeople(),
    this.store.visibleRelationships(),
    this.store.focusPersonId(),
    { allPeople: this.store.people(), allRelationships: this.store.relationships(), mode: this.store.mode() }
  ));
  readonly tiers = computed(() => Array.from({length: this.layout().generationCount}, (_unused, i) => i));
  readonly panX = signal(0);
  readonly panY = signal(0);
  readonly addDialogOpen = signal(false);
  readonly mobileListOpen = signal(false);
  readonly formError = signal('');
  readonly canvasWarning = computed(() => this.layout().warnings[0] ?? '');
  readonly quickPersonId = signal<string | null>(null);
  readonly fullscreen = signal(false);
  readonly quickPerson = computed(() => this.quickPersonId() ? this.store.findPerson(this.quickPersonId()!) : undefined);
  readonly viewportSize = signal({ width: 1, height: 1 });
  readonly branchControls = computed(() => {
    if (this.store.mode() !== 'focus') return [];
    const nodes = this.layout().nodes;
    const byId = new Map(nodes.map(n => [n.person.id, n]));
    const visitedPairs = new Set<string>();
    const controls: Array<{
      key: string; anchorId: string; label: string; symbol: string;
      open: boolean; hidden: number; left: number; top: number
    }> = [];
    for (const node of nodes) {
      for (const branch of this.store.branchOptions(node.person.id)) {
        if (!branch.open && branch.hidden === 0 && !this.store.collapsedBranches().has(branch.key)) continue;
        if (branch.kind === 'pair') {
          if (visitedPairs.has(branch.key)) continue;
          visitedPairs.add(branch.key);
        }
        const center = node.x + CANVAS_CARD_WIDTH / 2;
        let left = center - 21, top = node.y;
        if (branch.kind === 'up') top -= 36;
        if (branch.kind === 'down') top += CANVAS_CARD_HEIGHT + 8;
        if (branch.kind === 'side') {
          const rightPartner = this.store.relationsFor(node.person.id).partners
            .some(id => (byId.get(id)?.x ?? -Infinity) > node.x && byId.get(id)?.y === node.y);
          left = rightPartner ? node.x - 42 : node.x + CANVAS_CARD_WIDTH + 1;
          top += CANVAS_CARD_HEIGHT / 2 - 16;
        }
        if (branch.kind === 'pair') {
          const partner = branch.key.slice(5).split('|').map(decodeURIComponent)
            .find(id => id !== node.person.id);
          const spouse = partner ? byId.get(partner) : undefined;
          if (spouse) {
            left = (center + spouse.x + CANVAS_CARD_WIDTH / 2) / 2 - 21;
            top = Math.max(node.y, spouse.y) + CANVAS_CARD_HEIGHT + 8;
          } else top += CANVAS_CARD_HEIGHT + 8;
        }
        controls.push({
          key:branch.key,anchorId:node.person.id,label:branch.title,
          symbol:branch.kind==='up'?'↑':branch.kind==='side'?'↔':'↓',
          open:branch.open,hidden:branch.hidden,left,top
        });
      }
    }
    return controls;
  });
  quickPosition(): { left: number; top: number } {
    const id = this.quickPersonId();
    const node = id ? this.layout().nodes.find(n => n.person.id === id) : undefined;
    if (!node) return {left:12,top:12};
    const zoom = this.store.zoom();
    const {width,height}=this.viewportSize();
    const x = this.panX() + node.x * zoom, y = this.panY() + node.y * zoom;
    const right = x + CANVAS_CARD_WIDTH * zoom;
    const maxWidth = 315;
    const left = right + 12 + maxWidth < width ? right + 12 : x - maxWidth - 12;
    return {
      left: Math.max(8, Math.min(width - maxWidth - 8, left)),
      top: Math.max(8, Math.min(height - 345, y))
    };
  }
  @ViewChild('canvasWindow') canvasWindow?: ElementRef<HTMLDivElement>;

  private readonly pointers = new Map<number, TouchPoint>();
  private panGesture: PointerGesture | null = null;
  private pinchGesture: PinchGesture | null = null;
  private fitted = false;
  private suppressClickUntil = 0;

  constructor() {
    effect(() => {
      const ready = !this.store.loading() && this.layout().nodes.length > 0;
      if (ready && !this.fitted) requestAnimationFrame(() => this.fitCanvas());
    });
  }

  ngAfterViewInit(): void {
    requestAnimationFrame(() => { if (!this.store.loading()) this.fitCanvas(); });
  }

  @HostListener('window:resize')
  onResize(): void { if (this.fitted) this.fitCanvas(); }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.fullscreen()) this.toggleFullscreen();
    this.quickPersonId.set(null);
  }

  toggleFullscreen(): void {
    this.quickPersonId.set(null);
    this.fullscreen.update(value => !value);
    requestAnimationFrame(()=>this.fitCanvas());
  }

  viewPersonDetails(): void {
    this.quickPersonId.set(null);
    document.getElementById('person-inspector')?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  initials(name: string): string {
    return name.trim().split(/\s+/).slice(0, 2)
      .map(part => part[0]?.toLocaleUpperCase('id') ?? '').join('');
  }
  birthYear(person: Person): string { return person.birthDate?.slice(0, 4) ?? 'Tahun belum diketahui'; }
  relationTitle(id: string, kind: 'parents' | 'partners' | 'children' | 'siblings'): string {
    return this.store.relationsFor(id)[kind]
      .map(personId => this.store.findPerson(personId)?.name)
      .filter((name): name is string => !!name)
      .join(', ') || 'Belum dicatat';
  }

  selectPerson(id: string): void {
    if (Date.now() < this.suppressClickUntil) return;
    this.store.select(id);
    this.quickPersonId.set(id);
    this.mobileListOpen.set(false);
  }

  setFocus(id: string): void {
    this.quickPersonId.set(null);
    this.store.setFocus(id);
    this.mobileListOpen.set(false);
    requestAnimationFrame(() => this.fitCanvas());
  }

  setMode(mode: 'focus' | 'overview'): void {
    this.quickPersonId.set(null);
    this.store.setMode(mode);
    requestAnimationFrame(() => this.fitCanvas());
  }

  toggleBranch(key: string, anchorId: string): void {
    this.quickPersonId.set(null);
    this.keepAnchor(anchorId, () => this.store.toggleBranch(key));
  }
  collapseBranch(key: string, anchorId: string): void {
    this.quickPersonId.set(null);
    this.keepAnchor(anchorId, () => this.store.collapseBranch(key));
  }
  private keepAnchor(id: string, change: () => void): void {
    const before = this.layout().nodes.find(n => n.person.id === id);
    const z = this.store.zoom();
    const x = before ? this.panX() + (before.x + CANVAS_CARD_WIDTH / 2) * z : 0;
    const y = before ? this.panY() + (before.y + CANVAS_CARD_HEIGHT / 2) * z : 0;
    change();
    const after = this.layout().nodes.find(n => n.person.id === id);
    if (before && after) {
      this.panX.set(x - (after.x + CANVAS_CARD_WIDTH / 2) * z);
      this.panY.set(y - (after.y + CANVAS_CARD_HEIGHT / 2) * z);
    }
  }

  fitCanvas(): void {
    const viewport = this.canvasWindow?.nativeElement;
    const layout = this.layout();
    if (!viewport || !layout.nodes.length) return;
    const width = viewport.clientWidth, height = viewport.clientHeight;
    if (!width || !height) return;
    this.viewportSize.set({width,height});
    const z = Math.min(1.13, Math.max(.004,
      Math.min((width - 24) / layout.width, (height - 24) / layout.height)));
    this.store.setZoom(z);
    const scale = this.store.zoom();
    const extraY = height - layout.height * scale;
    this.panX.set((width - layout.width * scale) / 2);
    this.panY.set(extraY > 80 ? Math.max(16,extraY*.22) : extraY/2);
    this.fitted = true;
  }

  zoomAt(newZoom: number, screenX: number, screenY: number): void {
    const before = this.store.zoom();
    this.store.setZoom(newZoom);
    const after = this.store.zoom();
    const ratio = after / before;
    this.panX.set(screenX - (screenX - this.panX()) * ratio);
    this.panY.set(screenY - (screenY - this.panY()) * ratio);
  }

  zoomBy(delta: number): void {
    const el = this.canvasWindow?.nativeElement;
    if (!el) return;
    this.quickPersonId.set(null);
    this.zoomAt(this.store.zoom() * (delta > 0 ? 1.23 : 1/1.23), el.clientWidth / 2, el.clientHeight / 2);
  }

  onWheel(event: WheelEvent): void {
    if (!this.canvasWindow) return;
    event.preventDefault();
    const rect = this.canvasWindow.nativeElement.getBoundingClientRect();
    this.quickPersonId.set(null);
    const factor = event.deltaY < 0 ? 1.12 : 1/1.12;
    this.zoomAt(this.store.zoom() * factor, event.clientX - rect.left, event.clientY - rect.top);
  }

  onPointerDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('.branch-toggle, .quick-panel')) return;
    // Mouse clicks on cards open quick actions; touch drag can start on cards.
    if (event.pointerType === 'mouse' && target.closest('.person-node')) return;
    const element = this.canvasWindow?.nativeElement;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const point = {x:event.clientX-rect.left, y:event.clientY-rect.top};
    const tapId = target.closest<HTMLElement>('.person-node')?.dataset['personId'] ?? null;
    this.pointers.set(event.pointerId,point);
    try { element.setPointerCapture(event.pointerId); } catch { /* some browsers deny capture */ }
    if (this.pointers.size === 1) {
      this.panGesture={startX:point.x,startY:point.y,startPanX:this.panX(),startPanY:this.panY(),
        tapId,moved:false};
      this.pinchGesture=null;
    } else if (this.pointers.size === 2) {
      const [a,b]=[...this.pointers.values()];
      const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
      this.pinchGesture={initialDistance:Math.max(8,Math.hypot(a.x-b.x,a.y-b.y)),
        initialZoom:this.store.zoom(),worldX:(mid.x-this.panX())/this.store.zoom(),
        worldY:(mid.y-this.panY())/this.store.zoom()};
      this.panGesture=null;
      this.suppressClickUntil=Date.now()+500;
    }
  }
  onPointerMove(event: PointerEvent): void {
    if (!this.pointers.has(event.pointerId)) return;
    const rect=this.canvasWindow!.nativeElement.getBoundingClientRect();
    this.pointers.set(event.pointerId,{x:event.clientX-rect.left,y:event.clientY-rect.top});
    if (this.pointers.size>=2) {
      const [a,b]=[...this.pointers.values()];
      const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
      const pinch=this.pinchGesture;
      if (!pinch) return;
      const distance=Math.hypot(a.x-b.x,a.y-b.y);
      this.store.setZoom(pinch.initialZoom*distance/pinch.initialDistance);
      const zoom=this.store.zoom();
      this.panX.set(mid.x-pinch.worldX*zoom);
      this.panY.set(mid.y-pinch.worldY*zoom);
      this.quickPersonId.set(null);
      this.suppressClickUntil=Date.now()+500;
    } else if (this.pointers.size===1 && this.panGesture) {
      const [point]=this.pointers.values();
      const dx=point.x-this.panGesture.startX,dy=point.y-this.panGesture.startY;
      if (Math.hypot(dx,dy)>16) {
        this.panGesture.moved=true;
        this.quickPersonId.set(null);
        this.suppressClickUntil=Date.now()+250;
      }
      this.panX.set(this.panGesture.startPanX+dx);
      this.panY.set(this.panGesture.startPanY+dy);
    }
  }
  onPointerUp(event: PointerEvent): void {
    if (!this.pointers.has(event.pointerId)) return;
    const gesture=this.panGesture;
    const tapId=event.type==='pointerup' && this.pointers.size===1
      && gesture && !gesture.moved ? gesture.tapId : null;
    this.pointers.delete(event.pointerId);
    if (tapId) {
      // Canvas has pointer capture. Resolve the original tapped node manually.
      this.suppressClickUntil=Date.now()+450;
      this.store.select(tapId);
      this.quickPersonId.set(tapId);
    }
    if (this.pointers.size===1) {
      const [point]=this.pointers.values();
      this.panGesture={startX:point.x,startY:point.y,
        startPanX:this.panX(),startPanY:this.panY(),tapId:null,moved:false};
      this.pinchGesture=null;
    } else if (!this.pointers.size) {
      this.panGesture=null;
      this.pinchGesture=null;
    }
  }

  onCanvasBackground(event: MouseEvent): void {
    if ((event.target as HTMLElement).closest('.person-node,.branch-toggle,.quick-panel')) return;
    this.quickPersonId.set(null);
  }

  goBackFocus(): void {
    const previous=this.store.goBackFocus();
    if (previous) {
      this.quickPersonId.set(null);
      requestAnimationFrame(()=>this.fitCanvas());
    }
  }

  resetBranches(): void {
    this.store.resetBranches();
    this.quickPersonId.set(null);
    requestAnimationFrame(()=>this.fitCanvas());
  }

  openAdd(): void { this.formError.set(''); this.addDialogOpen.set(true); }

  async submitPerson(event: Event): Promise<void> {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const name = String(formData.get('name') ?? '');
    const gender = String(formData.get('gender') ?? 'unknown') as Gender;
    const relationTo = String(formData.get('relationTo') ?? 'none') as PersonDraftRelation;
    const birthDate = String(formData.get('birthDate') ?? '');
    const birthOrderRaw = String(formData.get('birthOrder') ?? '');
    try {
      await this.store.addPerson({ name, gender, relationTo, birthDate,
        birthOrder: birthOrderRaw ? Number(birthOrderRaw) : undefined,
        targetId: this.store.selectedPersonId() });
      this.addDialogOpen.set(false);
      form.reset();
      requestAnimationFrame(() => this.fitCanvas());
    } catch (error: unknown) {
      this.formError.set(error instanceof Error ? error.message : 'Gagal menyimpan orang baru.');
    }
  }

  downloadJson(): void {
    const blob = new Blob([this.store.exportJson()], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;link.download='knowyourfam-demo.json';link.click();
    URL.revokeObjectURL(url);
  }
}
type PersonDraftRelation = 'none' | 'parent' | 'child' | 'partner';
