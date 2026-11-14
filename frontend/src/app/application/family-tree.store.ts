import { computed, inject, Injectable, signal } from '@angular/core';
import { FamilyTreeRepository, FAMILY_TREE_REPOSITORY } from '../domain/family-tree.repository';
import { BranchKind, FamilyRelationship, FamilyTree, Person, PersonDraft, RelationKind } from '../domain/family-tree.model';

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

  readonly people = computed(() => this.tree().people);
  readonly relationships = computed(() => this.tree().relationships);
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
      const first = tree.people.find(person => person.id === 'rudi')?.id ?? tree.people[0]?.id ?? '';
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
    for (const [key, page] of Object.entries(this.expandedBranches())) {
      if (!closed.has(key)) this.branchMembers(key).slice(0, page).forEach(add);
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
    this.expandedBranches.set(expanded);
  }

  setFocus(id: string): void {
    if (!this.findPerson(id)) return;
    this.focusPersonId.set(id);
    this.selectedPersonId.set(id);
    this.mode.set('focus');
    this.expandedBranches.set({});
    this.collapsedBranches.set(new Set());
  }
  select(id: string): void { if (this.findPerson(id)) this.selectedPersonId.set(id); }
  setMode(mode: 'focus' | 'overview'): void { this.mode.set(mode); }
  setSearch(term: string): void { this.searchTerm.set(term); }
  setZoom(value: number): void {
    this.zoom.set(Math.min(2, Math.max(0.12, Math.round(value * 1000) / 1000)));
  }
  changeZoom(delta: number): void { this.setZoom(this.zoom() + delta); }
  resetZoom(): void { this.setZoom(1); }

  /** Demo-only CRUD. Authorization is not enforced until the real backend is integrated. */
  async addPerson(draft: PersonDraft): Promise<Person> {
    const name = draft.name.trim().slice(0, 150);
    if (!name) throw new Error('Nama wajib diisi');
    if (draft.relationTo !== 'none' && (!draft.targetId || !this.findPerson(draft.targetId))) {
      throw new Error('Person tujuan tidak ditemukan');
    }
    const birthDate = draft.birthDate?.trim() || undefined;
    if (birthDate && !/^\\d{4}-\\d{2}-\\d{2}$/.test(birthDate)) throw new Error('Tanggal lahir tidak valid');
    const birthOrder = draft.birthOrder;
    if (birthOrder !== undefined && (!Number.isInteger(birthOrder) || birthOrder < 1 || birthOrder > 999)) {
      throw new Error('Urutan lahir harus 1–999');
    }
    const id = globalThis.crypto.randomUUID();
    const person: Person = { id, name, gender: draft.gender, birthDate, birthOrder, claimed: false };
    const links: FamilyRelationship[] = [];
    if (draft.relationTo !== 'none' && draft.targetId) {
      const relation: Record<Exclude<PersonDraft['relationTo'], 'none'>, {
        kind: RelationKind; fromId: string; toId: string
      }> = {
        parent: { kind: 'parent', fromId: id, toId: draft.targetId },
        child: { kind: 'parent', fromId: draft.targetId, toId: id },
        partner: { kind: 'partner', fromId: draft.targetId, toId: id }
      };
      const r = relation[draft.relationTo];
      links.push({ id: globalThis.crypto.randomUUID(), ...r, status: 'unconfirmed' });
    }
    const oldTree = this.tree();
    const updated: FamilyTree = {
      ...oldTree, people: [...oldTree.people, person], relationships: [...oldTree.relationships, ...links]
    };
    this.tree.set(updated);
    try { await this.repository.save(updated); }
    catch (error) { this.tree.set(oldTree); throw error; }
    this.setFocus(id);
    return person;
  }
  exportJson(): string { return JSON.stringify(this.tree(), null, 2); }
}
