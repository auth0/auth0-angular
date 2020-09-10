import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-unprotected',
  template: '<p data-cy="unprotected">This route is unprotected!</p>',
  styles: [],
})
export class UnprotectedComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {}
}
