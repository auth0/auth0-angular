import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { LazyModuleComponent } from './lazy-module.component';

const routes: Routes = [{ path: '', component: LazyModuleComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LazyModuleRoutingModule {}
