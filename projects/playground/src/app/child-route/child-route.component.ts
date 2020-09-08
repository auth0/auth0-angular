import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-child-route',
  template: `
    <p>
      child-route works!
    </p>

    <router-outlet></router-outlet>
  `,
  styles: [],
})
export class ChildRouteComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {}
}
