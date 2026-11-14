import { ApplicationConfig } from '@angular/core';
import { provideRouter, Routes } from '@angular/router';
import { FAMILY_TREE_REPOSITORY } from './domain/family-tree.repository';
import { DemoFamilyTreeRepository } from './infrastructure/demo-family-tree.repository';
import { FamilyTreePage } from './features/family-tree/family-tree.page';

const routes: Routes = [
  { path: '', component: FamilyTreePage },
  { path: 'person/:id', loadComponent: () => import('./features/profile/person-profile.page').then(m => m.PersonProfilePage) },
  { path: 'members', loadComponent: () => import('./features/reference/reference.page').then(m => m.ReferencePage), data: { view: 'members' } },
  { path: 'guide', loadComponent: () => import('./features/reference/reference.page').then(m => m.ReferencePage), data: { view: 'guide' } },
  { path: 'guide/:id', loadComponent: () => import('./features/reference/reference.page').then(m => m.ReferencePage), data: { view: 'guide' } },
  { path: 'rules', loadComponent: () => import('./features/reference/reference.page').then(m => m.ReferencePage), data: { view: 'rules' } },
  { path: 'developer', loadComponent: () => import('./features/developer/developer.page').then(m => m.DeveloperPage) },
  { path: '**', redirectTo: '' }
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    { provide: FAMILY_TREE_REPOSITORY, useClass: DemoFamilyTreeRepository }
  ]
};
