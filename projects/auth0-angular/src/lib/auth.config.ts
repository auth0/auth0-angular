import {
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
export interface AuthConfig {
  /**
   * Your Auth0 account domain such as `'example.auth0.com'`,
   * `'example.eu.auth0.com'` or , `'example.mycompany.com'`
   * (when using [custom domains](https://auth0.com/docs/custom-domains))
   */
  domain: string;

  /**
   * The issuer to be used for validation of JWTs, optionally defaults to the domain above
   */
  issuer?: string;

  /**
   * The Client ID found on your Application settings page
   */
  clientId: string;

  /**
   * The default URL where Auth0 will redirect your browser to with
   * the authentication result. It must be added to the
   * "Allowed Callback URLs" field in your Auth0 Application's
   * settings. If not provided here, it should be provided in the other
   * methods that provide authentication.
   */
  redirectUri?: string;

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
   * The value in seconds used to account for clock skew in JWT expirations.
   * Typically, this value is no more than a minute or two at maximum.
   * Defaults to 60s.
   */
  leeway?: number;

  /**
   * The location to use when storing cache data. Valid values are `memory` or `localstorage`.
   * The default setting is `memory`.
   */
  cacheLocation?: CacheLocation;

  /**
   * Specify a custom cache implementation to use for token storage and retrieval.
   * This setting takes precedence over `cacheLocation` if they are both specified.
   *
   * Read more about [creating a custom cache](https://github.com/auth0/auth0-spa-js#creating-a-custom-cache)
   */
  cache?: ICache;

  /**
   * If true, refresh tokens are used to fetch new access tokens from the Auth0 server.
   * If false, the legacy technique of using a hidden iframe and the `authorization_code` grant with `prompt=none` is used.
   * The default setting is `false`.
   *
   * **Note**: Use of refresh tokens must be enabled by an administrator on your Auth0 client application.
   */
  useRefreshTokens?: boolean;

  /**
   * A maximum number of seconds to wait before declaring background calls to /authorize as failed for timeout
   * Defaults to 60s.
   */
  authorizeTimeoutInSeconds?: number;

  /**
   * Changes to recommended defaults, like defaultScope
   */
  advancedOptions?: {
    /**
     * The default scope to be included with all requests.
     * If not provided, 'openid profile email' is used. This can be set to `null` in order to effectively remove the default scopes.
     *
     * Note: The `openid` scope is **always applied** regardless of this setting.
     */
    defaultScope?: string;
  };

  /**
   * Maximum allowable elapsed time (in seconds) since authentication.
   * If the last time the user authenticated is greater than this value,
   * the user must be reauthenticated.
   */
  maxAge?: string | number;

  /**
   * The default scope to be used on authentication requests.
   * The defaultScope defined in the Auth0Client is included
   * along with this scope
   */
  scope?: string;

  /**
   * The default audience to be used for requesting API access.
   */
  audience?: string;

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

  /**
   * The Id of an organization to log in to
   *
   * This will specify an `organization` parameter in your user's login request and will add a step to validate
   * the `org_id` claim in your user's ID Token.
   */
  organization?: string;

  /**
   * The Id of an invitation to accept.
   *
   * This is available from the user invitation URL that is given when participating in a user invitation flow.
   */
  invitation?: string;

  /**
   * The name of the connection configured for your application.
   * If null, it will redirect to the Auth0 Login Page and show
   * the Login Widget.
   */
  connection?: string;

  /**
   * Modify the value used as the current time during the token validation.
   *
   * **Note**: Using this improperly can potentially compromise the token validation.
   */
  nowProvider?: () => Promise<number> | number;

  /**
   * If you need to send custom parameters to the Authorization Server,
   * make sure to use the original parameter name.
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
