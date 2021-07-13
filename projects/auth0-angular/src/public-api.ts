/*
 * Public API Surface of auth0-angular
 */

export * from './lib/auth.service';
export * from './lib/auth.module';
export * from './lib/auth.guard';
export * from './lib/auth.interceptor';
export * from './lib/auth.config';

export {
  ICache,
  Cacheable,
  LocalStorageCache,
  InMemoryCache,
} from '@auth0/auth0-spa-js';
