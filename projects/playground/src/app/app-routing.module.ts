import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ProtectedComponent } from './protected/protected.component';
import { AuthGuard } from 'projects/auth0-angular/src/lib/auth.guard';
import { UnprotectedComponent } from './unprotected/unprotected.component';
import { ChildRouteComponent } from './child-route/child-route.component';
import { NestedChildRouteComponent } from './child-route/nested-child-route.component';

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
      import('./lazy-module/lazy-module.module').then(
        (m) => m.LazyModuleModule
      ),
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
