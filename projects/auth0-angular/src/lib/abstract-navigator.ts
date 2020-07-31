import { Injectable, Inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { WindowService } from './window';

@Injectable({
  providedIn: 'root',
})
export class AbstractNavigator {
  private readonly router: Router;

  constructor(@Inject(WindowService) private window: any, injector: Injector) {
    // https://github.com/angular/angular/issues/12631
    this.window = window as Window;
    try {
      this.router = injector.get(Router);
    } catch {}
  }

  /**
   * Navigates to the specified url. The router will be used if one is available, otherwise it falls back
   * to `window.history.replaceState`.
   * @param url The url to navigate to
   */
  navigateByUrl(url: string): void {
    if (this.router) {
      setTimeout(() => {
        this.router.navigateByUrl(url);
      }, 0);

      return;
    }

    this.window.history.replaceState({}, null, url);
  }
}
