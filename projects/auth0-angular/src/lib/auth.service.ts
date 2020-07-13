import { Injectable, Inject, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthConfigService, AuthConfig } from './auth.config';

import {
  Auth0Client,
  RedirectLoginOptions,
  PopupLoginOptions,
  PopupConfigOptions,
  RedirectLoginResult,
} from '@auth0/auth0-spa-js';

import { of, from, BehaviorSubject, Subject } from 'rxjs';

import { concatMap, tap, map, filter, take, takeUntil } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AuthService implements OnDestroy {
  private auth0Client: Auth0Client;
  private userSubject$ = new BehaviorSubject<any>(null);

  // https://stackoverflow.com/a/41177163
  private ngUnsubscribe$ = new Subject();

  user$ = this.userSubject$.asObservable();

  constructor(
    @Inject(AuthConfigService) config: AuthConfig,
    private router: Router
  ) {
    const { redirectUri, clientId, maxAge, ...rest } = config;

    this.auth0Client = new Auth0Client({
      redirect_uri: redirectUri,
      client_id: clientId,
      max_age: maxAge,
      ...rest,
    });

    // Handle callback
    this.handleRedirectCallback$()
      .pipe(takeUntil(this.ngUnsubscribe$))
      .subscribe();
  }

  ngOnDestroy() {
    this.ngUnsubscribe$.next();
    this.ngUnsubscribe$.complete();
  }

  loginWithRedirect(options?: RedirectLoginOptions): void {
    this.auth0Client.loginWithRedirect(options);
  }

  loginWithPopup(options?: PopupLoginOptions, config?: PopupConfigOptions) {
    return from(this.auth0Client.loginWithPopup(options, config));
  }

  private shouldHandleCallback() {
    return of(window.location.search).pipe(
      map((search) => search.includes('code=') && search.includes('state='))
    );
  }

  private handleLocalRedirect$(result: RedirectLoginResult) {
    return from(this.router.navigateByUrl('/'));
  }

  private handleRedirectCallback$() {
    return this.shouldHandleCallback().pipe(
      filter((value) => value),
      take(1), // not sure if this is needed
      concatMap(() =>
        from(this.auth0Client.handleRedirectCallback()).pipe(
          concatMap((result) => this.handleLocalRedirect$(result)),
          tap(() => console.log('Callback handled'))
        )
      )
    );
  }
}
