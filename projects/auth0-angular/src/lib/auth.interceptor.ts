import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
} from '@angular/common/http';

import { Observable, from, of, iif } from 'rxjs';
import { Injectable, Inject } from '@angular/core';

import {
  HttpInterceptorRouteConfig,
  ApiRouteDefinition,
  isHttpInterceptorRouteConfig,
  AuthClientConfig,
  AuthConfig,
} from './auth.config';

import { Auth0ClientService } from './auth.client';
import { Auth0Client } from '@auth0/auth0-spa-js';
import { switchMap, first, concatMap, pluck } from 'rxjs/operators';

@Injectable()
export class AuthHttpInterceptor implements HttpInterceptor {
  constructor(
    private configFactory: AuthClientConfig,
    @Inject(Auth0ClientService) private auth0Client: Auth0Client
  ) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const config = this.configFactory.get();
    if (!config.httpInterceptor?.allowedList) {
      return next.handle(req);
    }

    return this.findMatchingRoute(req, config).pipe(
      concatMap((route) =>
        iif(
          // Check if a route was matched
          () => route !== null,
          // If we have a matching route, call getTokenSilently and attach the token to the
          // outgoing request
          of(route).pipe(
            pluck('tokenOptions'),
            concatMap((options) => this.auth0Client.getTokenSilently(options)),
            switchMap((token: string) => {
              // Clone the request and attach the bearer token
              const clone = req.clone({
                headers: req.headers.set('Authorization', `Bearer ${token}`),
              });

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
    const testPrimitive = (value: string) => {
      if (value) {
        value.trim();
      }

      if (!value) {
        return false;
      }

      const requestPath = this.stripQueryFrom(request.url);

      if (value === requestPath) {
        return true;
      }

      // If the URL ends with an asterisk, match using startsWith.
      if (
        value.indexOf('*') === value.length - 1 &&
        request.url.startsWith(value.substr(0, value.length - 1))
      ) {
        return true;
      }
    };

    if (isHttpInterceptorRouteConfig(route)) {
      if (route.httpMethod && route.httpMethod !== request.method) {
        return false;
      }

      return testPrimitive(route.uri);
    }

    return testPrimitive(route);
  }

  /**
   * Tries to match a route from the SDK configuration to the HTTP request.
   * If a match is found, the route configuration is returned.
   * @param request The Http request
   */
  private findMatchingRoute(
    request: HttpRequest<any>,
    config: AuthConfig
  ): Observable<HttpInterceptorRouteConfig> {
    return from(config.httpInterceptor.allowedList).pipe(
      first((route) => this.canAttachToken(route, request), null)
    );
  }
}
