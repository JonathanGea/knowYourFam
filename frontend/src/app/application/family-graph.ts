import type { FamilyRelationship, FamilyTree, Person, PersonDraft, RelationKind } from '../domain/family-tree.model';

/** Graph operations matching main/index.html but independent of UI or a database. */
function fail(message: string): never { throw new Error(message); }
function activePerson(tree: FamilyTree, id: string): Person {
  return tree.people.find(p => p.id === id && !p.deletedAt) ?? fail('Person tidak ditemukan.');
}
function validDate(input: string | undefined, label: string): string | undefined {
  if (!input) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) fail(label + ' harus format YYYY-MM-DD.');
  const date = new Date(input + 'T12:00:00Z');
  if (!Number.isFinite(date.valueOf()) || date.toISOString().slice(0, 10) !== input) fail(label + ' tidak valid.');
  return input;
}
function normalizedPerson(input: Partial<Person> & Pick<Person, 'name' | 'gender'>): Omit<Person, 'id' | 'claimed'> {
  const name = input.name.trim();
  if (!name || name.length > 150) fail('Nama wajib diisi (maksimal 150 karakter).');
  if (!['male', 'female', 'unknown', 'other'].includes(input.gender)) fail('Jenis kelamin tidak valid.');
  const birthDate = validDate(input.birthDate, 'Tanggal lahir');
  const deathDate = validDate(input.deathDate, 'Tanggal wafat');
  if (birthDate && deathDate && deathDate < birthDate) fail('Tanggal wafat tidak boleh mendahului tanggal lahir.');
  if (input.birthOrder !== undefined && (!Number.isInteger(input.birthOrder) || input.birthOrder < 1 || input.birthOrder > 999)) {
    fail('Urutan lahir harus angka 1–999.');
  }
  if (input.photo && (!/^data:image\/(png|jpeg|webp);base64,/.test(input.photo) || input.photo.length > 250000)) {
    fail('Foto harus PNG, JPEG, atau WebP dan maksimal 250 KB setelah kompresi.');
  }
  return {
    name, gender: input.gender, birthDate, deathDate, birthOrder: input.birthOrder,
    nickname: (input.nickname ?? '').trim().slice(0, 100),
    occupation: (input.occupation ?? '').trim().slice(0, 100),
    residence: (input.residence ?? '').trim().slice(0, 100),
    birthPlace: (input.birthPlace ?? '').trim().slice(0, 100),
    notes: (input.notes ?? '').trim().slice(0, 500),
    photo: input.photo ?? ''
  };
}

export type PersonDetails = Partial<Person> & Pick<Person, 'name' | 'gender'>;

function cycleExists(tree: FamilyTree): boolean {
  const parentsByChild = new Map<string, string[]>();
  for (const r of tree.relationships) {
    if (r.kind !== 'parent' || r.deletedAt) continue;
    parentsByChild.set(r.toId, [...(parentsByChild.get(r.toId) ?? []), r.fromId]);
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const parent of parentsByChild.get(id) ?? []) if (visit(parent)) return true;
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  return tree.people.some(person => !person.deletedAt && visit(person.id));
}

export function addRelation(
  tree: FamilyTree, fromId: string, toId: string, kind: RelationKind
): FamilyTree {
  activePerson(tree, fromId);
  activePerson(tree, toId);
  if (fromId === toId) fail('Pilih dua Person berbeda.');
  if (!['parent', 'partner', 'sibling'].includes(kind)) fail('Tipe hubungan tidak valid.');
  const duplicate = tree.relationships.some(r =>
    !r.deletedAt && r.kind === kind &&
    (r.fromId === fromId && r.toId === toId ||
      kind !== 'parent' && r.fromId === toId && r.toId === fromId)
  );
  if (duplicate) fail('Hubungan sudah tercatat.');
  const edge: FamilyRelationship = {
    id: crypto.randomUUID(), kind, fromId, toId, status: 'unconfirmed'
  };
  const changed: FamilyTree = { ...tree, relationships: [...tree.relationships, edge] };
  if (cycleExists(changed)) fail('Hubungan membentuk siklus leluhur.');
  return changed;
}

export function linkChildToCouple(tree: FamilyTree, a: string, b: string, child: string): FamilyTree {
  activePerson(tree, a);
  activePerson(tree, b);
  activePerson(tree, child);
  if (new Set([a, b, child]).size !== 3) fail('Orang tua dan anak harus tiga Person berbeda.');
  const isPartner = tree.relationships.some(r => !r.deletedAt && r.kind === 'partner' &&
    (r.fromId === a && r.toId === b || r.fromId === b && r.toId === a));
  if (!isPartner) fail('Pasangan orang tua belum tercatat.');
  let updated = tree;
  let added = 0;
  for (const parent of [a, b]) {
    const existing = updated.relationships.some(r => !r.deletedAt && r.kind === 'parent' &&
      r.fromId === parent && r.toId === child);
    if (!existing) {
      updated = addRelation(updated, parent, child, 'parent');
      added++;
    }
  }
  if (!added) fail('Anak sudah terhubung ke kedua orang tua.');
  return updated; // Atomic: the caller persists only after BOTH parent edges are valid.
}

export function createPerson(tree: FamilyTree, draft: PersonDraft, additional?: Partial<Person>): {tree: FamilyTree; person: Person} {
  const person: Person = {
    ...normalizedPerson({ ...additional, ...draft }), id: crypto.randomUUID(), claimed: false
  };
  let updated: FamilyTree = { ...tree, people: [...tree.people, person] };
  if (draft.relationTo !== 'none') {
    const target = draft.targetId ?? fail('Pilih anggota tujuan.');
    const kind: RelationKind = draft.relationTo === 'partner' ? 'partner'
      : draft.relationTo === 'sibling' ? 'sibling' : 'parent';
    const fromId = draft.relationTo === 'parent' ? person.id : target;
    const toId = draft.relationTo === 'child' ? person.id : draft.relationTo === 'parent' ? target : person.id;
    updated = addRelation(updated, fromId, toId, kind);
  }
  return { tree: updated, person };
}

export function editPerson(tree: FamilyTree, id: string, details: PersonDetails): FamilyTree {
  const current = activePerson(tree, id);
  const updated: Person = { ...current, ...normalizedPerson(details) };
  return { ...tree, people: tree.people.map(person => person.id === id ? updated : person) };
}

export function unlinkRelation(tree: FamilyTree, relationshipId: string): FamilyTree {
  const relation = tree.relationships.find(r => r.id === relationshipId && !r.deletedAt)
    ?? fail('Hubungan tidak ditemukan.');
  const at = new Date().toISOString();
  return { ...tree, relationships: tree.relationships.map(r => r === relation ? { ...r, deletedAt: at } : r) };
}

export function archivePerson(tree: FamilyTree, personId: string): {tree: FamilyTree; affectedRelationships: number} {
  activePerson(tree, personId);
  const at = new Date().toISOString();
  const affectedRelationships = tree.relationships.filter(r =>
    !r.deletedAt && (r.fromId === personId || r.toId === personId)).length;
  return {
    tree: {
      ...tree,
      people: tree.people.map(p => p.id === personId ? {...p, deletedAt: at} : p),
      relationships: tree.relationships.map(r =>
        !r.deletedAt && (r.fromId === personId || r.toId === personId) ? {...r, deletedAt: at} : r)
    },
    affectedRelationships
  };
}

export function renameFamilyTree(tree: FamilyTree, name: string): FamilyTree {
  const cleaned = name.trim().slice(0, 120);
  if (!cleaned) fail('Nama pohon keluarga wajib diisi.');
  return { ...tree, name: cleaned };
}
