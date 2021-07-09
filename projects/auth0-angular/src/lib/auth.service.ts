import { Injectable, Inject, OnDestroy } from '@angular/core';

import {
  Auth0Client,
  RedirectLoginOptions,
  PopupLoginOptions,
  PopupConfigOptions,
  LogoutOptions,
  GetTokenSilentlyOptions,
  GetTokenWithPopupOptions,
  RedirectLoginResult,
  LogoutUrlOptions,
} from '@auth0/auth0-spa-js';

import {
  of,
  from,
  Subject,
  Observable,
  iif,
  defer,
  ReplaySubject,
  throwError,
} from 'rxjs';

import {
  concatMap,
  tap,
  map,
  takeUntil,
  distinctUntilChanged,
  catchError,
  switchMap,
  withLatestFrom,
} from 'rxjs/operators';

import { Auth0ClientService } from './auth.client';
import { AbstractNavigator } from './abstract-navigator';
import { Location } from '@angular/common';
import { AuthClientConfig } from './auth.config';
import { AuthState } from './auth.state';

@Injectable({
  providedIn: 'root',
})
export class AuthService implements OnDestroy {
  // https://stackoverflow.com/a/41177163
  private ngUnsubscribe$ = new Subject<void>();
  /**
   * Emits boolean values indicating the loading state of the SDK.
   */
  readonly isLoading$ = this.authState.isLoading$;

  /**
   * Emits boolean values indicating the authentication state of the user. If `true`, it means a user has authenticated.
   * This depends on the value of `isLoading$`, so there is no need to manually check the loading state of the SDK.
   */
  readonly isAuthenticated$ = this.authState.isAuthenticated$;

  /**
   * Emits details about the authenticated user, or null if not authenticated.
   */
  readonly user$ = this.authState.user$;

  /**
   * Emits ID token claims when authenticated, or null if not authenticated.
   */
  readonly idTokenClaims$ = this.authState.idTokenClaims$;

  /**
   * Emits errors that occur during login, or when checking for an active session on startup.
   */
  readonly error$ = this.authState.error$;

  constructor(
    @Inject(Auth0ClientService) private auth0Client: Auth0Client,
    private configFactory: AuthClientConfig,
    private location: Location,
    private navigator: AbstractNavigator,
    private authState: AuthState
  ) {
    const checkSessionOrCallback$ = (isCallback: boolean) =>
      iif(
        () => isCallback,
        this.handleRedirectCallback(),
        defer(() => this.auth0Client.checkSession())
      );

    this.shouldHandleCallback()
      .pipe(
        switchMap((isCallback) =>
          checkSessionOrCallback$(isCallback).pipe(
            catchError((error) => {
              const config = this.configFactory.get();
              this.authState.setError(error);
              this.navigator.navigateByUrl(config.errorPath || '/');
              return of(undefined);
            })
          )
        ),
        tap(() => {
          this.authState.setIsLoading(false);
        }),
        takeUntil(this.ngUnsubscribe$)
      )
      .subscribe();
  }

  /**
   * Called when the service is destroyed
   */
  ngOnDestroy(): void {
    // https://stackoverflow.com/a/41177163
    this.ngUnsubscribe$.next();
    this.ngUnsubscribe$.complete();
  }

  /**
   * ```js
   * loginWithRedirect(options);
   * ```
   *
   * Performs a redirect to `/authorize` using the parameters
   * provided as arguments. Random and secure `state` and `nonce`
   * parameters will be auto-generated.
   *
   * @param options The login options
   */
  loginWithRedirect(options?: RedirectLoginOptions): Observable<void> {
    return from(this.auth0Client.loginWithRedirect(options));
  }

  /**
   * ```js
   * await loginWithPopup(options);
   * ```
   *
   * Opens a popup with the `/authorize` URL using the parameters
   * provided as arguments. Random and secure `state` and `nonce`
   * parameters will be auto-generated. If the response is successful,
   * results will be valid according to their expiration times.
   *
   * IMPORTANT: This method has to be called from an event handler
   * that was started by the user like a button click, for example,
   * otherwise the popup will be blocked in most browsers.
   *
   * @param options The login options
   * @param config Configuration for the popup window
   */
  loginWithPopup(
    options?: PopupLoginOptions,
    config?: PopupConfigOptions
  ): Observable<void> {
    return from(
      this.auth0Client.loginWithPopup(options, config).then(() => {
        this.authState.refresh();
      })
    );
  }

  /**
   * ```js
   * logout();
   * ```
   *
   * Clears the application session and performs a redirect to `/v2/logout`, using
   * the parameters provided as arguments, to clear the Auth0 session.
   * If the `federated` option is specified it also clears the Identity Provider session.
   * If the `localOnly` option is specified, it only clears the application session.
   * It is invalid to set both the `federated` and `localOnly` options to `true`,
   * and an error will be thrown if you do.
   * [Read more about how Logout works at Auth0](https://auth0.com/docs/logout).
   *
   * @param options The logout options
   */
  logout(options?: LogoutOptions): void {
    this.auth0Client.logout(options);

    if (options?.localOnly) {
      this.authState.refresh();
    }
  }

  /**
   * ```js
   * getAccessTokenSilently(options).subscribe(token => ...)
   * ```
   *
   * If there's a valid token stored, return it. Otherwise, opens an
   * iframe with the `/authorize` URL using the parameters provided
   * as arguments. Random and secure `state` and `nonce` parameters
   * will be auto-generated. If the response is successful, results
   * will be valid according to their expiration times.
   *
   * If refresh tokens are used, the token endpoint is called directly with the
   * 'refresh_token' grant. If no refresh token is available to make this call,
   * the SDK falls back to using an iframe to the '/authorize' URL.
   *
   * This method may use a web worker to perform the token call if the in-memory
   * cache is used.
   *
   * If an `audience` value is given to this function, the SDK always falls
   * back to using an iframe to make the token exchange.
   *
   * Note that in all cases, falling back to an iframe requires access to
   * the `auth0` cookie, and thus will not work in browsers that block third-party
   * cookies by default (Safari, Brave, etc).
   *
   * @param options The options for configuring the token fetch.
   */
  getAccessTokenSilently(
    options?: GetTokenSilentlyOptions
  ): Observable<string> {
    return of(this.auth0Client).pipe(
      concatMap((client) => client.getTokenSilently(options)),
      tap((token) => this.authState.setAccessToken(token)),
      catchError((error) => {
        this.authState.setError(error);
        this.authState.refresh();
        return throwError(error);
      })
    );
  }

  /**
   * ```js
   * getTokenWithPopup(options).subscribe(token => ...)
   * ```
   *
   * Get an access token interactively.
   *
   * Opens a popup with the `/authorize` URL using the parameters
   * provided as arguments. Random and secure `state` and `nonce`
   * parameters will be auto-generated. If the response is successful,
   * results will be valid according to their expiration times.
   */
  getAccessTokenWithPopup(
    options?: GetTokenWithPopupOptions
  ): Observable<string> {
    return of(this.auth0Client).pipe(
      concatMap((client) => client.getTokenWithPopup(options)),
      tap((token) => this.authState.setAccessToken(token)),
      catchError((error) => {
        this.authState.setError(error);
        this.authState.refresh();
        return throwError(error);
      })
    );
  }

  /**
   * ```js
   * handleRedirectCallback(url).subscribe(result => ...)
   * ```
   *
   * After the browser redirects back to the callback page,
   * call `handleRedirectCallback` to handle success and error
   * responses from Auth0. If the response is successful, results
   * will be valid according to their expiration times.
   *
   * Calling this method also refreshes the authentication and user states.
   *
   * @param url The URL to that should be used to retrieve the `state` and `code` values. Defaults to `window.location.href` if not given.
   */
  handleRedirectCallback(url?: string): Observable<RedirectLoginResult> {
    return defer(() => this.auth0Client.handleRedirectCallback(url)).pipe(
      withLatestFrom(this.authState.isLoading$),
      tap(([result, isLoading]) => {
        if (!isLoading) {
          this.authState.refresh();
        }
        const target = result?.appState?.target ?? '/';
        this.navigator.navigateByUrl(target);
      }),
      map(([result]) => result)
    );
  }

  /**
   * ```js
   * buildAuthorizeUrl().subscribe(url => ...)
   * ```
   *
   * Builds an `/authorize` URL for loginWithRedirect using the parameters
   * provided as arguments. Random and secure `state` and `nonce`
   * parameters will be auto-generated.
   * @param options The options
   * @returns A URL to the authorize endpoint
   */
  buildAuthorizeUrl(options?: RedirectLoginOptions): Observable<string> {
    return defer(() => this.auth0Client.buildAuthorizeUrl(options));
  }

  /**
   * ```js
   * buildLogoutUrl().subscribe(url => ...)
   * ```
   * Builds a URL to the logout endpoint.
   *
   * @param options The options used to configure the parameters that appear in the logout endpoint URL.
   * @returns a URL to the logout endpoint using the parameters provided as arguments.
   */
  buildLogoutUrl(options?: LogoutUrlOptions): Observable<string> {
    return of(this.auth0Client.buildLogoutUrl(options));
  }

  private shouldHandleCallback(): Observable<boolean> {
    return of(this.location.path()).pipe(
      map((search) => {
        return (
          (search.includes('code=') || search.includes('error=')) &&
          search.includes('state=') &&
          !this.configFactory.get().skipRedirectCallback
        );
      })
    );
  }
}
