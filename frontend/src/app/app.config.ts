import { ApplicationConfig } from '@angular/core';
import { environment } from '../environments/environment';
import { provideRouter, Routes } from '@angular/router';
import { FAMILY_TREE_REPOSITORY } from './domain/family-tree.repository';
import { DemoFamilyTreeRepository } from './infrastructure/demo-family-tree.repository';
import { FamilyTreePage } from './features/family-tree/family-tree.page';

const routes: Routes = [
  { path: '', component: FamilyTreePage },
  ...(environment.showDeveloperDocs
    ? [{ path: 'developer', loadComponent: () => import('./features/developer/developer.page').then(m => m.DeveloperPage) }]
    : []),
  { path: '**', redirectTo: '' }
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    { provide: FAMILY_TREE_REPOSITORY, useClass: DemoFamilyTreeRepository }
  ]
};
