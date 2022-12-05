import { Inject, Injectable, Optional, VERSION } from '@angular/core';
import { Auth0Client } from '@auth0/auth0-spa-js';
import { AuthClientConfig, AuthConfig, LAZY_LOAD_TOKEN } from './auth.config';
import useragent from '../useragent';
import { Observable, race, throwError, timer } from 'rxjs';
import { map, mergeMap, shareReplay, take } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthClient {
  private instance$ = race(
    this.config.config$.pipe(
      map((config) => this.createClient(config)),
      shareReplay(1)
    ),
    timer(this.lazy ? 15000 : 0).pipe(
      mergeMap(() =>
        throwError(
          new Error(
            'Configuration must be specified either through AuthModule.forRoot or through AuthClientConfig.set'
          )
        )
      )
    )
  );

  constructor(
    private config: AuthClientConfig,
    @Inject(LAZY_LOAD_TOKEN) private lazy: boolean
  ) {}

  getInstance$(): Observable<Auth0Client> {
    return this.instance$.pipe(take(1));
  }

  private createClient(config: AuthConfig): Auth0Client {
    return new Auth0Client({
      ...config,
      auth0Client: {
        name: useragent.name,
        version: useragent.version,
        env: {
          'angular/core': VERSION.full,
        },
      },
    });
  }
}
