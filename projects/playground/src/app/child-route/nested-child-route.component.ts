import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-child-route',
  template: `
    <p>
      Nested child-route works!
    </p>
  `,
  styles: [],
})
export class NestedChildRouteComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {}
}
