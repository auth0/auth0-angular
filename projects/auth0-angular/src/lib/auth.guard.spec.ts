import { of } from 'rxjs';
import { AuthGuard } from './auth.guard';
import { expect } from '@jest/globals';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  const routeMock: any = { snapshot: {} };
  const routeStateMock: any = { snapshot: {}, url: '/' };

  describe('canActivate', () => {
    it('should return true for a logged in user', () => {
      const authServiceMock: any = {
        isAuthenticated$: of(true),
        loginWithRedirect: jest.fn(),
      };
      guard = new AuthGuard(authServiceMock);
      const listener = jest.fn();
      guard.canActivate(routeMock, routeStateMock).subscribe(listener);
      expect(authServiceMock.loginWithRedirect).not.toHaveBeenCalled();
      expect(listener).toHaveBeenCalledWith(true);
    });

    it('should redirect a logged out user', () => {
      const authServiceMock: any = {
        isAuthenticated$: of(false),
        loginWithRedirect: jest.fn(),
      };
      guard = new AuthGuard(authServiceMock);
      guard.canActivate(routeMock, routeStateMock).subscribe();
      expect(authServiceMock.loginWithRedirect).toHaveBeenCalledWith({
        appState: { target: '/' },
      });
    });
  });

  describe('canActivateChild', () => {
    it('should return true for a logged in user', () => {
      const authServiceMock: any = {
        isAuthenticated$: of(true),
        loginWithRedirect: jest.fn(),
      };
      guard = new AuthGuard(authServiceMock);
      const listener = jest.fn();
      guard.canActivateChild(routeMock, routeStateMock).subscribe(listener);
      expect(authServiceMock.loginWithRedirect).not.toHaveBeenCalled();
      expect(listener).toHaveBeenCalledWith(true);
    });

    it('should redirect a logged out user', () => {
      const authServiceMock: any = {
        isAuthenticated$: of(false),
        loginWithRedirect: jest.fn(),
      };
      guard = new AuthGuard(authServiceMock);
      guard.canActivateChild(routeMock, routeStateMock).subscribe();
      expect(authServiceMock.loginWithRedirect).toHaveBeenCalledWith({
        appState: { target: '/' },
      });
    });
  });

  describe('canLoad', () => {
    it('should return true for an authenticated user', () => {
      const authServiceMock: any = {
        isAuthenticated$: of(true),
      };
      guard = new AuthGuard(authServiceMock);
      const listener = jest.fn();
      guard.canLoad(routeMock, []).subscribe(listener);
      expect(listener).toHaveBeenCalledWith(true);
    });

    it('should return false for an unauthenticated user', () => {
      const authServiceMock: any = {
        isAuthenticated$: of(false),
      };
      guard = new AuthGuard(authServiceMock);
      const listener = jest.fn();
      guard.canLoad(routeMock, []).subscribe(listener);
      expect(listener).toHaveBeenCalledWith(false);
    });
  });
});
