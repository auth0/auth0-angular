import { Injectable, Inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { WindowService } from './window';

@Injectable({
  providedIn: 'root',
})
export class AbstractNavigator {
  private readonly router: Router;

  constructor(
    @Inject(WindowService) private window: Window,
    injector: Injector
  ) {
    try {
      this.router = injector.get(Router);
    } catch {}
  }

  /**
   * Navigates to the specified url. The router will be used if one is available, otherwise it falls back
   * to `window.history.replaceState`.
   * @param url The url to navigate to
   */
  navigateByUrl(url: string): Promise<boolean> {
    if (this.router) {
      return this.router.navigateByUrl(url);
    }

    this.window.history.replaceState({}, null, url);
    return Promise.resolve(true);
  }
}
