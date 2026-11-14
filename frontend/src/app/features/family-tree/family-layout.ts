import { FamilyRelationship, Person } from '../../domain/family-tree.model';

export interface LayoutNode {
  readonly person: Person;
  readonly x: number;
  readonly y: number;
  readonly tier: number;
}
export interface LayoutEdge {
  readonly id: string;
  readonly kind: 'parent' | 'partner' | 'sibling';
  readonly path: string;
  readonly unconfirmed: boolean;
}
export interface FamilyLayout {
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly LayoutNode[];
  readonly edges: readonly LayoutEdge[];
}
const NODE_W = 194;
const NODE_H = 106;
const GAP_X = 44;
const GAP_Y = 120;

export function createFamilyLayout(
  people: readonly Person[],
  relationships: readonly FamilyRelationship[],
  focusId: string
): FamilyLayout {
  if (!people.length) return { width: 900, height: 500, nodes: [], edges: [] };
  const levels = new Map<string, number>();
  levels.set(people.some(p => p.id === focusId) ? focusId : people[0].id, 0);
  const ids = new Set(people.map(p => p.id));

  // Derive tiers from typed graph edges. No persisted generation numbers.
  for (let pass = 0; pass < people.length * 3; pass++) {
    let changed = false;
    for (const r of relationships) {
      if (!ids.has(r.fromId) || !ids.has(r.toId)) continue;
      const a = levels.get(r.fromId), b = levels.get(r.toId);
      const delta = r.kind === 'parent' ? 1 : 0;
      if (a !== undefined && b === undefined) { levels.set(r.toId, a + delta); changed = true; }
      else if (a === undefined && b !== undefined) { levels.set(r.fromId, b - delta); changed = true; }
    }
    if (!changed) break;
  }
  for (const person of people) if (!levels.has(person.id)) levels.set(person.id, 0);
  const minTier = Math.min(...levels.values());
  const buckets = new Map<number, Person[]>();
  for (const person of people) {
    const tier = levels.get(person.id)!;
    if (!buckets.has(tier)) buckets.set(tier, []);
    buckets.get(tier)!.push(person);
  }
  const partnerById = new Map<string, string>();
  for (const r of relationships.filter(r => r.kind === 'partner')) {
    partnerById.set(r.fromId, r.toId);
    partnerById.set(r.toId, r.fromId);
  }
  const orderedTiers = [...buckets.keys()].sort((a, b) => a - b);
  const organized = orderedTiers.map(tier => {
    const group = buckets.get(tier)!;
    const sorted = group.slice().sort((a, b) =>
      (a.birthDate ?? '9999').localeCompare(b.birthDate ?? '9999') || a.name.localeCompare(b.name, 'id')
    );
    const used = new Set<string>();
    const result: Person[] = [];
    for (const p of sorted) {
      if (used.has(p.id)) continue;
      const partner = group.find(x => x.id === partnerById.get(p.id));
      if (partner && !used.has(partner.id)) {
        const left = p.gender === 'male' ? p : partner.gender === 'male' ? partner : p;
        const right = left.id === p.id ? partner : p;
        result.push(left, right);
        used.add(left.id);
        used.add(right.id);
      } else {
        result.push(p);
        used.add(p.id);
      }
    }
    return { tier, people: result };
  });
  const widest = Math.max(...organized.map(g => g.people.length));
  const width = Math.max(940, widest * (NODE_W + GAP_X) + 170);
  const height = Math.max(580, (Math.max(...levels.values()) - minTier + 1) * (NODE_H + GAP_Y) + 120);
  const nodes: LayoutNode[] = [];
  for (const row of organized) {
    const rowWidth = row.people.length * NODE_W + (row.people.length - 1) * GAP_X;
    const firstX = (width - rowWidth) / 2;
    for (let i = 0; i < row.people.length; i++) {
      nodes.push({
        person: row.people[i],
        x: firstX + i * (NODE_W + GAP_X),
        y: 66 + (row.tier - minTier) * (NODE_H + GAP_Y),
        tier: row.tier
      });
    }
  }
  const pos = new Map(nodes.map(n => [n.person.id, n]));
  const edges: LayoutEdge[] = [];
  for (const rel of relationships) {
    const a = pos.get(rel.fromId), b = pos.get(rel.toId);
    if (!a || !b) continue;
    let path = '';
    if (rel.kind === 'parent') {
      const ax = a.x + NODE_W / 2, ay = a.y + NODE_H;
      const bx = b.x + NODE_W / 2, by = b.y;
      const mid = ay + (by - ay) / 2;
      path = `M ${ax} ${ay} C ${ax} ${mid}, ${bx} ${mid}, ${bx} ${by}`;
    } else {
      const ax = a.x < b.x ? a.x + NODE_W : a.x;
      const bx = a.x < b.x ? b.x : b.x + NODE_W;
      const y = a.y + NODE_H / 2;
      path = `M ${ax} ${y} L ${bx} ${y}`;
    }
    edges.push({ id: rel.id, kind: rel.kind, path, unconfirmed: rel.status === 'unconfirmed' });
  }
  return { width, height, nodes, edges };
}
