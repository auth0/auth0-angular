import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-nested-child-route',
  template: `
    <p data-cy="nested-child-route">
      Nested child-route works!
    </p>
  `,
  styles: [],
})
export class NestedChildRouteComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {}
}
