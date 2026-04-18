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
  PopupOpenError,
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
  MfaError,
  MfaListAuthenticatorsError,
  MfaEnrollmentError,
  MfaChallengeError,
  MfaVerifyError,
  MfaEnrollmentFactorsError,
} from '@auth0/auth0-spa-js';

export type {
  InteractiveErrorHandler,
  Authenticator,
  AuthenticatorType,
  OobChannel,
  MfaFactorType,
  EnrollParams,
  EnrollOtpParams,
  EnrollSmsParams,
  EnrollVoiceParams,
  EnrollEmailParams,
  EnrollPushParams,
  EnrollmentResponse,
  OtpEnrollmentResponse,
  OobEnrollmentResponse,
  ChallengeAuthenticatorParams,
  ChallengeResponse,
  VerifyParams,
  MfaGrantType,
  EnrollmentFactor,
} from '@auth0/auth0-spa-js';
