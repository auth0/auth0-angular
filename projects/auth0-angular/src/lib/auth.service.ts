import { Injectable, Inject, OnDestroy } from '@angular/core';

import {
  Auth0Client,
  PopupLoginOptions,
  PopupConfigOptions,
  GetTokenSilentlyOptions,
  GetTokenWithPopupOptions,
  RedirectLoginResult,
  GetTokenSilentlyVerboseResponse,
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
  catchError,
  switchMap,
  withLatestFrom,
  filter,
  take,
} from 'rxjs/operators';

import { Auth0ClientService } from './auth.client';
import { AbstractNavigator } from './abstract-navigator';
import { AuthClientConfig, AppState } from './auth.config';
import { AuthState } from './auth.state';
import { LogoutOptions, RedirectLoginOptions } from './interfaces';
import { RefreshState } from './refresh-state';
@Injectable({
  providedIn: 'root',
})
export class AuthService<TAppState extends AppState = AppState>
  implements OnDestroy
{
  private appStateSubject$ = new ReplaySubject<TAppState>(1);

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

  /**
   * Emits the value (if any) that was passed to the `loginWithRedirect` method call
   * but only **after** `handleRedirectCallback` is first called
   */
  readonly appState$ = this.appStateSubject$.asObservable();

  constructor(
    @Inject(Auth0ClientService) private auth0Client: Auth0Client,
    private configFactory: AuthClientConfig,
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
              this.navigator.navigateByUrl(config.errorPath || '/');
              this.authState.setError(error);
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
  loginWithRedirect(
    options?: RedirectLoginOptions<TAppState>
  ): Observable<void> {
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
   * If the `openUrl` option is set to false, it only clears the application session.
   * It is invalid to set both the `federated` to true and `openUrl` to `false`,
   * and an error will be thrown if you do.
   * [Read more about how Logout works at Auth0](https://auth0.com/docs/logout).
   *
   * @param options The logout options
   */
  logout(options?: LogoutOptions): Observable<void> {
    return from(this.auth0Client.logout(options)).pipe(
      concatMap(() => {
        if (options?.openUrl === undefined) {
          return of(undefined);
        }

        this.authState.refresh();
        return this.authState.refresh$.pipe(
          filter((state) => state === RefreshState.Complete),
          take(1),
          map(() => undefined)
        );
      })
    );
  }

  /**
   * Fetches a new access token and returns the response from the /oauth/token endpoint, omitting the refresh token.
   *
   * @param options The options for configuring the token fetch.
   */
  getAccessTokenSilently(
    options: GetTokenSilentlyOptions & { detailedResponse: true }
  ): Observable<GetTokenSilentlyVerboseResponse>;

  /**
   * Fetches a new access token and returns it.
   *
   * @param options The options for configuring the token fetch.
   */
  getAccessTokenSilently(options?: GetTokenSilentlyOptions): Observable<string>;

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
    options: GetTokenSilentlyOptions = {}
  ): Observable<string | GetTokenSilentlyVerboseResponse> {
    return of(this.auth0Client).pipe(
      concatMap((client) =>
        options.detailedResponse === true
          ? client.getTokenSilently({ ...options, detailedResponse: true })
          : client.getTokenSilently(options)
      ),
      tap((token) => {
        if (token) {
          this.authState.setAccessToken(
            typeof token === 'string' ? token : token.access_token
          );
        }
      }),
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
  ): Observable<string | undefined> {
    return of(this.auth0Client).pipe(
      concatMap((client) => client.getTokenWithPopup(options)),
      tap((token) => {
        if (token) {
          this.authState.setAccessToken(token);
        }
      }),
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
  handleRedirectCallback(
    url?: string
  ): Observable<RedirectLoginResult<TAppState>> {
    return defer(() =>
      this.auth0Client.handleRedirectCallback<TAppState>(url)
    ).pipe(
      withLatestFrom(this.authState.isLoading$),
      concatMap(([result, isLoading]) => {
        const appState = result?.appState;
        const target = appState?.target ?? '/';

        if (appState) {
          this.appStateSubject$.next(appState);
        }

        if (isLoading) {
          this.navigator.navigateByUrl(target);
          return of(result);
        }

        this.authState.refresh();

        // Wait for the refresh to complete before navigating
        return this.authState.refresh$.pipe(
          filter((state) => state === RefreshState.Complete),
          take(1),
          // Wait for the refresh to complete before navigating,
          // otherwise an auth.guard could have a stale isAuthenticated value
          tap(() => this.navigator.navigateByUrl(target)),
          map(() => result)
        );
      })
    );
  }

  private shouldHandleCallback(): Observable<boolean> {
    return of(location.search).pipe(
      map((search) => {
        const searchParams = new URLSearchParams(search);
        return (
          (searchParams.has('code') || searchParams.has('error')) &&
          searchParams.has('state') &&
          !this.configFactory.get().skipRedirectCallback
        );
      })
    );
  }
}
