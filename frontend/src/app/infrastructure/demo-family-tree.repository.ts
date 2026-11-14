import { Injectable } from '@angular/core';
import { FamilyTree } from '../domain/family-tree.model';
import { FamilyTreeRepository } from '../domain/family-tree.repository';
import { MAIN_SAMPLE_TREE } from './main-sample.data';

const KEY = 'knowyourfam.angular.main-parity.v2';


@Injectable()
export class DemoFamilyTreeRepository implements FamilyTreeRepository {
  async load(): Promise<FamilyTree> {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (this.isTree(parsed)) return parsed;
      }
    } catch { /* Storage may be disabled. Demo still runs. */ }
    return structuredClone(MAIN_SAMPLE_TREE);
  }

  async save(tree: FamilyTree): Promise<void> {
    try { localStorage.setItem(KEY, JSON.stringify(tree)); }
    catch { /* Demo changes still persist within this page. */ }
  }

  private isTree(data: unknown): data is FamilyTree {
    if (!data || typeof data !== 'object') return false;
    const obj = data as Partial<FamilyTree>;
    if (typeof obj.id !== 'string' || !Array.isArray(obj.people) || !Array.isArray(obj.relationships)) return false;
    const ids = new Set<string>();
    for (const p of obj.people) {
      if (!p || typeof p.id !== 'string' || !p.id || typeof p.name !== 'string' || !p.name || ids.has(p.id)) return false;
      ids.add(p.id);
    }
    return obj.relationships.every(r => r && ids.has(r.fromId) && ids.has(r.toId)
      && ['parent', 'partner', 'sibling'].includes(r.kind) && r.fromId !== r.toId);
  }
}
