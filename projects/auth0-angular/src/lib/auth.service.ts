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
} from 'rxjs/operators';

import { Auth0ClientService } from './auth.client';
import { AbstractNavigator } from './abstract-navigator';
import { Location } from '@angular/common';
import { AuthClientConfig } from './auth.config';

@Injectable({
  providedIn: 'root',
})
export class AuthService implements OnDestroy {
  private isLoadingSubject$ = new BehaviorSubject(true);
  private isAuthenticatedSubject$ = new BehaviorSubject(false);
  private errorSubject$ = new ReplaySubject<Error>(1);

  // https://stackoverflow.com/a/41177163
  private ngUnsubscribe$ = new Subject();

  /**
   * Emits boolean values indicating the loading state of the SDK.
   */
  readonly isLoading$ = this.isLoadingSubject$.asObservable();

  /**
   * Emits boolean values indicating the authentication state of the user. If `true`, it means a user has authenticated.
   * This depends on the value of `isLoading$`, so there is no need to manually check the loading state of the SDK.
   */
  readonly isAuthenticated$ = this.isLoading$.pipe(
    filter((loading) => !loading),
    distinctUntilChanged(),
    concatMap(() => this.isAuthenticatedSubject$)
  );

  /**
   * Emits details about the authenticated user when `isAuthenticated$` is `true`.
   */
  readonly user$ = this.isAuthenticated$.pipe(
    filter((authenticated) => authenticated),
    distinctUntilChanged(),
    concatMap(() => this.auth0Client.getUser())
  );

  /**
   * Emits ID token claims when `isAuthenticated$` is `true`.
   */
  readonly idTokenClaims$ = this.isAuthenticated$.pipe(
    filter((authenticated) => authenticated),
    distinctUntilChanged(),
    concatMap(() => this.auth0Client.getIdTokenClaims())
  );

  /**
   * Emits errors that occur during login, or when checking for an active session on startup.
   */
  readonly error$ = this.errorSubject$.asObservable();

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
              this.errorSubject$.next(error);
              this.navigator.navigateByUrl('/');
              return of(undefined);
            })
          )
        ),
        concatMap(() => this.auth0Client.isAuthenticated()),
        tap((authenticated) => {
          this.isAuthenticatedSubject$.next(authenticated);
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
      this.auth0Client.loginWithPopup(options, config).then(async () => {
        this.isAuthenticatedSubject$.next(
          await this.auth0Client.isAuthenticated()
        );
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
      this.isAuthenticatedSubject$.next(false);
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
      concatMap((client) => client.getTokenSilently(options))
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
      concatMap((client) => client.getTokenWithPopup(options))
    );
  }

  private shouldHandleCallback(): Observable<boolean> {
    return of(this.location.path()).pipe(
      map((search) => {
        return (
          (search.includes('code=') || search.includes('error=')) &&
          search.includes('state=') &&
          !this.configFactory.get()?.skipRedirectCallback
        );
      })
    );
  }

  private handleRedirectCallback(): Observable<RedirectLoginResult> {
    return defer(() => this.auth0Client.handleRedirectCallback()).pipe(
      tap((result) => {
        const target = result?.appState?.target ?? '/';
        this.navigator.navigateByUrl(target);
      })
    );
  }
}
