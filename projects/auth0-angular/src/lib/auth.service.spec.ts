import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { Auth0ClientService } from './auth.client';
import { Auth0Client, IdToken } from '@auth0/auth0-spa-js';
import { AbstractNavigator } from './abstract-navigator';
import { bufferCount, filter } from 'rxjs/operators';
import { Location } from '@angular/common';
import { AuthConfig, AuthConfigService } from './auth.config';

/**
 * Wraps service.isLoading$ so that assertions can be made
 * only when the SDK has finished loading.
 * @param service The service instance under test
 */
const loaded = (service: AuthService) =>
  service.isLoading$.pipe(filter((loading) => !loading));

describe('AuthService', () => {
  let auth0Client: Auth0Client;
  let moduleSetup: any;
  let service: AuthService;
  let locationSpy: jasmine.SpyObj<Location>;
  let authConfig: Partial<AuthConfig>;

  const createService = () => {
    return TestBed.inject(AuthService);
  };

  beforeEach(() => {
    authConfig = {};
    auth0Client = new Auth0Client({
      domain: '',
      client_id: '',
    });

    spyOn(auth0Client, 'handleRedirectCallback').and.resolveTo({});
    spyOn(auth0Client, 'loginWithRedirect').and.resolveTo();
    spyOn(auth0Client, 'loginWithPopup').and.resolveTo();
    spyOn(auth0Client, 'checkSession').and.resolveTo();
    spyOn(auth0Client, 'isAuthenticated').and.resolveTo(false);
    spyOn(auth0Client, 'getUser').and.resolveTo(null);
    spyOn(auth0Client, 'getIdTokenClaims').and.resolveTo(null);
    spyOn(auth0Client, 'logout');
    spyOn(auth0Client, 'getTokenSilently').and.resolveTo('__access_token__');

    spyOn(auth0Client, 'getTokenWithPopup').and.resolveTo(
      '__access_token_from_popup__'
    );

    locationSpy = jasmine.createSpyObj('Location', ['path']);
    locationSpy.path.and.returnValue('');

    moduleSetup = {
      providers: [
        AbstractNavigator,
        {
          provide: Auth0ClientService,
          useValue: auth0Client,
        },
        {
          provide: Location,
          useValue: locationSpy,
        },
      ],
    };

    TestBed.configureTestingModule(moduleSetup);
    service = createService();
  });

  describe('constructor', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should not call handleRedirectCallback on init, when code and state are not present on the URL', () => {
      expect(auth0Client.handleRedirectCallback).not.toHaveBeenCalled();
    });

    it('should call checkSession', () => {
      expect(auth0Client.checkSession).toHaveBeenCalled();
    });

    it('should set isLoading$ in the correct sequence', (done) => {
      const values = [];

      service.isLoading$.subscribe((loading) => {
        values.push(loading);

        if (!loading) {
          expect(values).toEqual([true, false]);
          done();
        }
      });
    });
  });

  describe('The `isAuthenticated` observable', () => {
    it('should return `false` when the client is not authenticated', (done) => {
      service.isAuthenticated$.subscribe((value) => {
        expect(value).toBeFalse();
        done();
      });
    });

    it('should return `true` when the client is authenticated', (done) => {
      (auth0Client.isAuthenticated as jasmine.Spy).and.resolveTo(true);

      loaded(service).subscribe(() => {
        service.isAuthenticated$.subscribe((value) => {
          expect(value).toBeTrue();
          done();
        });
      });
    });

    it('should return true after successfully getting a new token', (done) => {
      (auth0Client.isAuthenticated as jasmine.Spy).and.resolveTo(false);

      service.isAuthenticated$.pipe(bufferCount(2)).subscribe((values) => {
        expect(values[0]).toBe(false);
        expect(values[1]).toBe(true);
        done();
      });

      // Add a small delay before triggering a new emit to the isAuthenticated$.
      // This ensures we can capture both emits using the above bufferCount(2)
      setTimeout(() => {
        (auth0Client.getTokenSilently as jasmine.Spy).and.resolveTo({});
        (auth0Client.isAuthenticated as jasmine.Spy).and.resolveTo(true);

        service.getAccessTokenSilently().subscribe();
      }, 0);
    });
  });

  describe('The `user` observable', () => {
    it('should get the user if authenticated', (done) => {
      const user = {
        name: 'Test User',
      };

      (auth0Client.isAuthenticated as jasmine.Spy).and.resolveTo(true);
      (auth0Client.getUser as jasmine.Spy).and.resolveTo(user);

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

      (auth0Client.isAuthenticated as jasmine.Spy).and.resolveTo(true);
      (auth0Client.getUser as jasmine.Spy).and.resolveTo(user);

      service.user$.pipe(bufferCount(2)).subscribe((values) => {
        expect(values[0]).toBe(user);
        expect(values[1]).toBe(user2);
        done();
      });

      // Add a small delay before triggering a new emit to the user$.
      // This ensures we can capture both emits using the above bufferCount(2)
      setTimeout(() => {
        (auth0Client.getTokenSilently as jasmine.Spy).and.resolveTo({});
        (auth0Client.getUser as jasmine.Spy).and.resolveTo(user2);

        service.getAccessTokenSilently().subscribe();
      }, 0);
    });

    it('should return null when logged out', (done) => {
      const user = {
        name: 'Test User',
      };

      (auth0Client.isAuthenticated as jasmine.Spy).and.resolveTo(true);
      (auth0Client.getUser as jasmine.Spy).and.resolveTo(user);

      service.user$.pipe(bufferCount(2)).subscribe((values) => {
        expect(values[0]).toBe(user);
        expect(values[1]).toBe(null);
        done();
      });

      service.isAuthenticated$.pipe(filter(Boolean)).subscribe(() => {
        (auth0Client.isAuthenticated as jasmine.Spy).and.resolveTo(false);
        service.logout({
          localOnly: true,
        });
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

      (auth0Client.isAuthenticated as jasmine.Spy).and.resolveTo(true);
      (auth0Client.getIdTokenClaims as jasmine.Spy).and.resolveTo(claims);

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

      (auth0Client.isAuthenticated as jasmine.Spy).and.resolveTo(true);
      (auth0Client.getIdTokenClaims as jasmine.Spy).and.resolveTo(claims);

      service.idTokenClaims$.pipe(bufferCount(2)).subscribe((values) => {
        expect(values[0]).toBe(claims);
        expect(values[1]).toBe(claims2);
        done();
      });

      // Add a small delay before triggering a new emit to the idTokenClaims$.
      // This ensures we can capture both emits using the above bufferCount(2)
      setTimeout(() => {
        (auth0Client.getTokenSilently as jasmine.Spy).and.resolveTo({});
        (auth0Client.getIdTokenClaims as jasmine.Spy).and.resolveTo(claims2);

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

      (auth0Client.isAuthenticated as jasmine.Spy).and.resolveTo(true);
      (auth0Client.getIdTokenClaims as jasmine.Spy).and.resolveTo(claims);

      service.idTokenClaims$.pipe(bufferCount(2)).subscribe((values) => {
        expect(values[0]).toBe(claims);
        expect(values[1]).toBe(null);
        done();
      });

      service.isAuthenticated$.pipe(filter(Boolean)).subscribe(() => {
        (auth0Client.isAuthenticated as jasmine.Spy).and.resolveTo(false);
        service.logout({
          localOnly: true,
        });
      });
    });
  });

  describe('when handling the redirect callback', () => {
    let navigator: AbstractNavigator;

    beforeEach(() => {
      TestBed.resetTestingModule();

      navigator = jasmine.createSpyObj('RouteNavigator', {
        navigateByUrl: Promise.resolve(true),
      }) as any;

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
            provide: Location,
            useValue: locationSpy,
          },
          {
            provide: AuthConfigService,
            useValue: authConfig,
          },
        ],
      });

      locationSpy.path.and.returnValue('?code=123&state=456');
    });

    it('should handle the callback when code and state are available', (done) => {
      const localService = createService();

      loaded(localService).subscribe(() => {
        expect(auth0Client.handleRedirectCallback).toHaveBeenCalledTimes(1);
        done();
      });
    });

    it('should not handle the callback when skipRedirectCallback is true', (done) => {
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
      (auth0Client.handleRedirectCallback as jasmine.Spy).and.resolveTo({
        appState: {
          target: '/test-route',
        },
      });

      const localService = createService();

      loaded(localService).subscribe(() => {
        expect(navigator.navigateByUrl).toHaveBeenCalledWith('/test-route');
        done();
      });
    });

    it('should record errors in the error$ observable', (done) => {
      const errorObj = new Error('An error has occured');

      (auth0Client.handleRedirectCallback as jasmine.Spy).and.throwError(
        errorObj
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
      (auth0Client.handleRedirectCallback as jasmine.Spy).and.throwError(
        errorObj
      );

      const localService = createService();

      loaded(localService).subscribe(() => {
        expect(navigator.navigateByUrl).toHaveBeenCalledWith('/error');
        done();
      });
    });

    it('should process the callback when an error appears in the query string', (done) => {
      locationSpy.path.and.returnValue(
        `?error=${encodeURIComponent('This is an error')}&state=456`
      );

      const localService = createService();

      loaded(localService).subscribe(() => {
        expect(auth0Client.handleRedirectCallback).toHaveBeenCalled();
        done();
      });
    });
  });

  it('should call `loginWithRedirect`', async () => {
    await service.loginWithRedirect().toPromise();
    expect(auth0Client.loginWithRedirect).toHaveBeenCalled();
  });

  it('should call `loginWithRedirect` and pass options', async () => {
    const options = { redirect_uri: 'http://localhost:3001' };

    await service.loginWithRedirect(options).toPromise();
    expect(auth0Client.loginWithRedirect).toHaveBeenCalledWith(options);
  });

  it('should call `loginWithPopup`', (done) => {
    loaded(service).subscribe(async () => {
      (auth0Client.isAuthenticated as jasmine.Spy).calls.reset();
      (auth0Client.isAuthenticated as jasmine.Spy).and.resolveTo(true);

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

  it('should call `loginWithPopup` with options', async (done) => {
    // These objects are empty, as we just want to check that the
    // same object reference was passed through than any specific options.
    const options = {};
    const config = {};

    loaded(service).subscribe(() => {
      (auth0Client.isAuthenticated as jasmine.Spy).calls.reset();
      (auth0Client.isAuthenticated as jasmine.Spy).and.resolveTo(true);

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
    service.logout();
    expect(auth0Client.logout).toHaveBeenCalled();
  });

  it('should call `logout` with options', () => {
    const options = { returnTo: 'http://localhost' };
    service.logout(options);
    expect(auth0Client.logout).toHaveBeenCalledWith(options);
  });

  it('should reset the authentication state when passing `localOnly` to logout', (done) => {
    const options = { localOnly: true };

    service.isAuthenticated$.subscribe((authenticated) => {
      expect(authenticated).toBeFalse();
      done();
    });

    service.logout(options);
  });

  describe('getAccessTokenSilently', () => {
    it('should call the underlying SDK', (done) => {
      service.getAccessTokenSilently().subscribe((token) => {
        expect(auth0Client.getTokenSilently).toHaveBeenCalled();
        done();
      });
    });

    it('should call the underlying SDK and pass along the options', (done) => {
      // Empty object here just to test the object reference
      const options = {};

      service.getAccessTokenSilently(options).subscribe((token) => {
        expect(auth0Client.getTokenSilently).toHaveBeenCalledWith(options);
        done();
      });
    });

    it('should record errors in the error$ observable', (done) => {
      const errorObj = new Error('An error has occured');

      (auth0Client.getTokenSilently as jasmine.Spy).and.rejectWith(errorObj);

      service.getAccessTokenSilently().subscribe();

      service.error$.subscribe((err: Error) => {
        expect(err).toBe(errorObj);
        done();
      });
    });

    it('should bubble errors', (done) => {
      const errorObj = new Error('An error has occured');

      (auth0Client.getTokenSilently as jasmine.Spy).and.rejectWith(errorObj);

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
      service.getAccessTokenWithPopup().subscribe((token) => {
        expect(auth0Client.getTokenWithPopup).toHaveBeenCalled();
        done();
      });
    });

    it('should call the underlying SDK and pass along the options', (done) => {
      // Empty object just to test reference
      const options = {};

      service.getAccessTokenWithPopup(options).subscribe((token) => {
        expect(auth0Client.getTokenWithPopup).toHaveBeenCalledWith(options);
        done();
      });
    });

    it('should record errors in the error$ observable', (done) => {
      const errorObj = new Error('An error has occured');

      (auth0Client.getTokenWithPopup as jasmine.Spy).and.rejectWith(errorObj);

      service.getAccessTokenWithPopup().subscribe();

      service.error$.subscribe((err: Error) => {
        expect(err).toBe(errorObj);
        done();
      });
    });

    it('should bubble errors', (done) => {
      const errorObj = new Error('An error has occured');

      (auth0Client.getTokenWithPopup as jasmine.Spy).and.rejectWith(errorObj);

      service.getAccessTokenWithPopup().subscribe({
        error: (err: Error) => {
          expect(err).toBe(errorObj);
          done();
        },
      });
    });
  });
});
