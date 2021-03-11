import { Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class AbstractNavigator {
  private readonly router?: Router;

  constructor(private location: Location, injector: Injector) {
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
      this.router.navigateByUrl(url);

      return;
    }

    this.location.replaceState(url);
  }
}
