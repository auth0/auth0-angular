import { Component } from '@angular/core';

@Component({
  selector: 'app-nested-child-route',
  template: ` <p data-cy="nested-child-route">Nested child-route works!</p> `,
  styles: [],
  standalone: true,
})
export class NestedChildRouteComponent {}
