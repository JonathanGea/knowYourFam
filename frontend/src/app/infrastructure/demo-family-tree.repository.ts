import { Injectable } from '@angular/core';
import { FamilyTree } from '../domain/family-tree.model';
import { FamilyTreeRepository } from '../domain/family-tree.repository';

const KEY = 'knowyourfam.angular.demo.v1';

const DEMO: FamilyTree = {
  id: 'tree-surya-demo',
  name: 'Keluarga Surya',
  people: [
    { id: 'hasan', name: 'Hasan', gender: 'male', birthDate: '1944-02-10', claimed: false },
    { id: 'aminah', name: 'Aminah', gender: 'female', birthDate: '1947-06-02', claimed: false },
    { id: 'budi', name: 'Budi', gender: 'male', birthDate: '1970-01-04', claimed: false },
    { id: 'santi', name: 'Santi', gender: 'female', birthDate: '1973-09-12', claimed: false },
    { id: 'tono', name: 'Tono', gender: 'male', birthDate: '1972-03-09', claimed: false },
    { id: 'siti', name: 'Siti', gender: 'female', birthDate: '1975-07-13', claimed: false },
    { id: 'surya', name: 'Surya', gender: 'male', birthDate: '1998-07-22', claimed: true, occupation: 'Pengelola pohon' },
    { id: 'rudi', name: 'Rudi', gender: 'male', birthDate: '2000-05-20', claimed: true, occupation: 'Desainer' },
    { id: 'dewi', name: 'Dewi', gender: 'female', birthDate: '2004-04-17', claimed: false },
    { id: 'joko', name: 'Joko', gender: 'male', birthDate: '1973-01-12', claimed: false },
    { id: 'ratih', name: 'Ratih', gender: 'female', birthDate: '1975-11-28', claimed: false },
    { id: 'lina', name: 'Lina', gender: 'female', birthDate: '2000-11-03', claimed: false },
    { id: 'arka', name: 'Arka', gender: 'male', birthDate: '2024-05-15', claimed: false },
    { id: 'andi', name: 'Andi', gender: 'male', birthDate: '1995-05-04', claimed: false },
    { id: 'maya', name: 'Maya', gender: 'female', birthDate: '1996-08-11', claimed: false },
    { id: 'naya', name: 'Naya', gender: 'female', birthDate: '2022-09-08', claimed: false }
  ],
  relationships: [
    { id: 'r1', kind: 'partner', fromId: 'hasan', toId: 'aminah', status: 'confirmed' },
    { id: 'r2', kind: 'parent', fromId: 'hasan', toId: 'budi', status: 'confirmed' },
    { id: 'r3', kind: 'parent', fromId: 'aminah', toId: 'budi', status: 'confirmed' },
    { id: 'r4', kind: 'parent', fromId: 'hasan', toId: 'tono', status: 'confirmed' },
    { id: 'r5', kind: 'parent', fromId: 'aminah', toId: 'tono', status: 'confirmed' },
    { id: 'r6', kind: 'partner', fromId: 'budi', toId: 'santi', status: 'confirmed' },
    { id: 'r7', kind: 'partner', fromId: 'tono', toId: 'siti', status: 'confirmed' },
    { id: 'r8', kind: 'parent', fromId: 'budi', toId: 'surya', status: 'confirmed' },
    { id: 'r9', kind: 'parent', fromId: 'santi', toId: 'surya', status: 'confirmed' },
    { id: 'r10', kind: 'parent', fromId: 'tono', toId: 'rudi', status: 'confirmed' },
    { id: 'r11', kind: 'parent', fromId: 'siti', toId: 'rudi', status: 'confirmed' },
    { id: 'r12', kind: 'parent', fromId: 'tono', toId: 'dewi', status: 'confirmed' },
    { id: 'r13', kind: 'parent', fromId: 'siti', toId: 'dewi', status: 'confirmed' },
    { id: 'r14', kind: 'partner', fromId: 'joko', toId: 'ratih', status: 'confirmed' },
    { id: 'r15', kind: 'parent', fromId: 'joko', toId: 'lina', status: 'confirmed' },
    { id: 'r16', kind: 'parent', fromId: 'ratih', toId: 'lina', status: 'confirmed' },
    { id: 'r17', kind: 'partner', fromId: 'rudi', toId: 'lina', status: 'confirmed' },
    { id: 'r18', kind: 'parent', fromId: 'rudi', toId: 'arka', status: 'confirmed' },
    { id: 'r19', kind: 'parent', fromId: 'lina', toId: 'arka', status: 'confirmed' },
    { id: 'r20', kind: 'partner', fromId: 'andi', toId: 'maya', status: 'unconfirmed' },
    { id: 'r21', kind: 'parent', fromId: 'andi', toId: 'naya', status: 'unconfirmed' },
    { id: 'r22', kind: 'parent', fromId: 'maya', toId: 'naya', status: 'unconfirmed' },
    { id: 'r23', kind: 'parent', fromId: 'tono', toId: 'andi', status: 'confirmed' },
    { id: 'r24', kind: 'parent', fromId: 'siti', toId: 'andi', status: 'confirmed' }
  ]
};

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
    return structuredClone(DEMO);
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
