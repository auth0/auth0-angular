import { Routes } from '@angular/router';
import { AuthGuard } from 'projects/auth0-angular/src/lib/auth.guard';
import { ProtectedComponent } from './components/protected.component';
import { UnprotectedComponent } from './components/unprotected.component';
import { ChildRouteComponent } from './components/child-route.component';
import { NestedChildRouteComponent } from './components/nested-child-route.component';
import { ErrorComponent } from './components/error.component';

export const routes: Routes = [
  {
    path: '',
    component: UnprotectedComponent,
    pathMatch: 'full',
  },
  {
    path: 'child',
    component: ChildRouteComponent,
    canActivateChild: [AuthGuard],
    children: [{ path: 'nested', component: NestedChildRouteComponent }],
  },
  {
    path: 'protected',
    component: ProtectedComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'lazy',
    canLoad: [AuthGuard],
    loadComponent: () =>
      import('./components/lazy-module.component').then(
        (m) => m.LazyModuleComponent
      ),
  },
  {
    path: 'error',
    component: ErrorComponent,
  },
];
