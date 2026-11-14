import {
  AfterViewInit, Component, computed, effect, ElementRef, HostListener,
  inject, signal, ViewChild
} from '@angular/core';
import { FamilyTreeStore } from '../../application/family-tree.store';
import { Gender, Person } from '../../domain/family-tree.model';
import { CANVAS_CARD_WIDTH, CANVAS_CARD_HEIGHT, createFamilyLayout } from './family-layout';

interface TouchPoint { x: number; y: number }

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
  @ViewChild('canvasWindow') canvasWindow?: ElementRef<HTMLDivElement>;

  private readonly pointers = new Map<number, TouchPoint>();
  private pinchDistance = 0;
  private lastPan: TouchPoint | null = null;
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
    this.mobileListOpen.set(false);
  }

  setFocus(id: string): void {
    this.store.setFocus(id);
    this.mobileListOpen.set(false);
    requestAnimationFrame(() => this.fitCanvas());
  }

  setMode(mode: 'focus' | 'overview'): void {
    this.store.setMode(mode);
    requestAnimationFrame(() => this.fitCanvas());
  }

  toggleBranch(key: string, anchorId: string): void {
    this.keepAnchor(anchorId, () => this.store.toggleBranch(key));
  }
  collapseBranch(key: string, anchorId: string): void {
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
    const padding = 36;
    const z = Math.min(1.15,
      (viewport.clientWidth - padding * 2) / layout.width,
      (viewport.clientHeight - padding * 2) / layout.height
    );
    this.store.setZoom(Math.max(.12, z));
    const scale = this.store.zoom();
    this.panX.set((viewport.clientWidth - layout.width * scale) / 2);
    this.panY.set((viewport.clientHeight - layout.height * scale) / 2);
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
    this.zoomAt(this.store.zoom() + delta, el.clientWidth / 2, el.clientHeight / 2);
  }

  onWheel(event: WheelEvent): void {
    if (!this.canvasWindow) return;
    event.preventDefault();
    const rect = this.canvasWindow.nativeElement.getBoundingClientRect();
    const scale = Math.exp(-event.deltaY * (event.ctrlKey ? .008 : .002));
    this.zoomAt(this.store.zoom() * scale, event.clientX - rect.left, event.clientY - rect.top);
  }

  onPointerDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const element = this.canvasWindow?.nativeElement;
    if (!element) return;
    element.setPointerCapture(event.pointerId);
    this.pointers.set(event.pointerId, {x:event.clientX,y:event.clientY});
    if (this.pointers.size === 1) this.lastPan = {x:event.clientX,y:event.clientY};
    if (this.pointers.size === 2) this.pinchDistance = this.distanceBetweenPointers();
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.pointers.has(event.pointerId)) return;
    const previous = this.pointers.get(event.pointerId)!;
    this.pointers.set(event.pointerId, {x:event.clientX,y:event.clientY});
    if (this.pointers.size >= 2) {
      const currentDistance = this.distanceBetweenPointers();
      if (this.pinchDistance && currentDistance > 0) {
        const points = [...this.pointers.values()];
        const rect = this.canvasWindow!.nativeElement.getBoundingClientRect();
        const midpointX = (points[0].x + points[1].x) / 2 - rect.left;
        const midpointY = (points[0].y + points[1].y) / 2 - rect.top;
        this.zoomAt(this.store.zoom() * currentDistance / this.pinchDistance, midpointX, midpointY);
      }
      this.pinchDistance = currentDistance;
      this.suppressClickUntil = Date.now() + 250;
    } else {
      const deltaX = event.clientX - previous.x;
      const deltaY = event.clientY - previous.y;
      if (Math.abs(deltaX) + Math.abs(deltaY) >= 1) {
        this.panX.update(x => x + deltaX);
        this.panY.update(y => y + deltaY);
        if (Math.abs(deltaX) + Math.abs(deltaY) > 2) this.suppressClickUntil = Date.now() + 100;
      }
      this.lastPan = {x:event.clientX,y:event.clientY};
    }
  }
  private distanceBetweenPointers(): number {
    const points = [...this.pointers.values()];
    if (points.length < 2) return 0;
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  }
  onPointerUp(event: PointerEvent): void {
    this.pointers.delete(event.pointerId);
    if (this.pointers.size < 2) this.pinchDistance = 0;
    this.lastPan = null;
    if (this.pointers.size === 0) {
      const el=this.canvasWindow?.nativeElement;
      if (el?.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId);
    }
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
