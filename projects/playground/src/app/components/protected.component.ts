import { Component } from '@angular/core';

@Component({
  selector: 'app-protected',
  template: '<p data-cy="protected">This route is protected!</p>',
  styles: [],
  standalone: false,
})
export class ProtectedComponent {}
