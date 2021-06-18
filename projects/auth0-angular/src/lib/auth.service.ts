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
  GenericError,
} from '@auth0/auth0-spa-js';

import {
  of,
  from,
  BehaviorSubject,
  Subject,
  Observable,
  iif,
  defer,
  ReplaySubject,
  merge,
  throwError,
} from 'rxjs';

import {
  concatMap,
  tap,
  map,
  filter,
  takeUntil,
  distinctUntilChanged,
  catchError,
  switchMap,
  mergeMap,
  scan,
  withLatestFrom,
} from 'rxjs/operators';

import { Auth0ClientService } from './auth.client';
import { AbstractNavigator } from './abstract-navigator';
import { Location } from '@angular/common';
import { AuthClientConfig } from './auth.config';

@Injectable({
  providedIn: 'root',
})
export class AuthService implements OnDestroy {
  private isLoadingSubject$ = new BehaviorSubject<boolean>(true);
  private errorSubject$ = new ReplaySubject<GenericError>(1);
  private refreshState$ = new Subject<void>();
  private accessToken$ = new ReplaySubject<string>(1);
  private appStateSubject$ = new ReplaySubject<any>(1);

  // https://stackoverflow.com/a/41177163
  private ngUnsubscribe$ = new Subject<void>();
  /**
   * Emits boolean values indicating the loading state of the SDK.
   */
  readonly isLoading$ = this.isLoadingSubject$.asObservable();

  /**
   * Trigger used to pull User information from the Auth0Client.
   * Triggers when the access token has changed.
   */
  private accessTokenTrigger$ = this.accessToken$.pipe(
    scan(
      (
        acc: { current: string | null; previous: string | null },
        current: string | null
      ) => {
        return {
          previous: acc.current,
          current,
        };
      },
      { current: null, previous: null }
    ),
    filter(({ previous, current }) => previous !== current)
  );

  /**
   * Trigger used to pull User information from the Auth0Client.
   * Triggers when an event occurs that needs to retrigger the User Profile information.
   * Events: Login, Access Token change and Logout
   */
  private isAuthenticatedTrigger$ = this.isLoading$.pipe(
    filter((loading) => !loading),
    distinctUntilChanged(),
    switchMap(() =>
      // To track the value of isAuthenticated over time, we need to merge:
      //  - the current value
      //  - the value whenever the access token changes. (this should always be true of there is an access token
      //    but it is safer to pass this through this.auth0Client.isAuthenticated() nevertheless)
      //  - the value whenever refreshState$ emits
      merge(
        defer(() => this.auth0Client.isAuthenticated()),
        this.accessTokenTrigger$.pipe(
          mergeMap(() => this.auth0Client.isAuthenticated())
        ),
        this.refreshState$.pipe(
          mergeMap(() => this.auth0Client.isAuthenticated())
        )
      )
    )
  );

  /**
   * Emits boolean values indicating the authentication state of the user. If `true`, it means a user has authenticated.
   * This depends on the value of `isLoading$`, so there is no need to manually check the loading state of the SDK.
   */
  readonly isAuthenticated$ = this.isAuthenticatedTrigger$.pipe(
    distinctUntilChanged()
  );

  /**
   * Emits details about the authenticated user, or null if not authenticated.
   */
  readonly user$ = this.isAuthenticatedTrigger$.pipe(
    concatMap((authenticated) =>
      authenticated ? this.auth0Client.getUser() : of(null)
    )
  );

  /**
   * Emits ID token claims when authenticated, or null if not authenticated.
   */
  readonly idTokenClaims$ = this.isAuthenticatedTrigger$.pipe(
    concatMap((authenticated) =>
      authenticated ? this.auth0Client.getIdTokenClaims() : of(null)
    )
  );

  /**
   * Emits errors that occur during login, or when checking for an active session on startup.
   */
  readonly error$ = this.errorSubject$.asObservable();

  /**
   * Emits the value (if any) that was passed to the `loginWithRedirect` method call
   * but only **after** `handleRedirectCallback` is first called
   */
  readonly appState$ = this.appStateSubject$.asObservable();

  constructor(
    @Inject(Auth0ClientService) private auth0Client: Auth0Client,
    private configFactory: AuthClientConfig,
    private location: Location,
    private navigator: AbstractNavigator
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
              this.errorSubject$.next(error);
              this.navigator.navigateByUrl(config.errorPath || '/');
              return of(undefined);
            })
          )
        ),
        tap(() => {
          this.isLoadingSubject$.next(false);
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
        this.refreshState$.next();
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
      this.refreshState$.next();
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
      tap((token) => this.accessToken$.next(token)),
      catchError((error) => {
        this.errorSubject$.next(error);
        this.refreshState$.next();
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
      tap((token) => this.accessToken$.next(token)),
      catchError((error) => {
        this.errorSubject$.next(error);
        this.refreshState$.next();
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
      withLatestFrom(this.isLoadingSubject$),
      tap(([result, isLoading]) => {
        if (!isLoading) {
          this.refreshState$.next();
        }
        const appState = result?.appState;
        const target = appState?.target ?? '/';

        if (appState) {
          this.appStateSubject$.next(appState);
        }

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
