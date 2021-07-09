import { Inject, Injectable } from '@angular/core';
import { Auth0Client } from '@auth0/auth0-spa-js';
import {
  BehaviorSubject,
  defer,
  merge,
  of,
  ReplaySubject,
  Subject,
} from 'rxjs';
import {
  concatMap,
  distinctUntilChanged,
  filter,
  mergeMap,
  scan,
  switchMap,
} from 'rxjs/operators';
import { Auth0ClientService } from './auth.client';

/**
 * @ignore
 */
@Injectable({ providedIn: 'root' })
export class AuthState {
  private isLoadingSubject$ = new BehaviorSubject<boolean>(true);
  private refresh$ = new Subject<void>();
  private accessToken$ = new ReplaySubject<string>(1);
  private errorSubject$ = new ReplaySubject<Error>(1);

  /**
   * Emits boolean values indicating the loading state of the SDK.
   */
  public readonly isLoading$ = this.isLoadingSubject$.asObservable();

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
  private readonly isAuthenticatedTrigger$ = this.isLoading$.pipe(
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
        this.refresh$.pipe(mergeMap(() => this.auth0Client.isAuthenticated()))
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
  public readonly error$ = this.errorSubject$.asObservable();

  constructor(@Inject(Auth0ClientService) private auth0Client: Auth0Client) {}

  public setIsLoading(isLoading: boolean) {
    this.isLoadingSubject$.next(isLoading);
  }

  /**
   * Refresh the state to ensure the `isAuthenticated`, `user$` and `idTokenClaims$`
   * reflect the most up-to-date values from  Auth0Client.
   */
  public refresh() {
    this.refresh$.next();
  }

  /**
   * Update the access token, doing so will also refresh the state.
   * @param accessToken The new Access Token
   */
  public setAccessToken(accessToken: string) {
    this.accessToken$.next(accessToken);
  }

  /**
   * Emits the error in the `error$` observable.
   * @param error The new error
   */
  public setError(error: any) {
    this.errorSubject$.next(error);
  }
}
