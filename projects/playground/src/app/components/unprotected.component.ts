import { Component } from '@angular/core';

@Component({
  selector: 'app-unprotected',
  template: '<p data-cy="unprotected">This route is unprotected!</p>',
  styles: [],
  standalone: false,
})
export class UnprotectedComponent {}
