import { Component } from '@angular/core';

@Component({
  selector: 'app-child-route',
  template: `
    <p data-cy="child-route">child-route works!</p>

    <router-outlet></router-outlet>
  `,
  styles: [],
})
export class ChildRouteComponent {}
