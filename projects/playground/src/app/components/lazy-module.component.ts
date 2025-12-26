import { Component } from '@angular/core';

@Component({
  selector: 'app-lazy-module',
  template: '<p data-cy="lazy-module">lazy-module works!</p>',
  styles: [],
  standalone: false,
})
export class LazyModuleComponent {}
