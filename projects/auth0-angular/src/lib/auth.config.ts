import { CacheLocation, GetTokenSilentlyOptions } from '@auth0/auth0-spa-js';
import { InjectionToken } from '@angular/core';

/**
 * Defines the type for a route config entry. Can either be:
 *
 * - an object of type HttpInterceptorConfig
 * - a string
 * - a regular expression
 */
export type ApiRouteDefinition = HttpInterceptorRouteConfig | string | RegExp;

/**
 * A custom type guard to help identify route definitions that are actually HttpInterceptorRouteConfig types.
 * @param def The route definition type
 */
export function isHttpInterceptorRouteConfig(
  def: ApiRouteDefinition
): def is HttpInterceptorRouteConfig {
  return (def as HttpInterceptorRouteConfig).uri !== undefined;
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
   * The URL to test, either by using a regex or by supplying the whole URL to match.
   * If `test` is a match for the current request URL from the HTTP client, then
   * an access token is attached to the request in the
   *  ["Authorization" header](https://tools.ietf.org/html/draft-ietf-oauth-v2-bearer-20#section-2.1).
   *
   * If the test does not pass, the request proceeds without the access token attached.
   */
  uri: string | RegExp;

  /**
   * The options that are passed to the SDK when retrieving the
   * access token to attach to the outgoing request.
   */
  tokenOptions?: GetTokenSilentlyOptions;
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
   * If you need to send custom parameters to the Authorization Server,
   * make sure to use the original parameter name.
   */
  [key: string]: any;
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
