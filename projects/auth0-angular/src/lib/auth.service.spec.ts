import { fakeAsync, TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { Auth0ClientService } from './auth.client';
import { Auth0Client, IdToken } from '@auth0/auth0-spa-js';
import { AbstractNavigator } from './abstract-navigator';
import {
  bufferCount,
  bufferTime,
  delay,
  filter,
  mergeMap,
  take,
  tap,
} from 'rxjs/operators';
import { AuthConfig, AuthConfigService } from './auth.config';
import { AuthState } from './auth.state';

const mockWindow = global as any;

mockWindow.crypto = {
  subtle: {
    digest: () => 'foo',
  },
  getRandomValues() {
    return '123';
  },
};

const assignMock = jest.fn();

delete mockWindow.location;
mockWindow.location = { assign: assignMock };

/**
 * Wraps service.isLoading$ so that assertions can be made
 * only when the SDK has finished loading.
 *
 * @param service The service instance under test
 */
const loaded = (service: AuthService) =>
  service.isLoading$.pipe(filter((loading) => !loading));

describe('AuthService', () => {
  let auth0Client: Auth0Client;
  let moduleSetup: any;
  let authConfig: Partial<AuthConfig>;
  let authState: AuthState;

  const createService = () => TestBed.inject(AuthService);

  beforeEach(() => {
    authConfig = {};
    auth0Client = new Auth0Client({
      domain: '',
      clientId: '',
    });

    jest.spyOn(auth0Client, 'handleRedirectCallback').mockResolvedValue({});
    jest.spyOn(auth0Client, 'loginWithRedirect').mockResolvedValue();
    jest.spyOn(auth0Client, 'loginWithPopup').mockResolvedValue();
    jest.spyOn(auth0Client, 'checkSession').mockResolvedValue();
    jest.spyOn(auth0Client, 'isAuthenticated').mockResolvedValue(false);
    jest.spyOn(auth0Client, 'getUser').mockResolvedValue(undefined);
    jest.spyOn(auth0Client, 'getIdTokenClaims').mockResolvedValue(undefined);
    jest.spyOn(auth0Client, 'logout');
    jest
      .spyOn(auth0Client, 'getTokenSilently')
      .mockResolvedValue('__access_token__');

    jest
      .spyOn(auth0Client, 'getTokenWithPopup')
      .mockResolvedValue('__access_token_from_popup__');

    window.history.replaceState(null, '', '');

    moduleSetup = {
      providers: [
        AbstractNavigator,
        {
          provide: Auth0ClientService,
          useValue: auth0Client,
        },
        {
          provide: AuthConfigService,
          useValue: authConfig,
        },
      ],
    };

    TestBed.configureTestingModule(moduleSetup);
    authState = TestBed.inject(AuthState);
  });

  afterEach(() => {
    assignMock.mockClear();
  });

  describe('constructor', () => {
    it('should be created', () => {
      const service = createService();
      expect(service).toBeTruthy();
    });

    it('should not call handleRedirectCallback on init, when code and state are not present on the URL', () => {
      createService();
      expect(auth0Client.handleRedirectCallback).not.toHaveBeenCalled();
    });

    it('should call checkSession', () => {
      createService();
      expect(auth0Client.checkSession).toHaveBeenCalled();
    });

    it('should set isLoading$ in the correct sequence', (done) => {
      const values: boolean[] = [];
      const service = createService();

      service.isLoading$.subscribe((loading) => {
        values.push(loading);

        if (!loading) {
          expect(values).toEqual([true, false]);
          done();
        }
      });
    });

    it('should not set isLoading when service destroyed before checkSession finished', (done) => {
      ((auth0Client.checkSession as unknown) as jest.SpyInstance).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 5000))
      );
      const localService = createService();

      localService.isLoading$.pipe(bufferTime(500)).subscribe((loading) => {
        expect(loading.length).toEqual(1);
        expect(loading).toEqual([true]);
        done();
      });

      localService.ngOnDestroy();
    });
  });

  describe('The `isAuthenticated` observable', () => {
    it('should return `false` when the client is not authenticated', (done) => {
      const service = createService();
      service.isAuthenticated$.subscribe((value) => {
        expect(value).toBe(false);
        done();
      });
    });

    it('should return `true` when the client is authenticated', (done) => {
      ((auth0Client.isAuthenticated as unknown) as jest.SpyInstance).mockResolvedValue(
        true
      );
      const service = createService();

      loaded(service).subscribe(() => {
        service.isAuthenticated$.subscribe((value) => {
          expect(value).toBe(true);
          done();
        });
      });
    });

    it('should return true after successfully getting a new token', (done) => {
      ((auth0Client.isAuthenticated as unknown) as jest.SpyInstance).mockResolvedValue(
        false
      );

      const service = createService();
      service.isAuthenticated$.pipe(bufferCount(2)).subscribe((values) => {
        expect(values[0]).toBe(false);
        expect(values[1]).toBe(true);
        done();
      });

      // Add a small delay before triggering a new emit to the isAuthenticated$.
      // This ensures we can capture both emits using the above bufferCount(2)
      setTimeout(() => {
        ((auth0Client.getTokenSilently as unknown) as jest.SpyInstance).mockResolvedValue(
          {}
        );
        ((auth0Client.isAuthenticated as unknown) as jest.SpyInstance).mockResolvedValue(
          true
        );

        service.getAccessTokenSilently().subscribe();
      }, 0);
    });

    it('should still return true when the token is expired', fakeAsync((
      done: any
    ) => {
      authState.setIsLoading(false);
      ((auth0Client.isAuthenticated as unknown) as jest.SpyInstance).mockResolvedValue(
        true
      );

      const service = createService();

      service.isAuthenticated$.pipe(take(1)).subscribe((value) => {
        expect(value).toBe(true);
      });

      // When the token is expired, auth0Client.isAuthenticated is resolving to false.
      // This is unexpected but known behavior in Auth0-SPA-JS, so we shouldnt rely on it apart from initially.
      // Once this is resolved, we should be able to rely on `auth0Client.isAuthenticated`, even when the Access Token is expired.
      ((auth0Client.isAuthenticated as unknown) as jest.SpyInstance).mockResolvedValue(
        false
      );

      service.isAuthenticated$.pipe(take(1)).subscribe((value) => {
        expect(value).toBe(true);
      });
    }));
  });

  describe('The `user` observable', () => {
    it('should get the user if authenticated', (done) => {
      const user = {
        name: 'Test User',
      };

      ((auth0Client.isAuthenticated as unknown) as jest.SpyInstance).mockResolvedValue(
        true
      );
      ((auth0Client.getUser as unknown) as jest.SpyInstance).mockResolvedValue(
        user
      );

      const service = createService();
      service.user$.subscribe((value) => {
        expect(value).toBe(user);
        done();
      });
    });

    it('should update the user after successfully getting a new token', (done) => {
      const user = {
        name: 'Test User',
      };

      const user2 = {
        name: 'Another User',
      };

      ((auth0Client.isAuthenticated as unknown) as jest.SpyInstance).mockResolvedValue(
        true
      );
      ((auth0Client.getUser as unknown) as jest.SpyInstance).mockResolvedValue(
        user
      );

      const service = createService();
      service.user$.pipe(bufferCount(2)).subscribe((values) => {
        expect(values[0]).toBe(user);
        expect(values[1]).toBe(user2);
        done();
      });

      // Add a small delay before triggering a new emit to the user$.
      // This ensures we can capture both emits using the above bufferCount(2)
      setTimeout(() => {
        ((auth0Client.getTokenSilently as unknown) as jest.SpyInstance).mockResolvedValue(
          {}
        );
        ((auth0Client.getUser as unknown) as jest.SpyInstance).mockResolvedValue(
          user2
        );

        service.getAccessTokenSilently().subscribe();
      }, 0);
    });

    it('should return null when logged out', (done) => {
      const user = {
        name: 'Test User',
      };

      ((auth0Client.isAuthenticated as unknown) as jest.SpyInstance).mockResolvedValue(
        true
      );
      ((auth0Client.getUser as unknown) as jest.SpyInstance).mockResolvedValue(
        user
      );

      const service = createService();
      service.user$.pipe(bufferCount(2)).subscribe((values) => {
        expect(values[0]).toBe(user);
        expect(values[1]).toBe(null);
        done();
      });

      service.isAuthenticated$.pipe(filter(Boolean)).subscribe(() => {
        ((auth0Client.isAuthenticated as unknown) as jest.SpyInstance).mockResolvedValue(
          false
        );
        service.logout({
          openUrl: false,
        });
      });
    });

    it('should not emit when state is updated that doesnt change the user', (done) => {
      const user = {
        name: 'Test User',
      };

      ((auth0Client.isAuthenticated as unknown) as jest.SpyInstance).mockResolvedValue(
        true
      );
      ((auth0Client.getTokenSilently as unknown) as jest.SpyInstance).mockResolvedValue(
        'AT1'
      );
      ((auth0Client.getUser as unknown) as jest.SpyInstance).mockResolvedValue(
        user
      );

      let userEmissions = 0;
      const service = createService();
      service.user$.subscribe(() => userEmissions++);

      service
        .getAccessTokenSilently()
        .pipe(
          tap(() =>
            ((auth0Client.getTokenSilently as unknown) as jest.SpyInstance).mockResolvedValue(
              'AT2'
            )
          ),
          mergeMap(() => service.getAccessTokenSilently()),
          tap(() =>
            ((auth0Client.getTokenSilently as unknown) as jest.SpyInstance).mockResolvedValue(
              'AT3'
            )
          ),
          mergeMap(() => service.getAccessTokenSilently()),
          // Allow user emissions to come through
          delay(0)
        )
        .subscribe(() => {
          expect(userEmissions).toBe(1);
          done();
        });
    });
  });

  describe('The `idTokenClaims` observable', () => {
    it('should get the ID token claims if authenticated', (done) => {
      const claims: IdToken = {
        __raw: 'idToken',
        exp: 1602887231,
        iat: 1602883631,
        iss: 'https://example.eu.auth0.com/',
      };

      ((auth0Client.isAuthenticated as unknown) as jest.SpyInstance).mockResolvedValue(
        true
      );
      ((auth0Client.getIdTokenClaims as unknown) as jest.SpyInstance).mockResolvedValue(
        claims
      );
      const service = createService();

      service.idTokenClaims$.subscribe((value) => {
        expect(value).toBe(claims);
        done();
      });
    });

    it('should update the ID token claims if a new token is requested', (done) => {
      const claims: IdToken = {
        __raw: 'idToken',
        exp: 1602887231,
        iat: 1602883631,
        iss: 'https://example.eu.auth0.com/',
      };

      const claims2: IdToken = {
        __raw: 'another_idToken',
        exp: 1613108744,
        iat: 1613105547,
        iss: 'https://example.eu.auth0.com/',
      };

      ((auth0Client.isAuthenticated as unknown) as jest.SpyInstance).mockResolvedValue(
        true
      );
      ((auth0Client.getIdTokenClaims as unknown) as jest.SpyInstance).mockResolvedValue(
        claims
      );

      const service = createService();
      service.idTokenClaims$.pipe(bufferCount(2)).subscribe((values) => {
        expect(values[0]).toBe(claims);
        expect(values[1]).toBe(claims2);
        done();
      });

      // Add a small delay before triggering a new emit to the idTokenClaims$.
      // This ensures we can capture both emits using the above bufferCount(2)
      setTimeout(() => {
        ((auth0Client.getTokenSilently as unknown) as jest.SpyInstance).mockResolvedValue(
          {}
        );
        ((auth0Client.getIdTokenClaims as unknown) as jest.SpyInstance).mockResolvedValue(
          claims2
        );

        service.getAccessTokenSilently().subscribe();
      }, 0);
    });

    it('should return null when logged out', (done) => {
      const claims: IdToken = {
        __raw: 'idToken',
        exp: 1602887231,
        iat: 1602883631,
        iss: 'https://example.eu.auth0.com/',
      };

      ((auth0Client.isAuthenticated as unknown) as jest.SpyInstance).mockResolvedValue(
        true
      );
      ((auth0Client.getIdTokenClaims as unknown) as jest.SpyInstance).mockResolvedValue(
        claims
      );

      const service = createService();
      service.idTokenClaims$.pipe(bufferCount(2)).subscribe((values) => {
        expect(values[0]).toBe(claims);
        expect(values[1]).toBe(null);
        done();
      });

      service.isAuthenticated$.pipe(filter(Boolean)).subscribe(() => {
        ((auth0Client.isAuthenticated as unknown) as jest.SpyInstance).mockResolvedValue(
          false
        );
        service.logout({
          openUrl: false,
        });
      });
    });
  });

  describe('when handling the redirect callback', () => {
    let navigator: AbstractNavigator;

    beforeEach(() => {
      TestBed.resetTestingModule();

      navigator = {
        navigateByUrl: jest.fn().mockResolvedValue(true),
      } as any;

      TestBed.configureTestingModule({
        ...moduleSetup,
        providers: [
          {
            provide: AbstractNavigator,
            useValue: navigator,
          },
          {
            provide: Auth0ClientService,
            useValue: auth0Client,
          },
          {
            provide: AuthConfigService,
            useValue: authConfig,
          },
        ],
      });

      window.history.replaceState(null, '', '?code=123&state=456');
    });

    it('should handle the callback when code and state are available', (done) => {
      mockWindow.location.search = '?code=123&state=456';
      const localService = createService();

      loaded(localService).subscribe(() => {
        expect(auth0Client.handleRedirectCallback).toHaveBeenCalledTimes(1);
        done();
      });
    });

    it('should not handle the callback when skipRedirectCallback is true', (done) => {
      mockWindow.location.search = '?code=123&state=456';
      authConfig.skipRedirectCallback = true;

      const localService = createService();

      loaded(localService).subscribe(() => {
        expect(auth0Client.handleRedirectCallback).not.toHaveBeenCalled();
        done();
      });
    });

    it('should redirect to the correct route', (done) => {
      const localService = createService();

      loaded(localService).subscribe(() => {
        expect(navigator.navigateByUrl).toHaveBeenCalledWith('/');
        done();
      });
    });

    it('should redirect to the route specified in appState', (done) => {
      ((auth0Client.handleRedirectCallback as unknown) as jest.SpyInstance).mockResolvedValue(
        {
          appState: {
            target: '/test-route',
          },
        }
      );

      const localService = createService();

      loaded(localService).subscribe(() => {
        expect(navigator.navigateByUrl).toHaveBeenCalledWith('/test-route');
        done();
      });
    });

    it('should fallback to `/` when missing appState', (done) => {
      ((auth0Client.handleRedirectCallback as unknown) as jest.SpyInstance).mockResolvedValue(
        {}
      );

      const localService = createService();

      loaded(localService).subscribe(() => {
        expect(navigator.navigateByUrl).toHaveBeenCalledWith('/');
        done();
      });
    });

    it('should fallback to `/` when handleRedirectCallback returns undefined', (done) => {
      ((auth0Client.handleRedirectCallback as unknown) as jest.SpyInstance).mockResolvedValue(
        undefined
      );

      const localService = createService();

      loaded(localService).subscribe(() => {
        expect(navigator.navigateByUrl).toHaveBeenCalledWith('/');
        done();
      });
    });

    it('should record the appState in the appState$ observable if it is present', (done) => {
      const appState = {
        myValue: 'State to Preserve',
      };

      ((auth0Client.handleRedirectCallback as unknown) as jest.SpyInstance).mockResolvedValue(
        {
          appState,
        }
      );

      const localService = createService();

      localService.appState$.subscribe((recievedState) => {
        expect(recievedState).toEqual(appState);
        done();
      });
    });

    it('should record errors in the error$ observable', (done) => {
      const errorObj = new Error('An error has occured');

      ((auth0Client.handleRedirectCallback as unknown) as jest.SpyInstance).mockImplementation(
        () => {
          throw errorObj;
        }
      );

      const localService = createService();

      loaded(localService).subscribe(() => {
        localService.error$.subscribe((err: Error) => {
          expect(err).toBe(errorObj);
          expect(navigator.navigateByUrl).toHaveBeenCalledWith('/');
          done();
        });
      });
    });

    it('should redirect to errorPath when an error occured in handleRedirectCallback', (done) => {
      const errorObj = new Error('An error has occured');

      authConfig.errorPath = '/error';
      ((auth0Client.handleRedirectCallback as unknown) as jest.SpyInstance).mockImplementation(
        () => {
          throw errorObj;
        }
      );

      const localService = createService();

      loaded(localService).subscribe(() => {
        expect(navigator.navigateByUrl).toHaveBeenCalledWith('/error');
        done();
      });
    });

    it('should process the callback when an error appears in the query string', (done) => {
      window.history.replaceState(
        null,
        '',
        `?error=${encodeURIComponent('This is an error')}&state=456`
      );

      const localService = createService();

      loaded(localService).subscribe(() => {
        expect(auth0Client.handleRedirectCallback).toHaveBeenCalled();
        done();
      });
    });

    it('should not process the callback when query string is a sub string', (done) => {
      window.location.search = '?abccode=123&xyzstate=456';

      const localService = createService();

      loaded(localService).subscribe(() => {
        expect(auth0Client.handleRedirectCallback).not.toHaveBeenCalled();
        done();
      });
    });
  });

  it('should call `loginWithRedirect`', async () => {
    const service = createService();
    await service.loginWithRedirect().toPromise();
    expect(auth0Client.loginWithRedirect).toHaveBeenCalled();
  });

  it('should call `loginWithRedirect` and pass options', async () => {
    const options = {
      authorizationParams: { redirect_uri: 'http://localhost:3001' },
    };

    const service = createService();
    await service.loginWithRedirect(options).toPromise();
    expect(auth0Client.loginWithRedirect).toHaveBeenCalledWith(options);
  });

  it('should call `loginWithPopup`', (done) => {
    const service = createService();
    loaded(service).subscribe(() => {
      ((auth0Client.isAuthenticated as unknown) as jest.SpyInstance).mockReset();
      ((auth0Client.isAuthenticated as unknown) as jest.SpyInstance).mockResolvedValue(
        true
      );

      service.loginWithPopup();

      service.isAuthenticated$.subscribe((authenticated) => {
        if (authenticated) {
          expect(auth0Client.loginWithPopup).toHaveBeenCalled();
          expect(auth0Client.isAuthenticated).toHaveBeenCalled();
          done();
        }
      });
    });
  });

  it('should call `loginWithPopup` with options', (done) => {
    // These objects are empty, as we just want to check that the
    // same object reference was passed through than any specific options.
    const options = {};
    const config = {};
    const service = createService();

    loaded(service).subscribe(() => {
      ((auth0Client.isAuthenticated as unknown) as jest.SpyInstance).mockReset();
      ((auth0Client.isAuthenticated as unknown) as jest.SpyInstance).mockResolvedValue(
        true
      );

      service.loginWithPopup(options, config);

      service.isAuthenticated$.subscribe((authenticated) => {
        if (authenticated) {
          expect(auth0Client.loginWithPopup).toHaveBeenCalledWith(
            options,
            config
          );
          done();
        }
      });
    });
  });

  it('should call `logout`', () => {
    const service = createService();
    service.logout();
    expect(auth0Client.logout).toHaveBeenCalled();
  });

  it('should call `logout` with options', () => {
    const options = { logoutParams: { returnTo: 'http://localhost' } };
    const service = createService();
    service.logout(options);
    expect(auth0Client.logout).toHaveBeenCalledWith(options);
  });

  it('should reset the authentication state when passing `localOnly` to logout', (done) => {
    const options = {
      openUrl: async () => {
        ((auth0Client.isAuthenticated as unknown) as jest.SpyInstance).mockResolvedValue(
          false
        );
      },
    };

    ((auth0Client.isAuthenticated as unknown) as jest.SpyInstance).mockResolvedValue(
      true
    );

    const service = createService();

    loaded(service).subscribe(() => {
      service.isAuthenticated$.pipe(bufferCount(2)).subscribe((values) => {
        expect(values[0]).toBe(true);
        expect(values[1]).toBe(false);
        done();
      });

      service.logout(options);
    });
  });

  describe('getAccessTokenSilently', () => {
    it('should call the underlying SDK', (done) => {
      const service = createService();
      service.getAccessTokenSilently().subscribe((token) => {
        expect(auth0Client.getTokenSilently).toHaveBeenCalled();
        done();
      });
    });

    it('should call the underlying SDK and pass along the options', (done) => {
      // Empty object here just to test the object reference
      const options = {};
      const service = createService();

      service.getAccessTokenSilently(options).subscribe((token) => {
        expect(auth0Client.getTokenSilently).toHaveBeenCalledWith(options);
        done();
      });
    });

    it('should get the full token response when detailedResponse is true', (done) => {
      const tokenResponse = {
        access_token: '123',
        id_token: '456',
        expires_in: 2,
      };
      ((auth0Client.getTokenSilently as unknown) as jest.SpyInstance).mockResolvedValue(
        tokenResponse
      );

      const service = createService();
      service
        .getAccessTokenSilently({ detailedResponse: true })
        .subscribe((token) => {
          expect(token).toEqual(tokenResponse);
          done();
        });
    });

    it('should record errors in the error$ observable', (done) => {
      const errorObj = new Error('An error has occured');

      ((auth0Client.getTokenSilently as unknown) as jest.SpyInstance).mockRejectedValue(
        errorObj
      );
      const service = createService();

      service.getAccessTokenSilently().subscribe({
        error: () => {},
      });

      service.error$.subscribe((err: Error) => {
        expect(err).toBe(errorObj);
        done();
      });
    });

    it('should bubble errors', (done) => {
      const errorObj = new Error('An error has occured');

      ((auth0Client.getTokenSilently as unknown) as jest.SpyInstance).mockRejectedValue(
        errorObj
      );
      const service = createService();

      service.getAccessTokenSilently().subscribe({
        error: (err: Error) => {
          expect(err).toBe(errorObj);
          done();
        },
      });
    });
  });

  describe('getAccessTokenWithPopup', () => {
    it('should call the underlying SDK', (done) => {
      const service = createService();
      service.getAccessTokenWithPopup().subscribe((token) => {
        expect(auth0Client.getTokenWithPopup).toHaveBeenCalled();
        done();
      });
    });

    it('should call the underlying SDK and pass along the options', (done) => {
      // Empty object just to test reference
      const options = {};

      const service = createService();
      service.getAccessTokenWithPopup(options).subscribe((token) => {
        expect(auth0Client.getTokenWithPopup).toHaveBeenCalledWith(options);
        done();
      });
    });

    it('should record errors in the error$ observable', (done) => {
      const errorObj = new Error('An error has occured');

      ((auth0Client.getTokenWithPopup as unknown) as jest.SpyInstance).mockRejectedValue(
        errorObj
      );

      const service = createService();
      service.getAccessTokenWithPopup().subscribe({
        error: () => {},
      });

      service.error$.subscribe((err: Error) => {
        expect(err).toBe(errorObj);
        done();
      });
    });

    it('should bubble errors', (done) => {
      const errorObj = new Error('An error has occured');

      ((auth0Client.getTokenWithPopup as unknown) as jest.SpyInstance).mockRejectedValue(
        errorObj
      );

      const service = createService();
      service.getAccessTokenWithPopup().subscribe({
        error: (err: Error) => {
          expect(err).toBe(errorObj);
          done();
        },
      });
    });
  });

  describe('handleRedirectCallback', () => {
    let navigator: AbstractNavigator;

    beforeEach(() => {
      TestBed.resetTestingModule();

      navigator = {
        navigateByUrl: jest.fn().mockResolvedValue(true),
      } as any;

      TestBed.configureTestingModule({
        ...moduleSetup,
        providers: [
          {
            provide: AbstractNavigator,
            useValue: navigator,
          },
          {
            provide: Auth0ClientService,
            useValue: auth0Client,
          },
          {
            provide: AuthConfigService,
            useValue: {
              ...authConfig,
              skipRedirectCallback: true,
            },
          },
        ],
      });

      window.history.replaceState(null, '', '');
    });

    it('should call the underlying SDK', (done) => {
      const localService = createService();

      localService.handleRedirectCallback().subscribe(() => {
        expect(auth0Client.handleRedirectCallback).toHaveBeenCalled();
        done();
      });
    });

    it('should call the underlying SDK and pass options', (done) => {
      const url = 'http://localhost';
      const localService = createService();

      localService.handleRedirectCallback(url).subscribe(() => {
        expect(auth0Client.handleRedirectCallback).toHaveBeenCalledWith(url);
        done();
      });
    });

    it('should refresh the internal state', (done) => {
      const localService = createService();

      localService.isAuthenticated$
        .pipe(bufferCount(2))
        .subscribe((authenticatedStates) => {
          expect(authenticatedStates).toEqual([false, true]);
          expect(auth0Client.isAuthenticated).toHaveBeenCalled();
          done();
        });

      localService.isLoading$
        .pipe(
          filter((isLoading) => !isLoading),
          tap(() =>
            ((auth0Client.isAuthenticated as unknown) as jest.SpyInstance).mockResolvedValue(
              true
            )
          ),
          mergeMap(() => localService.handleRedirectCallback())
        )
        .subscribe();
    });

    it('should record the appState in the appState$ observable if it is present', (done) => {
      const appState = {
        myValue: 'State to Preserve',
      };

      ((auth0Client.handleRedirectCallback as unknown) as jest.SpyInstance).mockResolvedValue(
        {
          appState,
        }
      );

      const localService = createService();
      localService.handleRedirectCallback().subscribe(() => {
        localService.appState$.subscribe((recievedState) => {
          expect(recievedState).toEqual(appState);
          done();
        });
      });
    });
  });
});
