import { computed, inject, Injectable, signal } from '@angular/core';
import { FamilyTreeRepository, FAMILY_TREE_REPOSITORY } from '../domain/family-tree.repository';
import {
  BranchKind, FamilyRelationship, FamilyTree, Gender, Person, PersonDraft, RelationKind
} from '../domain/family-tree.model';

@Injectable({ providedIn: 'root' })
export class FamilyTreeStore {
  private readonly repository: FamilyTreeRepository = inject(FAMILY_TREE_REPOSITORY);
  readonly tree = signal<FamilyTree>(this.repository.load());
  readonly focusPersonId = signal<string>('rudi');
  readonly selectedPersonId = signal<string>('rudi');
  readonly mode = signal<'focus' | 'overview'>('focus');
  readonly searchTerm = signal<string>('');
  readonly zoom = signal<number>(1);
  /** branch key -> current page size (12, 24, ...). Visual state only. */
  readonly expandedBranches = signal<Readonly<Record<string, number>>>({});

  readonly people = computed(() => this.tree().people);
  readonly relationships = computed(() => this.tree().relationships);
  readonly selectedPerson = computed(() => this.findPerson(this.selectedPersonId()));
  readonly focusPerson = computed(() => this.findPerson(this.focusPersonId()));
  readonly filteredPeople = computed(() => {
    const query = this.searchTerm().trim().toLocaleLowerCase('id');
    return this.people().filter(p => !query || p.name.toLocaleLowerCase('id').includes(query))
      .slice().sort((a, b) => a.name.localeCompare(b.name, 'id'));
  });

  readonly visiblePersonIds = computed<ReadonlySet<string>>(() => {
    const ids = new Set<string>();
    if (this.mode() === 'overview') {
      this.people().forEach(p => ids.add(p.id));
      return ids;
    }
    const focus = this.focusPersonId();
    const add = (id: string) => { if (this.findPerson(id)) ids.add(id); };
    add(focus);
    const core = this.relationsFor(focus);
    [...core.parents, ...core.partners, ...core.children, ...core.siblings].forEach(add);
    for (const partner of core.partners) {
      const partnerRelations = this.relationsFor(partner);
      [...partnerRelations.parents, ...partnerRelations.siblings].forEach(add);
    }
    for (const [key, limit] of Object.entries(this.expandedBranches())) {
      const colon = key.indexOf(':');
      if (colon < 0) continue;
      const branchKind = key.slice(0, colon) as BranchKind;
      const personId = key.slice(colon + 1);
      if (branchKind !== 'family' && branchKind !== 'origin') continue;
      this.branchPeople(branchKind, personId).slice(0, limit).forEach(add);
    }
    return ids;
  });

  readonly visiblePeople = computed(() => this.people().filter(p => this.visiblePersonIds().has(p.id)));
  readonly visibleRelationships = computed(() => this.relationships().filter(
    r => this.visiblePersonIds().has(r.fromId) && this.visiblePersonIds().has(r.toId)
  ));

  findPerson(id: string): Person | undefined {
    return this.people().find(p => p.id === id);
  }

  relationsFor(id: string): {
    parents: string[]; children: string[]; partners: string[]; siblings: string[]
  } {
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

  branchPeople(kind: BranchKind, personId: string): string[] {
    const relations = this.relationsFor(personId);
    const connected = kind === 'family'
      ? [...relations.partners, ...relations.children]
      : [...relations.parents, ...relations.siblings];
    return [...new Set(connected)].filter(id => this.findPerson(id) !== undefined);
  }

  hiddenBranchCount(kind: BranchKind, id: string): number {
    const visible = this.visiblePersonIds();
    return this.branchPeople(kind, id).filter(p => !visible.has(p)).length;
  }

  isBranchOpen(kind: BranchKind, id: string): boolean {
    return this.expandedBranches()[kind + ':' + id] !== undefined;
  }

  toggleBranch(kind: BranchKind, id: string): void {
    const key = kind + ':' + id;
    const branches = { ...this.expandedBranches() };
    if (!this.isBranchOpen(kind, id)) branches[key] = 12;
    else if (this.hiddenBranchCount(kind, id) > 0) branches[key] += 12;
    else delete branches[key];
    this.expandedBranches.set(branches);
  }

  collapseBranch(kind: BranchKind, id: string): void {
    const branches = { ...this.expandedBranches() };
    delete branches[kind + ':' + id];
    this.expandedBranches.set(branches);
  }

  setFocus(id: string): void {
    if (!this.findPerson(id)) return;
    this.focusPersonId.set(id);
    this.selectedPersonId.set(id);
    this.mode.set('focus');
    this.expandedBranches.set({});
  }

  select(id: string): void {
    if (this.findPerson(id)) this.selectedPersonId.set(id);
  }

  setMode(mode: 'focus' | 'overview'): void {
    this.mode.set(mode);
  }

  setSearch(term: string): void {
    this.searchTerm.set(term);
  }

  changeZoom(delta: number): void {
    this.zoom.update(current => Math.min(1.7, Math.max(0.55, Math.round((current + delta) * 100) / 100)));
  }

  resetZoom(): void { this.zoom.set(1); }

  addPerson(draft: PersonDraft): Person {
    const name = draft.name.trim().slice(0, 150);
    if (!name) throw new Error('Nama wajib diisi');
    if (draft.relationTo !== 'none' && (!draft.targetId || !this.findPerson(draft.targetId))) {
      throw new Error('Person tujuan tidak ditemukan');
    }
    const id = globalThis.crypto.randomUUID();
    const person: Person = { id, name, gender: draft.gender, claimed: false };
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
    const tree = this.tree();
    const updated: FamilyTree = {
      ...tree,
      people: [...tree.people, person],
      relationships: [...tree.relationships, ...links]
    };
    this.tree.set(updated);
    this.repository.save(updated);
    // Make new records discoverable even when their previous relative
    // was selected from the sidebar but not visible in the focused canvas.
    this.setFocus(id);
    return person;
  }

  /** Download is a demo convenience; authorization is NOT enforced by this store. */
  exportJson(): string {
    return JSON.stringify(this.tree(), null, 2);
  }
}
