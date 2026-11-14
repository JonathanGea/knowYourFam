import { Component, computed, inject, signal } from '@angular/core';
import { FamilyTreeStore } from '../../application/family-tree.store';
import { Gender, Person } from '../../domain/family-tree.model';
import { createFamilyLayout } from './family-layout';

@Component({
  selector: 'app-family-tree-page',
  standalone: true,
  templateUrl: './family-tree.page.html',
  styleUrl: './family-tree.page.css'
})
export class FamilyTreePage {
  readonly store = inject(FamilyTreeStore);
  readonly layout = computed(() => createFamilyLayout(
    this.store.visiblePeople(),
    this.store.visibleRelationships(),
    this.store.focusPersonId()
  ));
  readonly addDialogOpen = signal(false);
  readonly mobileListOpen = signal(false);
  readonly formError = signal('');

  initials(name: string): string {
    return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toLocaleUpperCase('id') ?? '').join('');
  }

  birthYear(person: Person): string {
    return person.birthDate?.slice(0, 4) ?? 'Tahun belum diketahui';
  }

  relationTitle(id: string, kind: 'parents' | 'partners' | 'children' | 'siblings'): string {
    return this.store.relationsFor(id)[kind]
      .map(personId => this.store.findPerson(personId)?.name)
      .filter((name): name is string => !!name)
      .join(', ') || 'Belum dicatat';
  }

  selectPerson(id: string): void {
    this.store.select(id);
    this.mobileListOpen.set(false);
  }

  setFocus(id: string): void {
    this.store.setFocus(id);
    this.mobileListOpen.set(false);
  }

  onWheel(event: WheelEvent): void {
    if (event.ctrlKey) {
      event.preventDefault();
      this.store.changeZoom(event.deltaY < 0 ? 0.1 : -0.1);
    }
  }

  openAdd(): void {
    this.formError.set('');
    this.addDialogOpen.set(true);
  }

  submitPerson(event: Event): void {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const name = String(formData.get('name') ?? '');
    const gender = String(formData.get('gender') ?? 'unknown') as Gender;
    const relationTo = String(formData.get('relationTo') ?? 'none') as
      'none' | 'parent' | 'child' | 'partner';
    try {
      this.store.addPerson({
        name,
        gender,
        relationTo,
        targetId: this.store.selectedPersonId()
      });
      this.addDialogOpen.set(false);
      form.reset();
    } catch (error: unknown) {
      this.formError.set(error instanceof Error ? error.message : 'Gagal menyimpan orang baru.');
    }
  }

  downloadJson(): void {
    const blob = new Blob([this.store.exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'knowyourfam-demo.json';
    link.click();
    URL.revokeObjectURL(url);
  }
}
