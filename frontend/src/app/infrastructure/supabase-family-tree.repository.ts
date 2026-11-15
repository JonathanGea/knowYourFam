import { inject, Injectable } from '@angular/core';
import type { FamilyRelationship, FamilyTree, Person, RelationKind } from '../domain/family-tree.model';
import type { FamilyTreeRepository } from '../domain/family-tree.repository';
import { SupabaseConnectionService } from './supabase-connection.service';

type TreeRow = { id: string; client_id: string; title: string };
type PersonRow = {
  id: string; client_id: string; display_name: string; sex: Person['gender'];
  nickname: string | null; sibling_order: number | null;
  birth_date: string | null; death_date: string | null; birth_place: string | null;
  residence: string | null; occupation: string | null; notes: string | null;
  photo_path: string | null; claimed_by: string | null; deleted_at: string | null;
  living_status?: string;
};
type RelationshipRow = {
  id: string; client_id: string; kind: 'parent_child' | 'partner' | 'sibling';
  person_a_id: string; person_b_id: string; status: string; deleted_at: string | null;
};

function assertOk(error: { message: string } | null): void {
  if (error) throw new Error('Supabase: ' + error.message);
}
function fields(person: Person) {
  return {
    display_name: person.name,
    sex: person.gender,
    living_status: person.deathDate ? 'deceased' : 'unknown',
    nickname: person.nickname ?? null,
    sibling_order: person.birthOrder ?? null,
    birth_date: person.birthDate ?? null,
    death_date: person.deathDate ?? null,
    birth_place: person.birthPlace ?? null,
    residence: person.residence ?? null,
    occupation: person.occupation ?? null,
    notes: person.notes ?? null,
    // MVP: compressed data URL; move to private Supabase Storage later.
    photo_path: person.photo ?? null
  };
}
function fromDb(row: PersonRow): Person {
  return {
    id: row.client_id, name: row.display_name, gender: row.sex,
    nickname: row.nickname ?? undefined, birthOrder: row.sibling_order ?? undefined,
    birthDate: row.birth_date ?? undefined, deathDate: row.death_date ?? undefined,
    birthPlace: row.birth_place ?? undefined, residence: row.residence ?? undefined,
    occupation: row.occupation ?? undefined, notes: row.notes ?? undefined,
    photo: row.photo_path ?? undefined, deletedAt: row.deleted_at ?? undefined,
    claimed: row.claimed_by !== null
  };
}

@Injectable()
export class SupabaseFamilyTreeRepository implements FamilyTreeRepository {
  private readonly supabase = inject(SupabaseConnectionService);

  /** Data always comes from Supabase; an unauthenticated call fails closed. */
  async load(): Promise<FamilyTree> {
    const userId = await this.supabase.requireUserId();
    const db = this.supabase.client;
    const treeResult = await db.from('family_trees').select('id,client_id,title')
      .eq('owner_id', userId).order('created_at', { ascending: false }).limit(1);
    assertOk(treeResult.error);
    let tree = (treeResult.data?.[0] ?? null) as TreeRow | null;
    if (!tree) {
      const created = await db.from('family_trees').insert({
        owner_id: userId, client_id: crypto.randomUUID(), title: 'Keluarga Saya'
      }).select('id,client_id,title').single();
      assertOk(created.error);
      tree = created.data as TreeRow;
    }

    const [people, edges, links] = await Promise.all([
      db.from('persons').select(
        'id,client_id,display_name,sex,nickname,sibling_order,birth_date,death_date,birth_place,residence,occupation,notes,photo_path,claimed_by,deleted_at'
      ).eq('tree_id', tree.id),
      db.from('relationships').select(
        'id,client_id,kind,person_a_id,person_b_id,status,deleted_at'
      ).eq('tree_id', tree.id),
      db.from('person_account_links').select('auth_user_id,person_id')
        .eq('auth_user_id',userId)
    ]);
    assertOk(people.error);
    assertOk(edges.error);
    assertOk(links.error);
    const persons = (people.data ?? []) as PersonRow[];
    const byDbId = new Map(persons.map(p => [p.id, p.client_id]));
    const linksByPerson = new Map(((links.data ?? []) as {
      person_id:string; auth_user_id:string
    }[]).map(link => [link.person_id,link.auth_user_id]));
    return {
      id: tree.client_id,
      name: tree.title,
      people: persons.map(row => ({
        ...fromDb(row),
        claimed: !!(linksByPerson.get(row.id) || row.claimed_by),
        claimedBy: linksByPerson.get(row.id) ?? row.claimed_by ?? undefined
      })),
      relationships: ((edges.data ?? []) as RelationshipRow[]).flatMap((r): FamilyRelationship[] => {
        const fromId = byDbId.get(r.person_a_id), toId = byDbId.get(r.person_b_id);
        if (!fromId || !toId) return [];
        const kind: RelationKind = r.kind === 'parent_child' ? 'parent' : r.kind;
        return [{
          id: r.client_id, kind, fromId, toId,
          status: r.status === 'confirmed' || r.status === 'disputed' ? r.status : 'unconfirmed',
          deletedAt: r.deleted_at ?? undefined
        }];
      })
    };
  }

  /** Save a graph diff using client_id to preserve node IDs expected by the canvas.
   * Writes are ordered but not atomic across requests; collaboration comes later.
   */
  async save(next: FamilyTree): Promise<void> {
    const userId = await this.supabase.requireUserId();
    const db = this.supabase.client;
    const lookup = await db.from('family_trees').select('id,client_id,title')
      .eq('owner_id', userId).eq('client_id', next.id).maybeSingle();
    assertOk(lookup.error);
    let tree = lookup.data as TreeRow | null;
    if (!tree) {
      const created = await db.from('family_trees').insert({
        owner_id: userId, client_id: next.id, title: next.name
      }).select('id,client_id,title').single();
      assertOk(created.error);
      tree = created.data as TreeRow;
    } else if (tree.title !== next.name) {
      const changed = await db.from('family_trees').update({ title: next.name }).eq('id', tree.id);
      assertOk(changed.error);
    }

    const [people, edges] = await Promise.all([
      db.from('persons').select(
        'id,client_id,display_name,sex,living_status,nickname,sibling_order,birth_date,death_date,birth_place,residence,occupation,notes,photo_path,deleted_at'
      ).eq('tree_id', tree.id),
      db.from('relationships').select('id,client_id,kind,person_a_id,person_b_id,status,deleted_at')
        .eq('tree_id', tree.id)
    ]);
    assertOk(people.error);
    assertOk(edges.error);
    const known = new Map(((people.data ?? []) as PersonRow[]).map(p => [p.client_id, p]));
    const ids = new Map([...known.entries()].map(([clientId, p]) => [clientId, p.id]));
    const newPeople = next.people.filter(p => !p.deletedAt && !known.has(p.id))
      .map(p => ({ tree_id: tree.id, client_id: p.id, created_by: userId, ...fields(p) }));
    if (newPeople.length) {
      const inserted = await db.from('persons').insert(newPeople).select('id,client_id');
      assertOk(inserted.error);
      for (const p of inserted.data ?? []) ids.set(p.client_id as string, p.id as string);
    }

    for (const p of next.people) {
      const before = known.get(p.id);
      if (!before || p.deletedAt) continue;
      const patch = fields(p);
      const dirty = Object.entries(patch).some(([key, value]) =>
        (before as unknown as Record<string, unknown>)[key] !== value);
      if (dirty) {
        const updated = await db.from('persons').update(patch).eq('tree_id', tree.id).eq('id', before.id);
        assertOk(updated.error);
      }
    }

    const knownEdges = new Map(((edges.data ?? []) as RelationshipRow[]).map(r => [r.client_id, r]));
    const newEdges = next.relationships.filter(r => !r.deletedAt && !knownEdges.has(r.id))
      .map(r => {
        const from = ids.get(r.fromId), to = ids.get(r.toId);
        if (!from || !to) throw new Error('Person untuk hubungan belum tersimpan di database.');
        return {
          tree_id: tree.id, client_id: r.id, person_a_id: from, person_b_id: to,
          kind: r.kind === 'parent' ? 'parent_child' : r.kind,
          subtype: 'unspecified', status: 'unconfirmed', created_by: userId
        };
      });
    if (newEdges.length) {
      const inserted = await db.from('relationships').insert(newEdges);
      assertOk(inserted.error);
    }

    // Archive links first: the Person guard rejects removing connected people.
    for (const r of next.relationships) {
      const before = knownEdges.get(r.id);
      if (!r.deletedAt || !before || before.deleted_at) continue;
      const archived = await db.from('relationships').update({
        deleted_at: r.deletedAt, deleted_by: userId
      }).eq('tree_id', tree.id).eq('id', before.id);
      assertOk(archived.error);
    }
    for (const p of next.people) {
      const before = known.get(p.id);
      if (!p.deletedAt || !before || before.deleted_at) continue;
      const archived = await db.from('persons').update({
        deleted_at: p.deletedAt, deleted_by: userId
      }).eq('tree_id', tree.id).eq('id', before.id);
      assertOk(archived.error);
    }
  }
}
