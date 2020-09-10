import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LazyModuleRoutingModule } from './lazy-module-routing.module';
import { LazyModuleComponent } from './components/lazy-module.component';

@NgModule({
  declarations: [LazyModuleComponent],
  imports: [CommonModule, LazyModuleRoutingModule],
})
export class LazyModuleModule {}
