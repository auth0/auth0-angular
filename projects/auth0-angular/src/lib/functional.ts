import { HttpEvent, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthGuard } from './auth.guard';
import { AuthHttpInterceptor } from './auth.interceptor';

/**
 * Functional AuthGuard to ensure routes can only be accessed when authenticated.
 *
 * Note: Should only be used as of Angular 15
 *
 * @param route Contains the information about a route associated with a component loaded in an outlet at a particular moment in time.
 * @param state Represents the state of the router at a moment in time.
 * @returns An Observable, indicating if the route can be accessed or not
 */
export const authGuardFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => inject(AuthGuard).canActivate(route, state);

/**
 * Functional AuthHttpInterceptor to include the access token in matching requests.
 *
 * Note: Should only be used as of Angular 15
 *
 * @param req An outgoing HTTP request with an optional typed body.
 * @param handle Represents the next interceptor in an interceptor chain, or the real backend if there are no
 * further interceptors.
 * @returns An Observable representing the intercepted HttpRequest
 */
export const authHttpInterceptorFn = (
  req: HttpRequest<any>,
  handle: (req: HttpRequest<unknown>) => Observable<HttpEvent<unknown>>
) => inject(AuthHttpInterceptor).intercept(req, { handle });
