import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-child-route',
  template: `
    <p data-cy="child-route">child-route works!</p>

    <router-outlet></router-outlet>
  `,
  styles: [],
  standalone: true,
  imports: [RouterOutlet],
})
export class ChildRouteComponent {}
