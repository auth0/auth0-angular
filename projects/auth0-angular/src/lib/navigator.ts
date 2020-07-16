import { Injectable, Inject } from '@angular/core';
import { WindowService } from './window';

@Injectable()
export class RouteNavigator {
  constructor(@Inject(WindowService) private window: Window) {}

  navigateByUrl(url: string): Promise<boolean> {
    this.window.history.replaceState({}, null, url);
    return Promise.resolve(true);
  }
}
