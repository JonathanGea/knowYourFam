import { computed, inject, Injectable, signal } from '@angular/core';
import { FamilyTreeRepository, FAMILY_TREE_REPOSITORY } from '../domain/family-tree.repository';
import { BranchKind, FamilyRelationship, FamilyTree, Person, PersonDraft, RelationKind } from '../domain/family-tree.model';
import { MAIN_SAMPLE_TREE } from '../infrastructure/main-sample.data';
import { MAIN_REFERENCE_TREE } from '../infrastructure/main-reference.data';
import { addRelation, archivePerson, createPerson, editPerson, linkChildToCouple as linkCouple,
  renameFamilyTree, unlinkRelation, PersonDetails } from './family-graph';

export const BRANCH_PAGE_SIZE = 12;
type BranchOption = { key: string; kind: BranchKind; title: string; count: number; open: boolean; hidden: number };

@Injectable({ providedIn: 'root' })
export class FamilyTreeStore {
  private readonly repository: FamilyTreeRepository = inject(FAMILY_TREE_REPOSITORY);
  readonly tree = signal<FamilyTree>({ id: 'loading', name: 'Memuat keluarga...', people: [], relationships: [] });
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly focusPersonId = signal('');
  readonly selectedPersonId = signal('');
  readonly mode = signal<'focus' | 'overview'>('focus');
  readonly searchTerm = signal('');
  readonly zoom = signal(1);
  /** Manually expanded branches and pagination. Default focus branches are implicit. */
  readonly expandedBranches = signal<Readonly<Record<string, number>>>({});
  /** Every default-open direction can be independently collapsed. */
  readonly collapsedBranches = signal<ReadonlySet<string>>(new Set());
  readonly focusHistory = signal<readonly string[]>([]);
  readonly tutorialActive = signal(false);
  private tutorialOriginal: { tree: FamilyTree; focus: string; selected: string; mode: 'focus'|'overview' } | null = null;

  readonly people = computed(() => this.tree().people.filter(person => !person.deletedAt));
  readonly relationships = computed(() => {
    const ids = new Set(this.people().map(person => person.id));
    return this.tree().relationships.filter(r => !r.deletedAt && ids.has(r.fromId) && ids.has(r.toId));
  });
  readonly selectedPerson = computed(() => this.findPerson(this.selectedPersonId()));
  readonly focusPerson = computed(() => this.findPerson(this.focusPersonId()));
  readonly filteredPeople = computed(() => {
    const query = this.searchTerm().trim().toLocaleLowerCase('id');
    return this.people().filter(p => !query || p.name.toLocaleLowerCase('id').includes(query))
      .slice().sort((a, b) => a.name.localeCompare(b.name, 'id'));
  });
  readonly defaultBranchKeys = computed(() => this.focusDefaultKeys(this.focusPersonId()));

  constructor() { void this.initialize(); }

  private async initialize(): Promise<void> {
    try {
      const tree = await this.repository.load();
      this.tree.set(tree);
      const first = tree.people.find(person => person.claimed)?.id ?? tree.people.find(person => person.id === 'p7')?.id ?? tree.people.find(person => person.id === 'rudi')?.id ?? tree.people[0]?.id ?? '';
      this.focusPersonId.set(first);
      this.selectedPersonId.set(first);
    } catch {
      this.loadError.set('Gagal memuat data pohon keluarga.');
    } finally {
      this.loading.set(false);
    }
  }

  findPerson(id: string): Person | undefined { return this.people().find(p => p.id === id); }

  relationsFor(id: string): { parents: string[]; children: string[]; partners: string[]; siblings: string[] } {
    const rows = this.relationships();
    const parents = rows.filter(r => r.kind === 'parent' && r.toId === id).map(r => r.fromId);
    const children = rows.filter(r => r.kind === 'parent' && r.fromId === id).map(r => r.toId);
    const partners = rows.filter(r => r.kind === 'partner' && (r.toId === id || r.fromId === id))
      .map(r => r.fromId === id ? r.toId : r.fromId);
    const siblings = new Set(rows.filter(r => r.kind === 'sibling' && (r.toId === id || r.fromId === id))
      .map(r => r.fromId === id ? r.toId : r.fromId));
    for (const parent of parents) {
      for (const sibling of rows.filter(r => r.kind === 'parent' && r.fromId === parent && r.toId !== id)) {
        siblings.add(sibling.toId);
      }
    }
    return { parents, children, partners, siblings: [...siblings] };
  }

  private pairKey(a: string, b: string): string {
    return 'pair:' + [a, b].sort().map(encodeURIComponent).join('|');
  }
  private pairKeys(id: string): string[] {
    return this.relationsFor(id).partners
      .filter(p => this.sharedChildren(id, p).length > 0)
      .map(p => this.pairKey(id, p));
  }
  private sharedChildren(a: string, b: string): string[] {
    const mine = new Set(this.relationsFor(a).children);
    return this.relationsFor(b).children.filter(id => mine.has(id));
  }
  private soloChildren(id: string): string[] {
    const shared = new Set(this.relationsFor(id).partners.flatMap(p => this.sharedChildren(id, p)));
    return this.relationsFor(id).children.filter(child => !shared.has(child));
  }

  branchKeys(personId: string): string[] {
    return ['up:' + encodeURIComponent(personId), 'side:' + encodeURIComponent(personId),
      'down:' + encodeURIComponent(personId), ...this.pairKeys(personId)];
  }

  private branchKeyPersonIds(key: string): string[] {
    const colon = key.indexOf(':');
    if (colon < 0) return [];
    return key.startsWith('pair:') ? key.slice(colon + 1).split('|').map(decodeURIComponent)
      : [decodeURIComponent(key.slice(colon + 1))];
  }

  branchMembers(key: string): string[] {
    const colon = key.indexOf(':');
    if (colon < 0) return [];
    const kind = key.slice(0, colon) as BranchKind;
    const ids = kind === 'pair'
      ? key.slice(colon + 1).split('|').map(decodeURIComponent)
      : [decodeURIComponent(key.slice(colon + 1))];
    const id = ids[0];
    if (!this.findPerson(id)) return [];
    const rel = this.relationsFor(id);
    let members: string[] = [];
    if (kind === 'up') members = rel.parents;
    if (kind === 'side') members = [...rel.siblings, ...rel.siblings.flatMap(s => this.relationsFor(s).partners)];
    if (kind === 'down') members = this.soloChildren(id);
    if (kind === 'pair' && ids.length === 2 && rel.partners.includes(ids[1])) {
      members = [...ids, ...this.sharedChildren(ids[0], ids[1])];
    }
    return [...new Set(members)].filter(p => !!this.findPerson(p));
  }

  private focusDefaultKeys(id: string): ReadonlySet<string> {
    const keys = new Set<string>();
    if (!this.findPerson(id)) return keys;
    const rel = this.relationsFor(id);
    const up = (personId: string) => 'up:' + encodeURIComponent(personId);
    const side = (personId: string) => 'side:' + encodeURIComponent(personId);
    if (rel.parents.length) keys.add(up(id));
    for (const parent of rel.parents) {
      if (this.relationsFor(parent).parents.length) keys.add(up(parent));
      if (this.relationsFor(parent).siblings.length) keys.add(side(parent));
    }
    if (rel.siblings.length) keys.add(side(id));
    if (this.soloChildren(id).length) keys.add('down:' + encodeURIComponent(id));
    for (const key of this.pairKeys(id)) keys.add(key);
    return keys;
  }

  readonly visiblePersonIds = computed<ReadonlySet<string>>(() => {
    const ids = new Set<string>();
    if (this.mode() === 'overview') {
      this.people().forEach(p => ids.add(p.id));
      return ids;
    }
    const focus = this.focusPersonId();
    const rel = this.relationsFor(focus);
    const add = (id: string) => { if (this.findPerson(id)) ids.add(id); };
    add(focus);
    // Focus's partners always visible, but partners' ancestors do not auto-open.
    rel.partners.forEach(add);
    const defaults = this.defaultBranchKeys();
    const closed = this.collapsedBranches();
    const reveal = (key: string) => {
      if (defaults.has(key) && !closed.has(key)) this.branchMembers(key).forEach(add);
    };
    const focusUp = 'up:' + encodeURIComponent(focus);
    reveal(focusUp);
    if (!closed.has(focusUp)) {
      for (const parent of rel.parents) {
        reveal('up:' + encodeURIComponent(parent));
        reveal('side:' + encodeURIComponent(parent));
      }
    }
    reveal('side:' + encodeURIComponent(focus));
    reveal('down:' + encodeURIComponent(focus));
    for (const key of this.pairKeys(focus)) reveal(key);
    // An expanded branch opens only if its owner(s) are currently reachable.
    // Nested expansions are traversed in iterations, without leaking hidden
    // relatives when an ancestor branch is collapsed.
    let changed = true;
    while (changed) {
      changed = false;
      for (const [key, page] of Object.entries(this.expandedBranches())) {
        if (closed.has(key)) continue;
        const endpoints = this.branchKeyPersonIds(key);
        if (!endpoints.length || !endpoints.every(id => ids.has(id))) continue;
        for (const personId of this.branchMembers(key).slice(0, page)) {
          if (!ids.has(personId)) { ids.add(personId); changed = true; }
        }
      }
    }
    return ids;
  });

  readonly visiblePeople = computed(() => this.people().filter(p => this.visiblePersonIds().has(p.id)));
  readonly visibleRelationships = computed(() => this.relationships().filter(
    r => this.visiblePersonIds().has(r.fromId) && this.visiblePersonIds().has(r.toId)
  ));

  isBranchOpen(key: string): boolean {
    if (this.mode() !== 'focus' || this.collapsedBranches().has(key)) return false;
    return this.defaultBranchKeys().has(key) || this.expandedBranches()[key] !== undefined;
  }
  hiddenBranchCount(key: string): number {
    const visible = this.visiblePersonIds();
    return this.branchMembers(key).filter(id => !visible.has(id)).length;
  }
  branchOptions(id: string): BranchOption[] {
    if (this.mode() !== 'focus') return [];
    const labels: Record<BranchKind, string> = {
      up: 'Orang tua', side: 'Saudara & pasangannya', down: 'Anak langsung', pair: 'Anak bersama pasangan'
    };
    return this.branchKeys(id).filter(key => this.branchMembers(key).length).map(key => {
      const kind = key.slice(0, key.indexOf(':')) as BranchKind;
      const partner = kind === 'pair' ? key.slice(5).split('|').map(decodeURIComponent)
        .find(p => p !== id) : undefined;
      return {
        key, kind, title: kind === 'pair' && partner ? 'Anak bersama ' + (this.findPerson(partner)?.name ?? '')
          : labels[kind],
        count: this.branchMembers(key).length,
        open: this.isBranchOpen(key),
        hidden: this.hiddenBranchCount(key)
      };
    });
  }

  toggleBranch(key: string): void {
    const current = this.isBranchOpen(key);
    if (!this.branchMembers(key).length) return;
    if (!current) {
      const closed = new Set(this.collapsedBranches());
      closed.delete(key);
      this.collapsedBranches.set(closed);
      if (!this.defaultBranchKeys().has(key)) this.expandedBranches.update(b => ({ ...b, [key]: BRANCH_PAGE_SIZE }));
      return;
    }
    if (this.hiddenBranchCount(key) > 0 && !this.defaultBranchKeys().has(key)) {
      this.expandedBranches.update(b => ({ ...b, [key]: (b[key] ?? BRANCH_PAGE_SIZE) + BRANCH_PAGE_SIZE }));
      return;
    }
    this.collapseBranch(key);
  }
  collapseBranch(key: string): void {
    const closed = new Set(this.collapsedBranches());
    closed.add(key);
    this.collapsedBranches.set(closed);
    const expanded = { ...this.expandedBranches() };
    delete expanded[key];

    // Same principle as main.closeDirectionalBranch(): remove descendants
    // whose owners are no longer reachable from the default focused graph
    // or any other still-reachable manually expanded branch.
    const retained = new Set<string>();
    const initial = this.focusBaseMembers(closed);
    for (const id of initial) retained.add(id);
    let changed = true;
    while (changed) {
      changed = false;
      for (const [branch, limit] of Object.entries(expanded)) {
        const endpoints = this.branchKeyPersonIds(branch);
        if (!endpoints.length || !endpoints.every(id => retained.has(id))) continue;
        for (const id of this.branchMembers(branch).slice(0, limit)) {
          if (!retained.has(id)) { retained.add(id); changed = true; }
        }
      }
    }
    for (const branch of Object.keys(expanded)) {
      if (!this.branchKeyPersonIds(branch).every(id => retained.has(id))) delete expanded[branch];
    }
    this.expandedBranches.set(expanded);
  }

  private focusBaseMembers(closed: ReadonlySet<string>): Set<string> {
    const ids = new Set<string>();
    const id = this.focusPersonId();
    const add = (p: string) => { if (this.findPerson(p)) ids.add(p); };
    add(id);
    const rel = this.relationsFor(id);
    rel.partners.forEach(add);
    const defaults = this.defaultBranchKeys();
    const reveal = (key: string) => {
      if (!closed.has(key) && defaults.has(key)) this.branchMembers(key).forEach(add);
    };
    const up = 'up:' + encodeURIComponent(id);
    reveal(up);
    if (!closed.has(up)) {
      for (const p of rel.parents) {
        reveal('up:' + encodeURIComponent(p));
        reveal('side:' + encodeURIComponent(p));
      }
    }
    reveal('side:' + encodeURIComponent(id));
    reveal('down:' + encodeURIComponent(id));
    this.pairKeys(id).forEach(reveal);
    return ids;
  }

  resetBranches(): void {
    this.expandedBranches.set({});
    this.collapsedBranches.set(new Set());
  }

  goBackFocus(): string | null {
    const history = this.focusHistory();
    if (!history.length) return null;
    const previous = history[history.length - 1];
    this.focusHistory.set(history.slice(0, -1));
    this.setFocus(previous, true);
    return previous;
  }

  setFocus(id: string, fromHistory = false): void {
    if (!this.findPerson(id)) return;
    const previous = this.focusPersonId();
    if (!fromHistory && previous && previous !== id) this.focusHistory.update(h => [...h, previous]);
    this.focusPersonId.set(id);
    this.selectedPersonId.set(id);
    this.mode.set('focus');
    this.resetBranches();
  }
  select(id: string): void { if (this.findPerson(id)) this.selectedPersonId.set(id); }
  setMode(mode: 'focus' | 'overview'): void { this.mode.set(mode); }
  setSearch(term: string): void { this.searchTerm.set(term); }
  setZoom(value: number): void {
    this.zoom.set(Math.min(2.5, Math.max(0.004, Math.round(value * 100000) / 100000)));
  }
  changeZoom(delta: number): void { this.setZoom(this.zoom() + delta); }
  resetZoom(): void { this.setZoom(1); }

  /**
   * Offline demo mutations. These deliberately DO NOT implement the collaborative
   * permission policy; production writes must use an authenticated backend.
   */
  private async persist(next: FamilyTree): Promise<void> {
    // Tutorial mutations must NEVER reach the user's browser storage.
    if (!this.tutorialActive()) await this.repository.save(next);
    this.tree.set(next);
  }

  startTutorialTree(): void {
    if (this.tutorialActive()) return;
    this.tutorialOriginal = {
      tree:this.tree(),focus:this.focusPersonId(),selected:this.selectedPersonId(),mode:this.mode()
    };
    this.tutorialActive.set(true);
    this.tree.set(structuredClone(MAIN_SAMPLE_TREE));
    const first = MAIN_SAMPLE_TREE.people.find(p => p.claimed)?.id ?? MAIN_SAMPLE_TREE.people[0]?.id ?? '';
    this.focusPersonId.set(first);
    this.selectedPersonId.set(first);
    this.mode.set('focus');
    this.focusHistory.set([]);
    this.resetBranches();
  }

  endTutorialTree(): void {
    const original = this.tutorialOriginal;
    if (!original) return;
    this.tree.set(original.tree);
    this.focusPersonId.set(original.focus);
    this.selectedPersonId.set(original.selected);
    this.mode.set(original.mode);
    this.tutorialActive.set(false);
    this.tutorialOriginal = null;
    this.focusHistory.set([]);
    this.resetBranches();
  }

  async addPerson(draft: PersonDraft, details?: Partial<Person>): Promise<Person> {
    const {tree, person} = createPerson(this.tree(), draft, details);
    await this.persist(tree);
    this.setFocus(person.id);
    return person;
  }

  async updatePerson(id: string, details: PersonDetails): Promise<void> {
    await this.persist(editPerson(this.tree(), id, details));
  }

  async linkExisting(source: string, target: string, relation: 'parent'|'child'|'partner'|'sibling'): Promise<void> {
    const kind: RelationKind = relation === 'child' || relation === 'parent' ? 'parent' : relation;
    const from = relation === 'child' ? source : target;
    const to = relation === 'child' ? target : source;
    await this.persist(addRelation(this.tree(), from, to, kind));
  }

  async linkChildToCouple(parentA: string, parentB: string, childId: string): Promise<void> {
    await this.persist(linkCouple(this.tree(), parentA, parentB, childId));
  }

  async unlinkRelationship(relationId: string): Promise<void> {
    await this.persist(unlinkRelation(this.tree(), relationId));
  }

  async deletePersonDemo(personId: string): Promise<number> {
    const { tree, affectedRelationships } = archivePerson(this.tree(), personId);
    await this.persist(tree);
    if (this.focusPersonId() === personId) {
      this.focusHistory.set([]);
      const first = this.people()[0]?.id ?? '';
      this.focusPersonId.set(first);
      this.selectedPersonId.set(first);
      this.resetBranches();
    } else if (this.selectedPersonId() === personId) {
      this.selectedPersonId.set(this.focusPersonId());
    }
    return affectedRelationships;
  }

  async renameTree(name: string): Promise<void> {
    await this.persist(renameFamilyTree(this.tree(), name));
  }
  /** Mirrors main.mergeTestingMembers() without replacing an existing family. */
  async mergeTestMembers(): Promise<{ persons: number; relationships: number }> {
    if (this.tutorialActive()) throw new Error('Selesaikan tutorial terlebih dahulu.');
    const tree = this.tree();
    const existing = new Set(tree.people.map(p => p.id));
    const additions = MAIN_REFERENCE_TREE.people.filter(
      p => p.id.startsWith('uji-') && !existing.has(p.id)
    );
    const allIds = new Set([...existing, ...additions.map(p => p.id)]);
    const allEdges = new Set(tree.relationships.map(r =>
      r.kind + ':' + (r.kind === 'parent' ? r.fromId + '>' + r.toId
        : [r.fromId, r.toId].sort().join('|'))));
    const links = MAIN_REFERENCE_TREE.relationships.filter(r => {
      if (!r.fromId.startsWith('uji-') && !r.toId.startsWith('uji-')) return false;
      if (!allIds.has(r.fromId) || !allIds.has(r.toId)) return false;
      const key = r.kind + ':' + (r.kind === 'parent' ? r.fromId + '>' + r.toId
        : [r.fromId, r.toId].sort().join('|'));
      if (allEdges.has(key)) return false;
      allEdges.add(key);
      return true;
    });
    if (additions.length || links.length) {
      await this.persist({
        ...tree,
        people: [...tree.people, ...additions],
        relationships: [...tree.relationships, ...links]
      });
    }
    return { persons: additions.length, relationships: links.length };
  }

  async createEmptyTree(name = 'Keluarga Saya'): Promise<void> {
    if (this.tutorialActive()) throw new Error('Selesaikan tutorial terlebih dahulu.');
    const next: FamilyTree = {
      id: crypto.randomUUID(), name, people: [], relationships: []
    };
    await this.persist(next);
    this.focusPersonId.set('');
    this.selectedPersonId.set('');
    this.focusHistory.set([]);
    this.mode.set('focus');
    this.resetBranches();
  }


  /** One direct edge only. Inferred sibling links have no edge to delete. */
  directRelationship(from: string, to: string, kind: RelationKind): FamilyRelationship | undefined {
    return this.relationships().find(r => r.kind === kind &&
      (r.fromId === from && r.toId === to || kind !== 'parent' && r.fromId === to && r.toId === from));
  }

  async importDemoTree(next: FamilyTree): Promise<void> {
    if (this.tutorialActive()) throw new Error('Tutup tutorial sebelum mengimpor data.');
    const previous=this.tree();
    this.tree.set(next);
    try { await this.repository.save(next); }
    catch(error) { this.tree.set(previous); throw error; }
    this.focusHistory.set([]);
    const first=next.people.find(p=>p.claimed)?.id ?? next.people.find(p=>p.id==='p7')?.id ??
      next.people[0]?.id ?? '';
    if (first) this.setFocus(first,true);
    else {
      this.focusPersonId.set('');
      this.selectedPersonId.set('');
      this.resetBranches();
    }
  }

  exportLegacyJson(): string {
    const tree=this.tree();
    const active=this.people();
    const relationships=this.relationships();
    return JSON.stringify({
      version:1, treeName:tree.name, isDemo:this.tutorialActive(),
      people:active.map(person => ({
        id:person.id,name:person.name,gender:person.gender,
        birth:person.birthDate ?? '',death:person.deathDate ?? '',
        birthOrder:person.birthOrder,photo:person.photo ?? '',
        nickname:person.nickname ?? '',birthPlace:person.birthPlace ?? '',
        residence:person.residence ?? '',occupation:person.occupation ?? '',
        notes:person.notes ?? '',self:person.claimed
      })),
      parent:relationships.filter(r=>r.kind==='parent').map(r=>[r.fromId,r.toId]),
      partner:relationships.filter(r=>r.kind==='partner').map(r=>[r.fromId,r.toId]),
      sibling:relationships.filter(r=>r.kind==='sibling').map(r=>[r.fromId,r.toId])
    }, null, 2);
  }

  exportJson(): string { return JSON.stringify(this.tree(), null, 2); }
}
