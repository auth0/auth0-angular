import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ProtectedComponent } from './protected/protected.component';
import { AuthGuard } from 'projects/auth0-angular/src/lib/auth.guard';
import { UnprotectedComponent } from './unprotected/unprotected.component';

const routes: Routes = [
  {
    path: 'protected',
    component: ProtectedComponent,
    canActivate: [AuthGuard],
  },
  {
    path: '',
    component: UnprotectedComponent,
    pathMatch: 'full',
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
