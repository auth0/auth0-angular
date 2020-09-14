import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-protected',
  template: '<p data-cy="protected">This route is protected!</p>',
  styles: [],
})
export class ProtectedComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {}
}
