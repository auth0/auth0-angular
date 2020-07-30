import { of } from 'rxjs';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  let authServiceMock: any;
  let guard: AuthGuard;
  const routeMock: any = { snapshot: {} };
  const routeStateMock: any = { snapshot: {}, url: '/' };

  it('should return true for a logged in user', () => {
    authServiceMock = {
      isAuthenticated$: of(true),
      loginWithRedirect: jasmine.createSpy('loginWithRedirect'),
    };
    guard = new AuthGuard(authServiceMock);
    const listener = jasmine.createSpy();
    guard.canActivate(routeMock, routeStateMock).subscribe(listener);
    expect(authServiceMock.loginWithRedirect).not.toHaveBeenCalled();
    expect(listener).toHaveBeenCalledWith(true);
  });

  it('should redirect a logged out user', () => {
    authServiceMock = {
      isAuthenticated$: of(false),
      loginWithRedirect: jasmine.createSpy('loginWithRedirect'),
    };
    guard = new AuthGuard(authServiceMock);
    guard.canActivate(routeMock, routeStateMock).subscribe();
    expect(authServiceMock.loginWithRedirect).toHaveBeenCalledWith({
      appState: { target: '/' },
    });
  });
});
