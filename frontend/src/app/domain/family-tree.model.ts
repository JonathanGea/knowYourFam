export type Gender = 'male' | 'female' | 'other' | 'unknown';
export type RelationKind = 'parent' | 'partner' | 'sibling';
export type RelationStatus = 'unconfirmed' | 'confirmed' | 'disputed';
export type Role = 'owner' | 'editor' | 'contributor' | 'viewer';
export type BranchKind = 'up' | 'side' | 'down' | 'pair';

export interface Person {
  readonly id: string;
  readonly name: string;
  readonly gender: Gender;
  readonly nickname?: string;
  /** Explicit 1-based sibling birth order, only used when known. */
  readonly birthOrder?: number;
  readonly birthDate?: string;
  readonly deathDate?: string;
  readonly birthPlace?: string;
  readonly residence?: string;
  readonly occupation?: string;
  readonly notes?: string;
  readonly claimed: boolean;
}

export interface FamilyRelationship {
  readonly id: string;
  readonly kind: RelationKind;
  /** For a parent relation: fromId=parent, toId=child. */
  readonly fromId: string;
  readonly toId: string;
  readonly status: RelationStatus;
}

export interface FamilyTree {
  readonly id: string;
  readonly name: string;
  readonly people: readonly Person[];
  readonly relationships: readonly FamilyRelationship[];
}

export interface PersonDraft {
  readonly name: string;
  readonly gender: Gender;
  readonly birthDate?: string;
  readonly birthOrder?: number;
  readonly relationTo: 'none' | 'parent' | 'child' | 'partner';
  readonly targetId?: string;
}

/**
 * This is demo/UI state, not authorization. Real writes must be authorized
 * by the future Supabase adapter / backend according to permissions ADR.
 */
export interface GraphViewState {
  readonly focusPersonId: string;
  readonly mode: 'focus' | 'overview';
  readonly expandedBranchKeys: readonly string[];
}
