import {
  Auth0ClientOptions,
  CacheLocation,
  GetTokenSilentlyOptions,
  ICache,
} from '@auth0/auth0-spa-js';

import { InjectionToken, Injectable, Optional, Inject } from '@angular/core';

/**
 * Defines a common set of HTTP methods.
 */
export const enum HttpMethod {
  Get = 'GET',
  Post = 'POST',
  Put = 'PUT',
  Patch = 'PATCH',
  Delete = 'DELETE',
  Head = 'HEAD',
}

/**
 * Defines the type for a route config entry. Can either be:
 *
 * - an object of type HttpInterceptorRouteConfig
 * - a string
 */
export type ApiRouteDefinition = HttpInterceptorRouteConfig | string;

/**
 * A custom type guard to help identify route definitions that are actually HttpInterceptorRouteConfig types.
 * @param def The route definition type
 */
export function isHttpInterceptorRouteConfig(
  def: ApiRouteDefinition
): def is HttpInterceptorRouteConfig {
  return typeof def !== 'string';
}

/**
 * Configuration for the HttpInterceptor
 */
export interface HttpInterceptorConfig {
  allowedList: ApiRouteDefinition[];
}

/**
 * Configuration for a single interceptor route
 */
export interface HttpInterceptorRouteConfig {
  /**
   * The URL to test, by supplying the URL to match.
   * If `test` is a match for the current request path from the HTTP client, then
   * an access token is attached to the request in the
   *  ["Authorization" header](https://tools.ietf.org/html/draft-ietf-oauth-v2-bearer-20#section-2.1).
   *
   * If the test does not pass, the request proceeds without the access token attached.
   *
   * A wildcard character can be used to match only the start of the URL.
   *
   * @usagenotes
   *
   * '/api' - exactly match the route /api
   * '/api/*' - match any route that starts with /api/
   */
  uri?: string;

  /**
   * A function that will be called with the HttpRequest.url value, allowing you to do
   * any kind of flexible matching.
   *
   * If this function returns true, then
   * an access token is attached to the request in the
   *  ["Authorization" header](https://tools.ietf.org/html/draft-ietf-oauth-v2-bearer-20#section-2.1).
   *
   * If it returns false, the request proceeds without the access token attached.
   */
  uriMatcher?: (uri: string) => boolean;

  /**
   * The options that are passed to the SDK when retrieving the
   * access token to attach to the outgoing request.
   */
  tokenOptions?: GetTokenSilentlyOptions;

  /**
   * The HTTP method to match on. If specified, the HTTP method of
   * the outgoing request will be checked against this. If there is no match, the
   * Authorization header is not attached.
   *
   * The HTTP method name is case-sensitive.
   */
  httpMethod?: HttpMethod | string;

  /**
   * Allow the HTTP call to be executed anonymously, when no token is available.
   *
   * When omitted (or set to false), calls that match the configuration will fail when no token is available.
   */
  allowAnonymous?: boolean;
}

/**
 * Configuration for the authentication service
 */
export interface AuthConfig extends Auth0ClientOptions {
  /**
   * By default, if the page URL has code and state parameters, the SDK will assume they are for
   * an Auth0 application and attempt to exchange the code for a token.
   * In some cases the code might be for something else (e.g. another OAuth SDK). In these
   * instances you can instruct the client to ignore them by setting `skipRedirectCallback`.
   *
   * ```js
   * AuthModule.forRoot({
   *   skipRedirectCallback: window.location.pathname === '/other-callback'
   * })
   * ```
   *
   * **Note**: In the above example, `/other-callback` is an existing route that will be called
   * by any other OAuth provider with a `code` (or `error` in case when something went wrong) and `state`.
   *
   */
  skipRedirectCallback?: boolean;

  /**
   * Configuration for the built-in Http Interceptor, used for
   * automatically attaching access tokens.
   */
  httpInterceptor?: HttpInterceptorConfig;

  /**
   * Path in your application to redirect to when the Authorization server
   * returns an error. Defaults to `/`
   */
  errorPath?: string;
}

/**
 * Angular specific state to be stored before redirect
 */
export interface AppState {
  /**
   * Target path the app gets routed to after
   * handling the callback from Auth0 (defaults to '/')
   */
  target?: string;

  /**
   * Any custom parameter to be stored in appState
   */
  [key: string]: any;
}

/**
 * Gets and sets configuration for the internal Auth0 client. This can be
 * used to provide configuration outside of using AuthModule.forRoot, i.e. from
 * a factory provided by APP_INITIALIZER.
 *
 * @usage
 *
 * ```js
 * // app.module.ts
 * // ---------------------------
 * import { AuthModule, AuthClientConfig } from '@auth0/auth0-angular';
 *
 * // Provide an initializer function that returns a Promise
 * function configInitializer(
 *   http: HttpClient,
 *   config: AuthClientConfig
 * ) {
 *   return () =>
 *     http
 *       .get('/config')
 *       .toPromise()
 *       .then((loadedConfig: any) => config.set(loadedConfig));   // Set the config that was loaded asynchronously here
 * }
 *
 * // Provide APP_INITIALIZER with this function. Note that there is no config passed to AuthModule.forRoot
 * imports: [
 *   // other imports..
 *
 *   HttpClientModule,
 *   AuthModule.forRoot(),   //<- don't pass any config here
 * ],
 * providers: [
 *   {
 *     provide: APP_INITIALIZER,
 *     useFactory: configInitializer,    // <- pass your initializer function here
 *     deps: [HttpClient, AuthClientConfig],
 *     multi: true,
 *   },
 * ],
 * ```
 *
 */
@Injectable({ providedIn: 'root' })
export class AuthClientConfig {
  private config?: AuthConfig;

  constructor(@Optional() @Inject(AuthConfigService) config?: AuthConfig) {
    if (config) {
      this.set(config);
    }
  }

  /**
   * Sets configuration to be read by other consumers of the service (see usage notes)
   * @param config The configuration to set
   */
  set(config: AuthConfig): void {
    this.config = config;
  }

  /**
   * Gets the config that has been set by other consumers of the service
   */
  get(): AuthConfig {
    return this.config as AuthConfig;
  }
}

/**
 * Injection token for accessing configuration.
 *
 * @usageNotes
 *
 * Use the `Inject` decorator to access the configuration from a service or component:
 *
 * ```
 * class MyService(@Inject(AuthConfigService) config: AuthConfig) {}
 * ```
 */
export const AuthConfigService = new InjectionToken<AuthConfig>(
  'auth0-angular.config'
);
