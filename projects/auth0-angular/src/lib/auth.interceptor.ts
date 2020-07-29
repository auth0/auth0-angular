import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
} from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { Injectable, Inject } from '@angular/core';
import {
  AuthConfig,
  AuthConfigService,
  HttpInterceptorRouteConfig,
} from './auth.config';
import { Auth0ClientService } from './auth.client';
import { Auth0Client } from '@auth0/auth0-spa-js';
import { switchMap } from 'rxjs/operators';

@Injectable()
export class AuthHttpInterceptor implements HttpInterceptor {
  constructor(
    @Inject(AuthConfigService) private config: AuthConfig,
    @Inject(Auth0ClientService) private auth0Client: Auth0Client
  ) {}

  /**
   * Tries to match a route from the SDK configuration to the HTTP request.
   * If a match is found, the route configuration is returned.
   * @param request The Http request
   */
  private matchRequest(request: HttpRequest<any>): HttpInterceptorRouteConfig {
    let routeMatch: HttpInterceptorRouteConfig;

    for (const match of this.config.httpInterceptor.allowedList) {
      if (match.test instanceof RegExp) {
        if (match.test.test(request.url)) {
          routeMatch = match;
          break;
        }
      } else if (match.test === request.url) {
        routeMatch = match;
        break;
      }
    }

    return routeMatch;
  }

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    if (this.config.httpInterceptor?.allowedList) {
      const routeMatch = this.matchRequest(req);

      if (routeMatch) {
        return from(this.auth0Client.getTokenSilently()).pipe(
          switchMap((token) => {
            const clone = req.clone({
              headers: req.headers.set('Authorization', `Bearer ${token}`),
            });

            return next.handle(clone);
          })
        );
      }
    }

    return next.handle(req);
  }
}
