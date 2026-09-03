// Each spec file runs in its own jsdom window; zone.js from test-setup.ts
// patched a different window, so it must be imported here too.
import 'zone.js';
import 'zone.js/testing';
import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Location } from '@angular/common';
import { AbstractNavigator } from './abstract-navigator';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';

// The forks pool loads setupFiles in a separate module-cache context from spec
// files, so initTestEnvironment called in test-setup.ts targets a different
// TestBed instance. Initialize the environment here in the spec's own context.
beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
});

describe('RouteNavigator', () => {
  let navigator: AbstractNavigator;
  let replaceStateSpy: any;

  // Stub component for the sake of getting the router to accept routes
  @Component({})
  class StubComponent {}

  describe('with no router', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [{ provide: Router, useValue: null }],
      });

      navigator = TestBed.inject(AbstractNavigator);

      const location = TestBed.inject(Location);
      replaceStateSpy = vi.spyOn(location, 'replaceState');
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
      replaceStateSpy = vi.spyOn(location, 'replaceState');
    });

    it('should use the router if available', async () => {
      const location = TestBed.inject(Location);
      await navigator.navigateByUrl('/test-route');
      expect(location.path()).toBe('/test-route');
    });

    it('should not use the window object to navigate', async () => {
      expect(replaceStateSpy).not.toHaveBeenCalled();
    });
  });
});
