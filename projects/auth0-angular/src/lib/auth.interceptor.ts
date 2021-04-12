import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
} from '@angular/common/http';

import { Observable, from, of, iif, throwError } from 'rxjs';
import { Injectable } from '@angular/core';

import {
  ApiRouteDefinition,
  isHttpInterceptorRouteConfig,
  AuthClientConfig,
  HttpInterceptorConfig,
} from './auth.config';

import { switchMap, first, concatMap, pluck, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { GetTokenSilentlyOptions } from '@auth0/auth0-spa-js';

@Injectable()
export class AuthHttpInterceptor implements HttpInterceptor {
  constructor(
    private configFactory: AuthClientConfig,
    private authService: AuthService
  ) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const config = this.configFactory.get();
    if (!config.httpInterceptor?.allowedList) {
      return next.handle(req);
    }

    return this.findMatchingRoute(req, config.httpInterceptor).pipe(
      concatMap((route) =>
        iif(
          // Check if a route was matched
          () => route !== null,
          // If we have a matching route, call getTokenSilently and attach the token to the
          // outgoing request
          of(route).pipe(
            pluck('tokenOptions'),
            concatMap<GetTokenSilentlyOptions, Observable<string>>((options) =>
              this.authService.getAccessTokenSilently(options).pipe(
                catchError((err) => {
                  if (
                    route &&
                    isHttpInterceptorRouteConfig(route) &&
                    route.allowAnonymous
                  ) {
                    return of('');
                  }

                  return throwError(err);
                })
              )
            ),
            switchMap((token: string) => {
              // Clone the request and attach the bearer token
              const clone = token
                ? req.clone({
                    headers: req.headers.set(
                      'Authorization',
                      `Bearer ${token}`
                    ),
                  })
                : req;

              return next.handle(clone);
            })
          ),
          // If the URI being called was not found in our httpInterceptor config, simply
          // pass the request through without attaching a token
          next.handle(req)
        )
      )
    );
  }

  /**
   * Strips the query and fragment from the given uri
   * @param uri The uri to remove the query and fragment from
   */
  private stripQueryFrom(uri: string): string {
    if (uri.indexOf('?') > -1) {
      uri = uri.substr(0, uri.indexOf('?'));
    }

    if (uri.indexOf('#') > -1) {
      uri = uri.substr(0, uri.indexOf('#'));
    }

    return uri;
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
    const testPrimitive = (value: string | undefined): boolean => {
      if (!value) {
        return false;
      }

      const requestPath = this.stripQueryFrom(request.url);

      if (value === requestPath) {
        return true;
      }

      // If the URL ends with an asterisk, match using startsWith.
      return (
        value.indexOf('*') === value.length - 1 &&
        request.url.startsWith(value.substr(0, value.length - 1))
      );
    };

    if (isHttpInterceptorRouteConfig(route)) {
      if (route.httpMethod && route.httpMethod !== request.method) {
        return false;
      }

      /* istanbul ignore if */
      if (!route.uri && !route.uriMatcher) {
        console.warn(
          'Either a uri or uriMatcher is required when configuring the HTTP interceptor.'
        );
      }

      return route.uriMatcher
        ? route.uriMatcher(request.url)
        : testPrimitive(route.uri);
    }

    return testPrimitive(route);
  }

  /**
   * Tries to match a route from the SDK configuration to the HTTP request.
   * If a match is found, the route configuration is returned.
   * @param request The Http request
   * @param config HttpInterceptorConfig
   */
  private findMatchingRoute(
    request: HttpRequest<any>,
    config: HttpInterceptorConfig
  ): Observable<ApiRouteDefinition | null> {
    return from(config.allowedList).pipe(
      first((route) => this.canAttachToken(route, request), null)
    );
  }
}
