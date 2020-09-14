import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ProtectedComponent } from './components/protected.component';
import { AuthGuard } from 'projects/auth0-angular/src/lib/auth.guard';
import { UnprotectedComponent } from './components/unprotected.component';
import { ChildRouteComponent } from './components/child-route.component';
import { NestedChildRouteComponent } from './components/nested-child-route.component';

const routes: Routes = [
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
    loadChildren: () =>
      import('./lazy-module.module').then((m) => m.LazyModuleModule),
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
