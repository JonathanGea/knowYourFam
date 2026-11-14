import {
  AfterViewInit, Component, computed, effect, ElementRef, HostListener,
  inject, OnDestroy, signal, ViewChild
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FamilyTreeStore } from '../../application/family-tree.store';
import { Gender, Person } from '../../domain/family-tree.model';
import { CANVAS_CARD_WIDTH, CANVAS_CARD_HEIGHT, createFamilyLayout } from './family-layout';
import { parseDemoTreeJson } from '../../infrastructure/demo-import';

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
  imports: [RouterLink],
  templateUrl: './family-tree.page.html',
  styleUrl: './family-tree.page.css'
})
export class FamilyTreePage implements AfterViewInit, OnDestroy {
  readonly store = inject(FamilyTreeStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private queryApplied = false;
  readonly dialog = signal<'add'|'edit'|'link'|'pair-child'|'delete'|'rename'|null>(null);
  readonly dialogPersonId = signal('');
  readonly dialogTargetId = signal('');
  readonly dialogRelation = signal<'none'|'parent'|'child'|'partner'|'sibling'>('child');
  readonly photoData = signal('');
  readonly tutorial = signal<{ module: string; index: number } | null>(null);
  readonly tutorialSteps = computed(() => {
    const name = this.tutorial()?.module ?? '';
    const examples: Record<string, readonly string[]> = {
      kartu: ['Ketuk satu kartu Person di kanvas.', 'Buka panel aksi cepat dan lihat kerabatnya.', 'Gunakan Jadikan fokus untuk menjelajahi anggota tersebut.'],
      hubungan: ['Pilih anggota keluarga sebagai titik hubungan.', 'Gunakan Tambah anggota untuk membuat Person baru, atau Hubungkan untuk memilih Person lama.', 'Periksa perubahan relasi yang langsung muncul di kanvas.'],
      saudara: ['Fokus pada satu Person dan buka daftar saudaranya.', 'Urutan saudara mengikuti birthOrder, kemudian tanggal lahir jika tersedia.', 'Urutan lahir dapat diedit dari profil.'],
      cabang: ['Gunakan tombol ↑ untuk membuka orang tua.', 'Gunakan ↔ untuk saudara, ↓ untuk anak, atau tombol pasangan untuk anak bersama.', 'Tutup cabang tanpa menutup bagian keluarga lain.'],
      kanvas: ['Geser area kosong untuk memindahkan kanvas.', 'Gunakan tombol + / − atau pinch untuk memperbesar dan memperkecil.', 'Tekan Pas untuk menyesuaikan seluruh pohon.'],
      data: ['Data demo hanya disimpan di browser ini.', 'Gunakan Ekspor JSON untuk membuat cadangan.', 'Impor JSON dari main untuk membandingkan pohon yang identik.']
    };
    return examples[name] ?? examples['kanvas'];
  });
  readonly editingPerson = computed(() => this.store.findPerson(this.dialogPersonId()));
  readonly layout = computed(() => createFamilyLayout(
    this.store.visiblePeople(),
    this.store.visibleRelationships(),
    this.store.focusPersonId(),
    { allPeople: this.store.people(), allRelationships: this.store.relationships(), mode: this.store.mode() }
  ));
  readonly tiers = computed(() => Array.from({length: this.layout().generationCount}, (_unused, i) => i));
  readonly panX = signal(0);
  readonly panY = signal(0);
  readonly mobileListOpen = signal(false);
  readonly formError = signal('');
  readonly canvasWarning = computed(() => this.layout().warnings[0] ?? '');
  readonly quickPersonId = signal<string | null>(null);
  readonly fullscreen = signal(false);
  readonly detailsOpen = signal(false);
  readonly helpOpen = signal(false);
  readonly onboardingDismissed = signal(false);
  readonly labelBoost = computed(() => Math.min(1.5, Math.max(1, 0.73 / this.store.zoom())));
  readonly mobileMenuOpen = signal(false);
  readonly showAllQuickSiblings = signal(false);
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
    const maxWidth = 324;
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
    try {
      const raw = localStorage.getItem('knowyourfam_learning_v1');
      if (raw && JSON.parse(raw)?.dismissed) this.onboardingDismissed.set(true);
    } catch { /* Browser storage is optional in demo. */ }
    effect(() => {
      const ready = !this.store.loading() && this.layout().nodes.length > 0;
      if (ready && !this.fitted) requestAnimationFrame(() => this.fitThenFocus());
      if (ready && !this.queryApplied) {
        this.queryApplied = true;
        const id = this.route.snapshot.queryParamMap.get('person');
        if (id && this.store.findPerson(id)) this.store.setFocus(id);
        const action = this.route.snapshot.queryParamMap.get('action');
        if (id && this.store.findPerson(id)) {
          if (action === 'edit') this.openEdit(id);
          if (action === 'link') this.openLink(id);
          if (action === 'add') this.openAdd('child', id);
          if (action === 'pair') this.openPairChild(id);
          if (action === 'delete') this.openDelete(id);
        }
        const tutorialName = this.route.snapshot.queryParamMap.get('tutorial');
        if (tutorialName) this.startTutorial(tutorialName);
      }
    });
  }

  ngAfterViewInit(): void {
    requestAnimationFrame(() => { if (!this.store.loading()) this.fitThenFocus(); });
  }

  ngOnDestroy(): void {
    if (this.store.tutorialActive()) this.store.endTutorialTree();
  }

  @HostListener('window:resize')
  onResize(): void { if (this.fitted) this.fitThenFocus(); }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.fullscreen()) this.toggleFullscreen();
    this.quickPersonId.set(null);
    if (this.detailsOpen()) this.detailsOpen.set(false);
    if (this.tutorial()) this.stopTutorial();
  }

  toggleFullscreen(): void {
    this.quickPersonId.set(null);
    this.fullscreen.update(value => !value);
    requestAnimationFrame(()=>this.fitCanvas());
  }

  viewPersonDetails(): void {
    const id = this.quickPersonId() ?? this.store.selectedPersonId();
    this.quickPersonId.set(null);
    if (id && this.store.findPerson(id)) void this.router.navigate(['/person', id]);
  }

  dismissOnboarding(): void {
    this.onboardingDismissed.set(true);
    try {
      const raw = localStorage.getItem('knowyourfam_learning_v1');
      const parsed: unknown = raw ? JSON.parse(raw) : {};
      const old = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
      localStorage.setItem('knowyourfam_learning_v1', JSON.stringify({ ...old, dismissed: true }));
    } catch { /* Dismissed for this page even if browser storage is unavailable. */ }
  }

  startTutorial(module: string): void {
    this.dismissOnboarding();
    this.store.startTutorialTree();
    this.tutorial.set({module,index:0});
    requestAnimationFrame(()=>this.fitCanvas());
  }

  stopTutorial(): void {
    this.tutorial.set(null);
    this.store.endTutorialTree();
    requestAnimationFrame(()=>this.fitCanvas());
  }

  nextTutorial(): void {
    const current=this.tutorial();
    if (!current) return;
    if (current.index+1>=this.tutorialSteps().length) this.stopTutorial();
    else this.tutorial.set({...current,index:current.index+1});
  }

  openAdd(relation: 'none'|'parent'|'child'|'partner'|'sibling'='child', targetId?:string): void {
    this.formError.set('');
    this.quickPersonId.set(null);
    this.dialogPersonId.set('');
    this.dialogTargetId.set(targetId ?? this.store.selectedPersonId());
    this.dialogRelation.set(relation);
    this.photoData.set('');
    this.dialog.set('add');
  }

  openEdit(id?:string): void {
    const person=this.store.findPerson(id ?? this.store.selectedPersonId());
    if (!person) return;
    this.formError.set('');
    this.dialogPersonId.set(person.id);
    this.photoData.set(person.photo ?? '');
    this.quickPersonId.set(null);
    this.dialog.set('edit');
  }

  openLink(id?:string): void {
    this.dialogPersonId.set(id ?? this.store.selectedPersonId());
    this.formError.set('');
    this.quickPersonId.set(null);
    this.dialog.set('link');
  }

  openPairChild(id?:string): void {
    this.dialogPersonId.set(id ?? this.store.selectedPersonId());
    this.formError.set('');
    this.quickPersonId.set(null);
    this.dialog.set('pair-child');
  }

  openDelete(id?:string): void {
    this.dialogPersonId.set(id ?? this.store.selectedPersonId());
    this.formError.set('');
    this.dialog.set('delete');
  }

  async unlinkRelationship(edgeId: string): Promise<void> {
    const edge=this.store.relationships().find(r=>r.id===edgeId);
    if (!edge) return;
    const a=this.store.findPerson(edge.fromId)?.name ?? 'Person A';
    const b=this.store.findPerson(edge.toId)?.name ?? 'Person B';
    if (!window.confirm('Putus hubungan '+a+' dan '+b+'? Profil kedua Person tetap tersimpan. (Hanya mode demo)')) return;
    try { await this.store.unlinkRelationship(edgeId); }
    catch (error) { window.alert(error instanceof Error ? error.message : 'Gagal menghapus hubungan.'); }
  }

  async submitLink(event: Event): Promise<void> {
    event.preventDefault();
    const data=new FormData(event.target as HTMLFormElement);
    const source=this.dialogPersonId();
    try {
      if (this.dialog()==='pair-child') {
        await this.store.linkChildToCouple(source,String(data.get('partnerId')??''),String(data.get('childId')??''));
      } else {
        await this.store.linkExisting(source,String(data.get('targetId')??''),
          String(data.get('type')??'child') as 'parent'|'child'|'partner'|'sibling');
      }
      this.dialog.set(null);
    } catch(error) { this.formError.set(error instanceof Error ? error.message : 'Gagal menghubungkan anggota.'); }
  }

  async submitDelete(): Promise<void> {
    try {
      await this.store.deletePersonDemo(this.dialogPersonId());
      this.dialog.set(null);
      this.quickPersonId.set(null);
      requestAnimationFrame(()=>this.fitCanvas());
    } catch(error) { this.formError.set(error instanceof Error ? error.message : 'Gagal menghapus Person.'); }
  }

  async submitTreeName(event: Event): Promise<void> {
    event.preventDefault();
    const name=String(new FormData(event.target as HTMLFormElement).get('name')??'');
    try { await this.store.renameTree(name); this.dialog.set(null); }
    catch(error) { this.formError.set(error instanceof Error ? error.message : 'Gagal mengganti nama pohon.'); }
  }

  onPhotoSelected(event: Event): void {
    const file=(event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 8_000_000) {
      this.formError.set('Foto harus PNG/JPEG/WebP, maksimal 8 MB.');
      return;
    }
    const img=new Image(), url=URL.createObjectURL(file);
    img.onload=()=>{
      try {
        const max=256,scale=Math.min(1,max/Math.max(img.width,img.height));
        const canvas=document.createElement('canvas');
        canvas.width=Math.max(1,Math.round(img.width*scale));
        canvas.height=Math.max(1,Math.round(img.height*scale));
        const ctx=canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas tidak tersedia.');
        ctx.drawImage(img,0,0,canvas.width,canvas.height);
        const encoded=canvas.toDataURL('image/jpeg',.72);
        if (encoded.length>250000) throw new Error('Foto hasil kompresi terlalu besar.');
        this.photoData.set(encoded);
        this.formError.set('');
      } catch (error) {
        this.formError.set(error instanceof Error ? error.message : 'Tidak dapat membaca foto.');
      } finally { URL.revokeObjectURL(url); }
    };
    img.onerror=()=>{URL.revokeObjectURL(url);this.formError.set('Foto tidak dapat dibaca.');};
    img.src=url;
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
    this.showAllQuickSiblings.set(false);
    this.helpOpen.set(false);
    this.mobileListOpen.set(false);
  }

  setFocus(id: string): void {
    this.quickPersonId.set(null);
    this.helpOpen.set(false);
    this.detailsOpen.set(false);
    this.store.setFocus(id);
    this.mobileListOpen.set(false);
    requestAnimationFrame(() => this.fitThenFocus());
  }

  openSidebarPerson(id: string): void {
    this.store.select(id);
    this.quickPersonId.set(null);
    this.detailsOpen.set(true);
  }

  yearsOf(person: Person): string {
    if (!person.birthDate && !person.deathDate) return 'Tahun belum diisi';
    return (person.birthDate?.slice(0, 4) ?? '—') +
      (person.deathDate ? ' – ' + person.deathDate.slice(0, 4) : '');
  }

  relationshipCount(id: string): number {
    const relation = this.store.relationsFor(id);
    return new Set([
      ...relation.parents, ...relation.partners, ...relation.children, ...relation.siblings
    ]).size;
  }

  quickDirections(id: string): readonly {
    kind: string; label: string; symbol: string; key: string|null;
    open: boolean; hidden: number
  }[] {
    const groups = [
      { kind: 'up', label: 'Orang tua', symbol: '↑' },
      { kind: 'side', label: 'Saudara', symbol: '↔' },
      { kind: 'down', label: 'Anak', symbol: '↓' }
    ];
    const options = this.store.branchOptions(id);
    return groups.map(group => {
      const option = options.find(branch => group.kind === 'down'
        ? branch.kind === 'down' || branch.kind === 'pair' : branch.kind === group.kind);
      return { ...group, key:option?.key ?? null, open:option?.open ?? false, hidden:option?.hidden ?? 0 };
    });
  }

  async addTestGenerations(): Promise<void> {
    if (!window.confirm('Tambahkan anggota uji dari main untuk menguji 10 generasi? Data yang ada tidak akan dihapus.')) return;
    try {
      const changed = await this.store.mergeTestMembers();
      window.alert(changed.persons || changed.relationships
        ? changed.persons + ' anggota uji dan ' + changed.relationships + ' hubungan ditambahkan.'
        : 'Seluruh anggota uji sudah ada pada pohon ini.');
      requestAnimationFrame(() => this.fitCanvas());
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Tidak dapat menambah data uji.');
    }
  }

  async createNewTree(): Promise<void> {
    if (!window.confirm('Buat pohon baru? Pohon demo saat ini akan diganti di browser ini. Ekspor JSON terlebih dahulu untuk cadangan.')) return;
    try {
      await this.store.createEmptyTree();
      this.quickPersonId.set(null);
      this.detailsOpen.set(false);
      this.helpOpen.set(false);
      this.mobileMenuOpen.set(false);
      requestAnimationFrame(() => this.fitCanvas());
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Tidak dapat membuat pohon.');
    }
  }

  setMode(mode: 'focus' | 'overview'): void {
    this.quickPersonId.set(null);
    this.store.setMode(mode);
    requestAnimationFrame(() => this.fitThenFocus());
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

  /** Main's render({fit:true}) first fits then centers the Focus Person at .78/.88 zoom.
   * The explicit Fit button must still fit ALL visible members instead. */
  private fitThenFocus(): void {
    this.fitCanvas();
    if (this.store.mode() !== 'focus') return;
    const viewport = this.canvasWindow?.nativeElement;
    const person = this.layout().nodes.find(node => node.person.id === this.store.focusPersonId());
    if (!viewport || !person) return;
    const z = viewport.clientWidth <= 650 ? 0.88 : 0.78;
    this.store.setZoom(z);
    this.panX.set(viewport.clientWidth/2 - (person.x + CANVAS_CARD_WIDTH/2)*z);
    this.panY.set(viewport.clientHeight/2 - (person.y + CANVAS_CARD_HEIGHT/2)*z);
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
    if (event.pointerType === 'mouse' && target.closest('.person-node, .node')) return;
    const element = this.canvasWindow?.nativeElement;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const point = {x:event.clientX-rect.left, y:event.clientY-rect.top};
    const tapId = target.closest<HTMLElement>('.person-node, .node')?.dataset['personId'] ?? null;
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
    if ((event.target as HTMLElement).closest('.person-node,.node,.branch-toggle,.quick-panel')) return;
    this.quickPersonId.set(null);
  }

  goBackFocus(): void {
    const previous=this.store.goBackFocus();
    if (previous) {
      this.quickPersonId.set(null);
      requestAnimationFrame(()=>this.fitThenFocus());
    }
  }

  resetBranches(): void {
    this.store.resetBranches();
    this.quickPersonId.set(null);
    requestAnimationFrame(()=>this.fitThenFocus());
  }

  async submitPerson(event: Event): Promise<void> {
    event.preventDefault();
    const form=event.target as HTMLFormElement,data=new FormData(form);
    const name=String(data.get('name')??'');
    const gender=String(data.get('gender')??'unknown') as Gender;
    const relationTo=String(data.get('relationTo')??'none') as PersonDraftRelation;
    const birthOrderInput=String(data.get('birthOrder')??'').trim();
    const details={
      name,gender,birthDate:String(data.get('birthDate')??''),
      deathDate:String(data.get('deathDate')??''),
      birthOrder:birthOrderInput ? Number(birthOrderInput):undefined,
      nickname:String(data.get('nickname')??''),
      birthPlace:String(data.get('birthPlace')??''),
      residence:String(data.get('residence')??''),
      occupation:String(data.get('occupation')??''),
      notes:String(data.get('notes')??''),
      photo:this.photoData()
    };
    try {
      if (this.dialog()==='edit') {
        await this.store.updatePerson(this.dialogPersonId(),details);
      } else {
        const {birthDate,birthOrder}=details;
        await this.store.addPerson({name,gender,birthDate,birthOrder,relationTo,
          targetId:this.dialogTargetId()},details);
      }
      this.dialog.set(null);
      this.formError.set('');
      form.reset();
      requestAnimationFrame(()=>this.fitCanvas());
    } catch(error) {
      this.formError.set(error instanceof Error ? error.message : 'Gagal menyimpan data Person.');
    }
  }

  async importJson(event: Event): Promise<void> {
    const input=event.target as HTMLInputElement;
    const file=input.files?.[0];
    if (!file) return;
    try {
      if (file.size>3_000_000) throw new Error('Maksimal ukuran JSON adalah 3 MB.');
      const parsed=parseDemoTreeJson(await file.text());
      if (!window.confirm('Impor '+parsed.people.length+' anggota dan mengganti data demo di browser ini? Sebaiknya ekspor cadangan terlebih dahulu.')) return;
      await this.store.importDemoTree(parsed);
      this.quickPersonId.set(null);
      requestAnimationFrame(()=>this.fitCanvas());
    } catch(error: unknown) {
      window.alert(error instanceof Error ? error.message : 'Gagal mengimpor file JSON.');
    } finally {
      input.value='';
    }
  }

  downloadLegacyJson(): void {
    if (this.store.relationships().some(r => r.status !== 'confirmed') &&
      !window.confirm('Format JSON main tidak memiliki status konfirmasi hubungan. Tetap ekspor untuk main?')) return;
    this.downloadData(this.store.exportLegacyJson(),'knowyourfam-main-compatible.json');
  }

  downloadJson(): void {
    this.downloadData(this.store.exportJson(),'knowyourfam-angular-backup.json');
  }

  private downloadData(json: string, filename: string): void {
    const blob = new Blob([json], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;link.download=filename;link.click();
    URL.revokeObjectURL(url);
  }
}
type PersonDraftRelation = 'none' | 'parent' | 'child' | 'partner' | 'sibling';
