import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  CanActivate,
  CanLoad,
  Route,
  UrlSegment,
  CanActivateChild,
} from '@angular/router';
import { Observable } from 'rxjs';
import { tap, take, withLatestFrom, map } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate, CanLoad, CanActivateChild {
  constructor(private auth: AuthService) {}

  canLoad(route: Route, segments: UrlSegment[]): Observable<boolean> {
    return this.auth.isAuthenticated$.pipe(take(1));
  }

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.redirectIfUnauthenticated(state);
  }

  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.redirectIfUnauthenticated(state);
  }

  private redirectIfUnauthenticated(
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.auth.isAuthenticated$.pipe(
      withLatestFrom(this.auth.isAuthenticatedHint$),
      tap(([loggedIn, isAuthenticatedHint]) => {
        if (!loggedIn && isAuthenticatedHint) {
          this.auth.loginWithRedirect({
            appState: { target: state.url },
          });
        } else if (!isAuthenticatedHint) {
          // TODO: Remove logging.
          console.log('Not sure if user is logged in, not doing anything automatically. Cancelling route.');
        }
      }),
      map(([loggedIn]) => loggedIn)
    );
  }
}
