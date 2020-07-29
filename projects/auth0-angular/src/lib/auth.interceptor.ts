import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
} from '@angular/common/http';

import { Observable, from, of, iif } from 'rxjs';
import { Injectable, Inject } from '@angular/core';

import {
  AuthConfig,
  AuthConfigService,
  HttpInterceptorRouteConfig,
  ApiRouteDefinition,
} from './auth.config';

import { Auth0ClientService } from './auth.client';
import { Auth0Client } from '@auth0/auth0-spa-js';
import { switchMap, first, concatMap, map, pluck } from 'rxjs/operators';

@Injectable()
export class AuthHttpInterceptor implements HttpInterceptor {
  constructor(
    @Inject(AuthConfigService) private config: AuthConfig,
    @Inject(Auth0ClientService) private auth0Client: Auth0Client
  ) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    if (!this.config.httpInterceptor?.allowedList) {
      return next.handle(req);
    }

    return this.findMatchingRoute(req).pipe(
      concatMap((route) =>
        iif(
          () => route !== null,
          of(route).pipe(
            map(({ uri, ...options }) => options),
            concatMap((options) => this.auth0Client.getTokenSilently(options)),
            switchMap((token: string) => {
              const clone = req.clone({
                headers: req.headers.set('Authorization', `Bearer ${token}`),
              });

              return next.handle(clone);
            })
          ),
          next.handle(req)
        )
      )
    );
  }

  /**
   * Determines whether the specified route can have an access token attached to it, based on matching the HTTP request against
   * the interceptor route configuration.
   * @param route The route to test
   * @param request The HTTP request
   */
  private canAttachToken(
    route: ApiRouteDefinition,
    request: HttpRequest<any>
  ): boolean {
    const testPrimitive = (value: string | RegExp) => {
      if (value instanceof RegExp) {
        if (value.test(request.url)) {
          return true;
        }
      } else if (value === request.url) {
        return true;
      }
    };

    if ((route as HttpInterceptorRouteConfig).uri) {
      const r = route as HttpInterceptorRouteConfig;
      return testPrimitive(r.uri);
    }

    return testPrimitive(route as string | RegExp);
  }

  /**
   * Tries to match a route from the SDK configuration to the HTTP request.
   * If a match is found, the route configuration is returned.
   * @param request The Http request
   */
  private findMatchingRoute(
    request: HttpRequest<any>
  ): Observable<HttpInterceptorRouteConfig> {
    return from(this.config.httpInterceptor.allowedList).pipe(
      first((route) => this.canAttachToken(route, request), null)
    );
  }
}
