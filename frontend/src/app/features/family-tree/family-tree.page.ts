import {
  AfterViewInit, Component, computed, effect, ElementRef, HostListener,
  inject, OnDestroy, signal, ViewChild
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FamilyTreeStore } from '../../application/family-tree.store';
import { Gender, Person } from '../../domain/family-tree.model';
import { CANVAS_CARD_WIDTH, CANVAS_CARD_HEIGHT, createFamilyLayout } from './family-layout';
import { getTutorialCourse, TUTORIAL_COURSES } from './tutorial-content.data';
import type { TutorialStep } from './tutorial-content.data';
import type { FamilyTree } from '../../domain/family-tree.model';
import { parseDemoTreeJson } from '../../infrastructure/demo-import';
import { SupabaseConnectionService } from '../../infrastructure/supabase-connection.service';
import { PersonIdentityService } from '../../application/person-identity.service';
import { resolveKinship } from '../../application/relationship-kinship';
import { LearningProgressService, LearningState } from '../../infrastructure/learning-progress.service';

interface TutorialSession {
  module: string; index: number; minimized: boolean; preview: string;
}
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
  readonly cloud = inject(SupabaseConnectionService);
  private readonly identity = inject(PersonIdentityService);
  readonly viewerUserId = signal<string|null>(null);
  readonly personClaimBusy = signal(false);
  readonly personClaimError = signal('');
  private readonly learningProgress = inject(LearningProgressService);
  readonly learningError = this.learningProgress.error;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private queryApplied = false;
  readonly dialog = signal<'add'|'edit'|'link'|'pair-child'|'delete'|'rename'|null>(null);
  readonly dialogPersonId = signal('');
  readonly dialogPartnerId = signal('');
  readonly dialogTargetId = signal('');
  readonly dialogRelation = signal<'none'|'parent'|'child'|'partner'|'sibling'>('child');
  readonly photoData = signal('');
  readonly tutorial = signal<TutorialSession | null>(null);
  readonly courses = TUTORIAL_COURSES;
  readonly learning = this.learningProgress.state;
  readonly tutorialCourse = computed(() => getTutorialCourse(this.tutorial()?.module ?? ''));
  readonly tutorialSteps = computed(() => this.tutorialCourse()?.steps ?? []);
  readonly tutorialStep = computed(() => this.tutorialSteps()[this.tutorial()?.index ?? 0]);
  readonly tutorialDone = computed(() =>
    !!this.tutorial() && (this.tutorial()?.index ?? 0) >= this.tutorialSteps().length);
  readonly tutorialPercentage = computed(() =>
    Math.round(100 * (this.tutorial()?.index ?? 0) / Math.max(1,this.tutorialSteps().length)));
  readonly highlightedTutorialPerson = computed(() => {
    const step=this.tutorialStep();
    return step?.target ?? (step?.type==='branch'?'edu-self':null);
  });
  readonly highlightedTutorialBranch = computed(() =>
    this.tutorialStep()?.type==='branch' ? this.tutorialStep()?.key : null);
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
  readonly sidebarQuery = signal('');
  readonly sidebarMatchCount = computed(() => {
    const query = this.sidebarQuery().trim().toLocaleLowerCase('id');
    if (!query) return this.store.people().length;
    return this.store.people().filter(person =>
      (person.name + ' ' + (person.nickname ?? '')).toLocaleLowerCase('id').includes(query)
    ).length;
  });
  readonly sidebarPeople = computed(() => {
    const people = this.store.people();
    const query = this.sidebarQuery().trim().toLocaleLowerCase('id');
    if (query) return people.filter(person =>
      (person.name + ' ' + (person.nickname ?? '')).toLocaleLowerCase('id').includes(query)
    ).slice(0, 18);

    // Keep the sidebar useful without rendering a 100+ person catalog.
    const focus = this.store.focusPersonId();
    const family = this.store.relationsFor(focus);
    const candidates = [focus, ...family.parents, ...family.partners, ...family.children, ...family.siblings];
    const selected: Person[] = [];
    const seen = new Set<string>();
    const add = (person?: Person) => {
      if (person && !seen.has(person.id) && selected.length < 8) {
        selected.push(person);
        seen.add(person.id);
      }
    };
    candidates.forEach(id => add(people.find(person => person.id === id)));
    return selected.length ? selected : people.slice(0, 8);
  });
  readonly formError = signal('');
  readonly canvasWarning = computed(() => this.layout().warnings[0] ?? '');
  readonly quickPersonId = signal<string | null>(null);
  readonly fullscreen = signal(false);
  readonly detailsOpen = signal(false);
  readonly drawerExpanded = signal(false);
  readonly trainingProfileOpen = signal(false);
  readonly trainingProfileTab = signal<'bio'|'family'|'memories'>('bio');
  private drawerStart: {pointerId:number;y:number} | null = null;
  private suppressDrawerGrabClickUntil = 0;
  private drawerGestureHandled = false;
  readonly helpOpen = signal(false);
  readonly onboardingDismissed = signal(false);
  readonly labelBoost = computed(() => Math.min(1.5, Math.max(1, 0.73 / this.store.zoom())));
  readonly mobileMenuOpen = signal(false);
  readonly explorerHistory = signal<readonly string[]>([]);
  readonly explorerUnavailableTarget = signal<string | null>(null);
  readonly explorerBranchError = signal(false);
  /** Tablet and touch browsers use centered popup rather than inspector dock. */
  isExplorerPopup():boolean {
    return window.matchMedia('(max-width: 1100px), (any-pointer: coarse)').matches;
  }
  readonly quickPerson = computed(() => this.quickPersonId() ? this.store.findPerson(this.quickPersonId()!) : undefined);
  readonly viewerPerson = computed(() => {
    const uid = this.viewerUserId();
    return uid ? this.store.people().find(person => person.claimedBy === uid) : undefined;
  });
  readonly kinshipPreview = computed(() => resolveKinship(
    this.store.people(), this.store.relationships(), this.viewerPerson()?.id ?? null, this.quickPersonId()
  ));
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
  @ViewChild('canvasWindow') canvasWindow?: ElementRef<HTMLDivElement>;
  @ViewChild('explorerPanel') explorerPanel?: ElementRef<HTMLElement>;

  private readonly pointers = new Map<number, TouchPoint>();
  private panGesture: PointerGesture | null = null;
  private pinchGesture: PinchGesture | null = null;
  private fitted = false;
  private suppressClickUntil = 0;

  constructor() {
    void this.cloud.userId().then(id => this.viewerUserId.set(id))
      .catch(() => this.viewerUserId.set(null));
    void this.learningProgress.load().catch(() => { /* Error is visible in learningError. */ });
    effect(() => this.onboardingDismissed.set(this.learning().dismissed));
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
  onResize(): void {
    if (!this.fitted) return;
    requestAnimationFrame(() => {
      const selected = this.quickPersonId();
      if (selected && this.store.visiblePersonIds().has(selected)) this.centerExplorerPerson(selected);
      else this.fitThenFocus();
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.fullscreen()) this.toggleFullscreen();
    this.closeExplorer();
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
    if (!id || !this.store.findPerson(id)) return;
    if (this.store.tutorialActive() && window.innerWidth>650) {
      this.trainingProfileTab.set('bio');
      this.trainingProfileOpen.set(true);
      this.detailsOpen.set(false);
      this.tutorialRecord('profile',{id});
    } else if (window.innerWidth<=650) {
      this.drawerExpanded.set(false);
      this.detailsOpen.set(true);
      this.tutorialRecord('profile',{id});
    } else {
      void this.router.navigate(['/person', id]);
    }
  }

  private saveLearning(next: LearningState): void {
    this.onboardingDismissed.set(next.dismissed);
    void this.learningProgress.save(next).catch(() => { /* Visible in learningError. */ });
  }

  dismissOnboarding(): void {
    this.saveLearning({...this.learning(),dismissed:true});
  }

  startTutorial(module: string): void {
    const course=getTutorialCourse(module);
    if (!course) return;
    if (this.store.tutorialActive()) this.stopTutorial();
    const state=this.learning();
    const raw=Number(state.progress[module] ?? 0);
    const index=Number.isInteger(raw) && raw>=0 && raw<course.steps.length ? raw : 0;
    this.store.startTutorialTree(module,state.snapshots[module]);
    this.tutorial.set({module,index,minimized:false,preview:''});
    this.dialog.set(null);
    this.quickPersonId.set(null);
    this.detailsOpen.set(false);
    this.trainingProfileOpen.set(false);
    this.helpOpen.set(false);
    this.dismissOnboarding();
    requestAnimationFrame(()=>this.fitThenFocus());
  }

  stopTutorial(): void {
    this.dialog.set(null);
    this.quickPersonId.set(null);
    this.detailsOpen.set(false);
    this.trainingProfileOpen.set(false);
    this.tutorial.set(null);
    this.store.endTutorialTree();
    requestAnimationFrame(()=>this.fitThenFocus());
  }

  private persistTutorialProgress(next: TutorialSession): void {
    const state=this.learning();
    const done=next.index >= this.tutorialSteps().length;
    const completed=done && !state.completed.includes(next.module)
      ? [...state.completed,next.module] : [...state.completed];
    const progress={...state.progress};
    const snapshots={...state.snapshots};
    if(done) {
      delete progress[next.module];
      delete snapshots[next.module];
    } else {
      progress[next.module]=next.index;
      snapshots[next.module]=structuredClone(this.store.tree());
    }
    this.saveLearning({...state,progress,snapshots,completed});
  }

  private advanceTutorial(): void {
    const prev=this.tutorial();
    if(!prev || this.tutorialDone())return;
    const next={...prev,index:prev.index+1,preview:''};
    this.tutorial.set(next);
    this.persistTutorialProgress(next);
  }

  tutorialRecord(event: string, payload: {
    id?:string;key?:string;open?:boolean;mode?:string;operation?:string;
    relation?:string;birthOrder?:number;notes?:string
  }={}): void {
    if(!this.store.tutorialActive())return;
    const step=this.tutorialStep();
    if(!step)return;
    let correct=false;
    switch(step.type) {
      case 'card':correct=event==='card' && payload.id===step.target;break;
      case 'profile':correct=event==='profile' && payload.id==='edu-self';break;
      case 'return':correct=event==='return';break;
      case 'created':correct=event==='person-save' && payload.operation==='create' &&
        payload.relation===step.relation;break;
      case 'edited-order':correct=event==='person-save' && payload.operation==='edit' &&
        payload.id==='edu-older' && payload.birthOrder===1;break;
      case 'edited-notes':correct=event==='person-save' && payload.operation==='edit' &&
        payload.id==='edu-self' && !!payload.notes?.trim() && payload.notes!=='Data latihan saja';break;
      case 'branch':correct=event==='branch' && payload.key===step.key && payload.open===step.open;break;
      case 'mode':correct=event==='mode' && payload.mode===step.mode;break;
      case 'zoom':correct=event==='zoom';break;
      case 'pan':correct=event==='pan';break;
      case 'fit':correct=event==='fit';break;
      case 'inspect':correct=event==='inspect';break;
      case 'simulate-export':correct=event==='simulate-export';break;
      case 'simulate-import':correct=event==='simulate-import';break;
    }
    if(correct)this.advanceTutorial();
  }

  tutorialAction(action: 'back'|'exit'|'guide'|'finish'|'next-course'|'minimize'|'action'): void {
    const session=this.tutorial();
    if(!session)return;
    if(action==='exit'||action==='finish') { this.stopTutorial();return; }
    if(action==='guide') { this.stopTutorial();void this.router.navigate(['/guide']);return; }
    if(action==='minimize'){
      this.tutorial.set({...session,minimized:!session.minimized});return;
    }
    if(action==='back') {
      if(session.index>0){
        const previous={...session,index:session.index-1,preview:''};
        this.tutorial.set(previous);
        this.persistTutorialProgress(previous);
      }
      return;
    }
    if(action==='next-course'){
      const index=TUTORIAL_COURSES.findIndex(course=>course.id===session.module);
      this.startTutorial(TUTORIAL_COURSES[(index+1)%TUTORIAL_COURSES.length].id);
      return;
    }
    const step: TutorialStep|undefined=this.tutorialStep();
    if(!step)return;
    if(step.type==='created') { this.openAdd(step.relation ?? 'child','edu-self'); return; }
    if(step.type==='edited-order') { this.openEdit('edu-older'); return; }
    if(step.type==='edited-notes') { this.openEdit('edu-self'); return; }
    if(step.type==='return') {
      this.closePersonDrawer();
      this.trainingProfileOpen.set(false);
      this.tutorialRecord('return');
      return;
    }
    if(step.type==='inspect') {
      this.fitCanvas();
      this.tutorialRecord('inspect');
      return;
    }
    if(step.type==='simulate-export') {
      const preview=JSON.stringify({
        treeName:'LATIHAN',
        people:this.store.people().slice(0,2).map(p=>({id:p.id,name:p.name}))
      },null,2);
      this.tutorialRecord('simulate-export');
      this.tutorial.update(t=>t?{...t,preview}:t);
      return;
    }
    if(step.type==='simulate-import') {
      this.tutorialRecord('simulate-import');
      this.tutorial.update(t=>t?{
        ...t,preview:'Pratinjau: JSON valid → konfirmasi → mengganti pohon aktif. Tidak ada file dipilih.'
      }:t);
    }
  }

  /** Previous simple `nextTutorial` allowed skipping without performing an action.
   * Keep a compatibility entry point but never advance without a verified event. */
  nextTutorial(): void { this.tutorialAction('action'); }

  openAdd(relation: 'none'|'parent'|'child'|'partner'|'sibling'='child', targetId?:string): void {
    this.dialogPartnerId.set('');
    this.formError.set('');
    this.quickPersonId.set(null);
    this.dialogPersonId.set('');
    this.dialogTargetId.set(targetId ?? this.store.selectedPersonId());
    this.dialogRelation.set(relation);
    this.photoData.set('');
    this.dialog.set('add');
  }

  openAddToCouple(parentA:string,parentB:string):void {
    this.openAdd('child',parentA);
    this.dialogPartnerId.set(parentB);
  }

  genderLabel(person:Person):string {
    return ({male:'Laki-laki',female:'Perempuan',other:'Lainnya',unknown:'Belum diisi'} as const)[person.gender];
  }
  dateText(value?:string):string {
    if(!value)return 'Belum diisi';
    const date=new Date(value+'T00:00:00');
    return Number.isNaN(date.getTime())?'Belum diisi':
      new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:'numeric'}).format(date);
  }
  drawerGroups(id:string):readonly {label:string;kind:'parent'|'partner'|'child'|'sibling';ids:readonly string[]}[] {
    const relations=this.store.relationsFor(id);
    return [
      {label:'Orang tua',kind:'parent',ids:relations.parents},
      {label:'Pasangan',kind:'partner',ids:relations.partners},
      {label:'Anak',kind:'child',ids:relations.children},
      {label:'Saudara',kind:'sibling',ids:relations.siblings}
    ];
  }

  drawerDirectEdge(personId:string,otherId:string,
    kind:'parent'|'partner'|'child'|'sibling') {
    return this.store.directRelationship(
      kind==='parent'?otherId:personId,
      kind==='parent'?personId:otherId,
      kind==='child'?'parent':kind);
  }

  openFullProfile(id:string):void {
    if(!this.store.findPerson(id))return;
    this.store.select(id);
    this.quickPersonId.set(null);
    this.detailsOpen.set(false);
    if(this.store.tutorialActive()) {
      this.trainingProfileTab.set('bio');
      this.trainingProfileOpen.set(true);
      this.tutorialRecord('profile',{id});
    } else {
      void this.router.navigate(['/person',id]);
    }
  }

  selectDrawerRelative(id:string):void {
    if(!this.store.findPerson(id))return;
    this.store.select(id);
    this.quickPersonId.set(null);
    this.detailsOpen.set(true);
  }
  returnFromTutorialProfile():void {
    this.trainingProfileOpen.set(false);
    this.tutorialRecord('return');
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


  async claimThisAsMe():Promise<void>{
    const person = this.quickPerson();
    if(!person || this.viewerPerson() || this.personClaimBusy() || this.store.tutorialActive())return;
    if(!window.confirm('Apakah '+person.name+' benar-benar profil Anda? Tautkan akun login dengan profil ini?'))return;
    this.personClaimBusy.set(true);
    this.personClaimError.set('');
    try {
      const uid = await this.identity.claimSelf(this.store.tree().id, person.id);
      this.viewerUserId.set(uid);
      this.store.reflectPersonClaim(person.id,uid);
    } catch(error) {
      this.personClaimError.set(error instanceof Error ? error.message : 'Gagal menautkan profil.');
    } finally { this.personClaimBusy.set(false); }
  }

  async unlinkMyPerson():Promise<void>{
    const person = this.quickPerson();
    if(!person || person.id!==this.viewerPerson()?.id || this.personClaimBusy() || this.store.tutorialActive())return;
    if(!window.confirm('Putuskan tautan akun dengan '+person.name+'? Data silsilah tidak dihapus.'))return;
    this.personClaimBusy.set(true);
    this.personClaimError.set('');
    try {
      await this.identity.unlinkSelf(this.store.tree().id,person.id);
      this.store.reflectPersonClaim(person.id,null);
    } catch(error) {
      this.personClaimError.set(error instanceof Error ? error.message : 'Gagal memutus tautan profil.');
    } finally { this.personClaimBusy.set(false); }
  }

  closeExplorer():void {
    // Preserve the same canvas center when the desktop inspector column disappears.
    const viewport=this.canvasWindow?.nativeElement;
    const previousWidth=viewport?.clientWidth ?? 0;
    this.quickPersonId.set(null);
    if(viewport && previousWidth){
      requestAnimationFrame(() => {
        const change=viewport.clientWidth-previousWidth;
        if(change) this.panX.update(x => x+change/2);
      });
    }
    this.explorerHistory.set([]);
    this.explorerUnavailableTarget.set(null);
    this.explorerBranchError.set(false);
    this.personClaimError.set('');
  }

  private centerExplorerPerson(id:string):void {
    const nodes=this.layout().nodes;
    const node=nodes.find(n=>n.person.id===id);
    const viewport=this.canvasWindow?.nativeElement;
    if(!node||!viewport)return;
    const width=viewport.clientWidth,height=viewport.clientHeight;
    if(!width||!height)return;
    this.viewportSize.set({width,height});

    // Tablet inspector overlays the right edge rather than consuming a grid column.
    // Center the inspected person in the unobscured part of the canvas.
    let clearWidth=width;
    const panel=this.explorerPanel?.nativeElement;
    if(panel && !this.isExplorerPopup()){
      const viewRect=viewport.getBoundingClientRect();
      const panelRect=panel.getBoundingClientRect();
      if(panelRect.left>viewRect.left+80 && panelRect.left<viewRect.right &&
         panelRect.right>viewRect.left && panelRect.top<viewRect.bottom &&
         panelRect.bottom>viewRect.top){
        clearWidth=Math.max(180,panelRect.left-viewRect.left-12);
      }
    }

    const z=this.store.zoom();
    let worldX=node.x+CANVAS_CARD_WIDTH/2;
    const spouses=this.store.relationsFor(id).partners
      .map(partnerId=>nodes.find(n=>n.person.id===partnerId))
      .filter((n):n is typeof node=>!!n && n.y===node.y);
    if(spouses.length){
      const minX=Math.min(node.x,...spouses.map(n=>n.x));
      const maxX=Math.max(node.x,...spouses.map(n=>n.x))+CANVAS_CARD_WIDTH;
      if((maxX-minX)*z<clearWidth-28)worldX=(minX+maxX)/2;
    }

    this.panX.set(clearWidth/2-worldX*z);
    this.panY.set(height/2-(node.y+CANVAS_CARD_HEIGHT/2)*z);
  }

  /** Navigate within the inspected graph without resetting the tree's focus. */
  exploreRelative(id:string):void {
    const from=this.quickPersonId();
    if(!from||from===id||!this.store.findPerson(id))return;
    if(!this.tryRevealRelative(from,id)){
      this.explorerUnavailableTarget.set(id);
      return;
    }
    this.explorerHistory.update(history=>[...history,from]);
    this.activateExplorerPerson(id);
  }

  private activateExplorerPerson(id:string):void {
    this.store.select(id);
    this.quickPersonId.set(id);
    this.explorerUnavailableTarget.set(null);
    this.explorerBranchError.set(false);
    this.personClaimError.set('');
    this.helpOpen.set(false);
    requestAnimationFrame(()=>this.centerExplorerPerson(id));
  }

  backExplorerPerson():void {
    const history=this.explorerHistory();
    if(!history.length)return;
    const previous=history[history.length-1];
    const current=this.quickPersonId();
    if(!this.store.findPerson(previous))return;
    if(!this.store.visiblePersonIds().has(previous) &&
       (!current || !this.tryRevealRelative(current,previous))){
      this.explorerUnavailableTarget.set(previous);
      return;
    }
    this.explorerHistory.set(history.slice(0,-1));
    this.activateExplorerPerson(previous);
  }

  /**
   * First try to reveal the selected relative through an existing branch.
   * Never switch the focus implicitly, even when the target cannot be shown.
   */
  private tryRevealRelative(from:string,target:string):boolean {
    if(this.store.visiblePersonIds().has(target))return true;
    if(this.store.mode()!=='focus'||!this.store.visiblePersonIds().has(from))return false;
    const relatedBranches=this.store.branchOptions(from)
      .filter(option=>this.store.branchMembers(option.key).includes(target));
    for(const branch of relatedBranches){
      for(let attempt=0;attempt<16&&!this.store.visiblePersonIds().has(target);attempt++){
        const before=this.store.hiddenBranchCount(branch.key);
        if(before===0)break;
        this.toggleBranchOrSwitchOrigin(branch.key,from);
        const after=this.store.hiddenBranchCount(branch.key);
        if(after>=before)break; // Unreachable owners: do not loop indefinitely.
      }
      if(this.store.visiblePersonIds().has(target))return true;
    }
    return false;
  }

  expandExplorerBranch(key:string,anchor:string):void {
    const before=this.store.hiddenBranchCount(key);
    if(before<=0)return;
    this.keepAnchor(anchor,()=>this.toggleBranchOrSwitchOrigin(key,anchor));
    this.explorerBranchError.set(this.store.hiddenBranchCount(key)===before);
    this.explorerUnavailableTarget.set(null);
    this.tutorialRecord('branch',{key,open:this.store.isBranchOpen(key)});
  }

  selectPerson(id: string): void {
    if (Date.now() < this.suppressClickUntil) return;
    this.store.select(id);
    this.explorerHistory.set([]);
    this.activateExplorerPerson(id);
    this.helpOpen.set(false);
    this.mobileListOpen.set(false);
    this.tutorialRecord('card',{id});
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
    this.drawerExpanded.set(false);
    this.detailsOpen.set(true);
  }

  closePersonDrawer():void {
    this.detailsOpen.set(false);
    this.drawerExpanded.set(false);
    this.drawerStart=null;
    this.tutorialRecord('return');
  }

  toggleDrawerExpanded():void {
    // A swipe may generate a click on the grab button after pointerup.
    // Do not let that browser click immediately reverse the drag gesture.
    if(performance.now()<this.suppressDrawerGrabClickUntil)return;
    this.drawerExpanded.update(expanded=>!expanded);
  }

  onDrawerGrabDown(event:PointerEvent):void {
    if(window.innerWidth>650 || (event.pointerType==='mouse' && event.button!==0))return;
    this.drawerStart={pointerId:event.pointerId,y:event.clientY};
    this.drawerGestureHandled=false;
    // Keep pointerup even when the finger moves outside the narrow handle.
    // Synthetic events have no active pointer and cannot be captured.
    try { (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId); }
    catch { /* Ignore capture failure for synthetic test events. */ }
  }

  onDrawerGrabMove(event:PointerEvent):void {
    if(!this.drawerStart||event.pointerId!==this.drawerStart.pointerId||this.drawerGestureHandled)return;
    const delta=event.clientY-this.drawerStart.y;
    if(delta>=-36 && delta<=65)return;
    // Commit the gesture while moving. Pointerup may leave the drag region
    // or be intercepted by the browser after implicit pointer capture.
    this.drawerGestureHandled=true;
    this.suppressDrawerGrabClickUntil=performance.now()+420;
    if(delta<-36)this.drawerExpanded.set(true);
    else if(this.drawerExpanded())this.drawerExpanded.set(false);
    else this.closePersonDrawer();
  }

  onDrawerGrabUp(event:PointerEvent):void {
    if(!this.drawerStart||event.pointerId!==this.drawerStart.pointerId)return;
    if(!this.drawerGestureHandled)this.onDrawerGrabMove(event);
    this.drawerStart=null;
    this.drawerGestureHandled=false;
  }

  onDrawerGrabCancel():void {
    this.drawerStart=null;
    this.drawerGestureHandled=false;
  }

  // Pointer capture is best-effort; if the swipe ends outside the drawer,
  // finish it via document instead of losing the gesture.
  @HostListener('document:pointerup', ['$event'])
  onDrawerDocumentPointerUp(event: PointerEvent): void {
    if(this.drawerStart)this.onDrawerGrabUp(event);
  }

  onDrawerShadeClick():void {
    // Releasing an upward drag over the backdrop must not close the sheet.
    if(performance.now()>=this.suppressDrawerGrabClickUntil)this.closePersonDrawer();
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

  quickDirections(id:string):readonly {
    key:string;label:string;symbol:string;hidden:number
  }[] {
    if(this.store.mode()!=='focus')return [];
    return this.store.branchOptions(id)
      .filter(branch=>branch.hidden>0)
      .map(branch=>({
        key:branch.key,label:branch.title,hidden:branch.hidden,
        symbol:branch.kind==='up'?'↑':branch.kind==='side'?'↔':'↓'
      }));
  }

  async createNewTree(): Promise<void> {
    if (!window.confirm('Buat Family Tree baru di database? Pohon lama tetap tersimpan. Ekspor JSON jika ingin cadangan.')) return;
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
    this.tutorialRecord('mode',{mode});
    requestAnimationFrame(() => this.fitThenFocus());
  }

  /** An inactive spouse's ancestor/sibling expansion opens their birth family instead. */
  private toggleBranchOrSwitchOrigin(key: string, anchorId: string): void {
    if ((key.startsWith('side:') || key.startsWith('up:')) &&
        this.store.switchFamilyOrigin(anchorId)) return;
    this.store.toggleBranch(key);
  }

  switchFamilyOrigin(id: string): void {
    if (this.store.mode() !== 'focus') return;
    this.keepAnchor(this.store.focusPersonId(), () => this.store.switchFamilyOrigin(id));
    this.explorerUnavailableTarget.set(null);
    this.explorerBranchError.set(false);
  }

  toggleBranch(key: string, anchorId: string): void {
    this.quickPersonId.set(null);
    this.keepAnchor(anchorId, () => this.toggleBranchOrSwitchOrigin(key,anchorId));
    this.tutorialRecord('branch',{key,open:this.store.isBranchOpen(key)});
  }
  collapseBranch(key: string, anchorId: string): void {
    this.quickPersonId.set(null);
    this.keepAnchor(anchorId, () => this.store.collapseBranch(key));
    this.tutorialRecord('branch',{key,open:this.store.isBranchOpen(key)});
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
    // Desktop: show readable cards by default, instead of shrinking Focus to 78%.
    // Large graphs still use fitCanvas() for the explicit Fit action.
    const width = viewport.clientWidth;
    const z = width <= 650 ? 0.88 : width <= 900 ? 0.92
      : width < 1150 ? 1.0 : width < 1600 ? 1.08 : 1.15;
    this.store.setZoom(z);
    this.panX.set(viewport.clientWidth/2 - (person.x + CANVAS_CARD_WIDTH/2)*z);
    this.panY.set(viewport.clientHeight/2 - (person.y + CANVAS_CARD_HEIGHT/2)*z);
  }

  fitCanvasFromToolbar(): void {
    this.fitCanvas();
    this.tutorialRecord('fit');
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
    this.zoomAt(this.store.zoom() * (delta > 0 ? 1.23 : 1/1.23), el.clientWidth / 2, el.clientHeight / 2);
    this.tutorialRecord('zoom');
  }

  onWheel(event: WheelEvent): void {
    if (!this.canvasWindow) return;
    event.preventDefault();
    const rect = this.canvasWindow.nativeElement.getBoundingClientRect();
    const factor = event.deltaY < 0 ? 1.12 : 1/1.12;
    this.zoomAt(this.store.zoom() * factor, event.clientX - rect.left, event.clientY - rect.top);
    this.tutorialRecord('zoom');
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
      this.suppressClickUntil=Date.now()+500;
    } else if (this.pointers.size===1 && this.panGesture) {
      const [point]=this.pointers.values();
      const dx=point.x-this.panGesture.startX,dy=point.y-this.panGesture.startY;
      if (Math.hypot(dx,dy)>16) {
        this.panGesture.moved=true;
        this.suppressClickUntil=Date.now()+250;
      }
      this.panX.set(this.panGesture.startPanX+dx);
      this.panY.set(this.panGesture.startPanY+dy);
    }
  }
  onPointerUp(event: PointerEvent): void {
    if (!this.pointers.has(event.pointerId)) return;
    const wasPinch=this.pointers.size>1;
    const gesture=this.panGesture;
    const tapId=event.type==='pointerup' && this.pointers.size===1
      && gesture && !gesture.moved ? gesture.tapId : null;
    this.pointers.delete(event.pointerId);
    if (tapId) {
      // Canvas has pointer capture. Resolve the original tapped node manually.
      this.suppressClickUntil=Date.now()+450;
      this.explorerHistory.set([]);
        this.activateExplorerPerson(tapId);
      this.tutorialRecord('card',{id:tapId});
    }
    if (wasPinch) this.tutorialRecord('zoom');
    else if (gesture?.moved) this.tutorialRecord('pan');
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
    this.closeExplorer();
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
        const id=this.dialogPersonId();
        await this.store.updatePerson(id,details);
        this.tutorialRecord('person-save',{
          operation:'edit',id,birthOrder:details.birthOrder,notes:details.notes
        });
      } else {
        const {birthDate,birthOrder}=details;
        const draft={name,gender,birthDate,birthOrder,relationTo,
          targetId:this.dialogTargetId()};
        if(this.dialogPartnerId()) {
          await this.store.addChildToCouple(this.dialogTargetId(),this.dialogPartnerId(),draft,details);
          this.dialogPartnerId.set('');
        } else {
          await this.store.addPerson(draft,details);
        }
        this.tutorialRecord('person-save',{operation:'create',relation:relationTo});
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
      if (!window.confirm('Impor '+parsed.people.length+' anggota menjadi Family Tree baru di Supabase? Pohon sebelumnya tidak akan dihapus.')) return;
      await this.store.importTree(parsed);
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
