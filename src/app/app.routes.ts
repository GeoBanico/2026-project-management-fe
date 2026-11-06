import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'projects' },
  {
    path: 'projects',
    title: 'Projects',
    loadComponent: () => import('./pages/workspace-page').then((m) => m.WorkspacePage),
  },
  {
    path: 'projects/:projectId',
    title: 'Project details',
    loadComponent: () => import('./pages/workspace-page').then((m) => m.WorkspacePage),
  },
  {
    path: 'projects/:projectId/tasks/:taskId',
    title: 'Task details',
    loadComponent: () => import('./pages/workspace-page').then((m) => m.WorkspacePage),
  },
  {
    path: '**',
    title: 'Page not found',
    loadComponent: () => import('./pages/not-found').then((m) => m.NotFound),
  },
];
