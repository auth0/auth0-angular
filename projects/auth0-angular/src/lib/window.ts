import { InjectionToken } from '@angular/core';

/**
 * Injection token for providing an instance of `window`
 */
export const WindowService = new InjectionToken('Browser window');

/**
 * Default window provider. Provides the actual `window` object.
 */
export function windowProvider(): Window {
  return window;
}
