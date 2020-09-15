import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Location } from '@angular/common';
import { AbstractNavigator } from './abstract-navigator';
import { Component } from '@angular/core';

describe('RouteNavigator', () => {
  let navigator: AbstractNavigator;
  let replaceStateSpy: any;

  // Stub component for the sake of getting the router to accept routes
  @Component({})
  class StubComponent {}

  describe('with no router', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({});

      navigator = TestBed.inject(AbstractNavigator);

      const location = TestBed.inject(Location);
      replaceStateSpy = spyOn(location, 'replaceState');
    });

    it('should be created', () => {
      expect(navigator).toBeTruthy();
    });

    it('should use the window object when navigating', async () => {
      await navigator.navigateByUrl('/test-url');

      expect(replaceStateSpy).toHaveBeenCalledWith('/test-url');
    });
  });

  describe('with a router', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        imports: [
          RouterTestingModule.withRoutes([
            {
              path: 'test-route',
              component: StubComponent,
            },
          ]),
        ],
      });

      navigator = TestBed.inject(AbstractNavigator);

      const location = TestBed.inject(Location);
      replaceStateSpy = spyOn(location, 'replaceState');
    });

    it('should use the router if available', fakeAsync(() => {
      const location = TestBed.inject(Location);
      navigator.navigateByUrl('/test-route');
      tick();
      expect(location.path()).toBe('/test-route');
    }));

    it('should not use the window object to navigate', async () => {
      expect(replaceStateSpy).not.toHaveBeenCalled();
    });
  });
});
