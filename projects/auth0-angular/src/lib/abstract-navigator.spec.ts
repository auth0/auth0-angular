import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Location } from '@angular/common';
import { AbstractNavigator } from './abstract-navigator';
import { WindowService } from './window';
import { Component } from '@angular/core';

describe('RouteNavigator', () => {
  let navigator: AbstractNavigator;
  let windowStub: Window;

  // Stub component for the sake of getting the router to accept routes
  @Component({})
  class StubComponent {}

  beforeEach(() => {
    windowStub = jasmine.createSpyObj('Window', [], {
      history: jasmine.createSpyObj('History', ['replaceState']),
    });
  });

  describe('with no router', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          {
            provide: WindowService,
            useValue: windowStub,
          },
        ],
      });

      navigator = TestBed.inject(AbstractNavigator);
    });

    it('should be created', () => {
      expect(navigator).toBeTruthy();
    });

    it('should use the window object when navigating', async () => {
      await navigator.navigateByUrl('/test-url');

      expect(windowStub.history.replaceState).toHaveBeenCalledWith(
        {},
        null,
        '/test-url'
      );
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
        providers: [
          {
            provide: WindowService,
            useValue: windowStub,
          },
        ],
      });

      navigator = TestBed.inject(AbstractNavigator);
    });

    it('should use the router if available', async () => {
      const location = TestBed.inject(Location);
      await navigator.navigateByUrl('/test-route');
      expect(location.path()).toBe('/test-route');
    });

    it('should not use the window object to navigate', async () => {
      expect(windowStub.history.replaceState).not.toHaveBeenCalled();
    });
  });
});
