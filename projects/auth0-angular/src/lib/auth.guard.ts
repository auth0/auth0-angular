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
import { Observable, of } from 'rxjs';
import { take, switchMap, map } from 'rxjs/operators';
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
      switchMap((loggedIn) => {
        if (!loggedIn) {
          return this.auth
            .loginWithRedirect({
              appState: { target: state.url },
            })
            .pipe(map(() => false));
        }
        return of(true);
      })
    );
  }
}
