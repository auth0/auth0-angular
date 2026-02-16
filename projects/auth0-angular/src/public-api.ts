/*
 * Public API Surface of auth0-angular
 */

export * from './lib/auth.service';
export * from './lib/auth.module';
export * from './lib/auth.guard';
export * from './lib/auth.interceptor';
export * from './lib/auth.config';
export * from './lib/auth.client';
export * from './lib/auth.state';
export * from './lib/interfaces';
export * from './lib/provide';
export * from './lib/functional';
export * from './lib/abstract-navigator';

export {
  AuthorizationParams,
  PopupLoginOptions,
  PopupConfigOptions,
  GetTokenWithPopupOptions,
  GetTokenSilentlyOptions,
  RedirectConnectAccountOptions,
  ConnectAccountRedirectResult,
  ICache,
  Cacheable,
  LocalStorageCache,
  InMemoryCache,
  IdToken,
  User,
  GenericError,
  TimeoutError,
  MfaRequiredError,
  PopupTimeoutError,
  AuthenticationError,
  PopupCancelledError,
  MissingRefreshTokenError,
  ConnectError,
  Fetcher,
  FetcherConfig,
  CustomFetchMinimalOutput,
  UseDpopNonceError,
  CustomTokenExchangeOptions,
  TokenEndpointResponse,
  ResponseType,
} from '@auth0/auth0-spa-js';
