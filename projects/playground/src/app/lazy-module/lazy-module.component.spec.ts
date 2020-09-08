import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LazyModuleComponent } from './lazy-module.component';

describe('LazyModuleComponent', () => {
  let component: LazyModuleComponent;
  let fixture: ComponentFixture<LazyModuleComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [LazyModuleComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LazyModuleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
