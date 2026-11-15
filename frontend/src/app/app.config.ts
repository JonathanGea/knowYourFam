import { ApplicationConfig } from '@angular/core';
import { provideRouter, Routes } from '@angular/router';
import { FAMILY_TREE_REPOSITORY } from './domain/family-tree.repository';
import { SupabaseFamilyTreeRepository } from './infrastructure/supabase-family-tree.repository';
import { FamilyTreePage } from './features/family-tree/family-tree.page';
import { requireCloudAuth } from './application/require-cloud-auth.guard';

const routes: Routes = [
  { path: 'cloud', loadComponent: () => import('./features/auth/cloud-login.page').then(m => m.CloudLoginPage) },
  { path: '', component: FamilyTreePage, canActivate: [requireCloudAuth] },
  { path: 'person/:id', canActivate: [requireCloudAuth], loadComponent: () => import('./features/profile/person-profile.page').then(m => m.PersonProfilePage) },
  { path: 'members', canActivate: [requireCloudAuth], loadComponent: () => import('./features/reference/reference.page').then(m => m.ReferencePage), data: { view: 'members' } },
  { path: 'guide', canActivate: [requireCloudAuth], loadComponent: () => import('./features/reference/reference.page').then(m => m.ReferencePage), data: { view: 'guide' } },
  { path: 'guide/:id', canActivate: [requireCloudAuth], loadComponent: () => import('./features/reference/reference.page').then(m => m.ReferencePage), data: { view: 'guide' } },
  { path: 'rules', canActivate: [requireCloudAuth], loadComponent: () => import('./features/reference/reference.page').then(m => m.ReferencePage), data: { view: 'rules' } },
  { path: 'developer', canActivate: [requireCloudAuth], loadComponent: () => import('./features/developer/developer.page').then(m => m.DeveloperPage) },
  { path: '**', redirectTo: '' }
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    { provide: FAMILY_TREE_REPOSITORY, useClass: SupabaseFamilyTreeRepository }
  ]
};
