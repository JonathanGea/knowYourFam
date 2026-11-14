import { InjectionToken } from '@angular/core';
import { FamilyTree } from './family-tree.model';

/**
 * Provider-independent boundary. Angular UI must not import Supabase SDK.
 * A future HTTP adapter implements the same interface for a custom backend.
 */
export interface FamilyTreeRepository {
  load(): FamilyTree;
  save(tree: FamilyTree): void;
}

export const FAMILY_TREE_REPOSITORY = new InjectionToken<FamilyTreeRepository>(
  'FAMILY_TREE_REPOSITORY'
);
