import type { FamilyRelationship, Person } from '../../domain/family-tree.model';
import { CANVAS_CARD_HEIGHT, CANVAS_CARD_WIDTH, computeMainCanvasLayout } from './main-layout-engine';
import { createMainCanvasRouting } from './main-connector-engine';

export { CANVAS_CARD_HEIGHT, CANVAS_CARD_WIDTH };

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
export interface LayoutDot { readonly id: string; readonly x: number; readonly y: number; readonly radius: number; readonly kind: 'partner'|'parent'; }
export interface FamilyLayout {
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly LayoutNode[];
  readonly edges: readonly LayoutEdge[];
  readonly dots: readonly LayoutDot[];
  readonly warnings: readonly string[];
  readonly generationCount: number;
}

export interface LayoutContext {
  readonly allPeople: readonly Person[];
  readonly allRelationships: readonly FamilyRelationship[];
  readonly mode: 'focus' | 'overview';
}

/** Pure reusable layout. Every Person appears once even if several households reference them. */
export function createFamilyLayout(
  visiblePeople: readonly Person[],
  visibleRelationships: readonly FamilyRelationship[],
  focusId: string,
  context: LayoutContext
): FamilyLayout {
  if (!visiblePeople.length) {
    return { width: 900, height: 500, nodes: [], edges: [], dots: [], warnings: [], generationCount: 0 };
  }
  const input = {
    visiblePeople,
    visibleRelationships,
    allPeople: context.allPeople,
    allRelationships: context.allRelationships,
    focusId,
    mode: context.mode
  } as const;
  const geometry = computeMainCanvasLayout(input);
  const peopleById = new Map(visiblePeople.map(person => [person.id, person]));
  const nodes = geometry.positions.flatMap(position => {
    const person = peopleById.get(position.id);
    if (!person) return [];
    return [{ person, x: position.x, y: position.y, tier: position.level }];
  });
  const routing = createMainCanvasRouting({ ...input, positions: geometry.positions });
  const edges = routing.paths.map(edge => ({
    id: edge.id,
    kind: edge.kind,
    path: edge.d,
    unconfirmed: edge.unconfirmed
  }));
  return {
    width: geometry.width,
    height: geometry.height,
    nodes,
    edges,
    dots: routing.dots,
    warnings: geometry.warnings,
    generationCount: geometry.maxDepth + 1
  };
}
