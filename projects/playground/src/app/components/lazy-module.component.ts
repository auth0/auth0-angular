import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-lazy-module',
  template: '<p data-cy="lazy-module">lazy-module works!</p>',
  styles: [],
})
export class LazyModuleComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {}
}
