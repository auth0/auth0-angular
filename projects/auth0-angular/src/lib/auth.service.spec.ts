import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { Auth0ClientService } from './auth.client';
import { WindowService } from './window';
import { Auth0Client } from '@auth0/auth0-spa-js';
import { AbstractNavigator } from './abstract-navigator';
import { toArray, filter } from 'rxjs/operators';
import { Observable } from 'rxjs';

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

  const createService = () => {
    return TestBed.inject(AuthService);
  };

  beforeEach(() => {
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
    spyOn(auth0Client, 'logout');

    moduleSetup = {
      providers: [
        AbstractNavigator,
        {
          provide: Auth0ClientService,
          useValue: auth0Client,
        },
        {
          provide: WindowService,
          useValue: {
            location: {
              search: '',
            },
          },
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
      const service = createService();

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
      (<jasmine.Spy>auth0Client.isAuthenticated).and.resolveTo(true);

      loaded(service).subscribe(() => {
        service.isAuthenticated$.subscribe((value) => {
          expect(value).toBeTrue();
          done();
        });
      });
    });
  });

  describe('The `user` observable', () => {
    it('should get the user if authenticated', (done) => {
      const user = {
        name: 'Test User',
      };

      (<jasmine.Spy>auth0Client.isAuthenticated).and.resolveTo(true);
      (<jasmine.Spy>auth0Client.getUser).and.resolveTo(user);

      service.user$.subscribe((value) => {
        expect(value).toBe(user);
        done();
      });
    });

    it('should get the user if not authenticated', (done) => {
      (<jasmine.Spy>auth0Client.isAuthenticated).and.resolveTo(true);

      service.user$.subscribe((value) => {
        expect(value).toBeFalsy();
        done();
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
            provide: WindowService,
            useValue: {
              location: {
                href: 'http://localhost?code=123&state=456',
                search: 'code=123&state=456',
              },
            },
          },
        ],
      });
    });

    it('should handle the callback when code and state are available', (done) => {
      const service = createService();

      loaded(service).subscribe(() => {
        expect(auth0Client.handleRedirectCallback).toHaveBeenCalledTimes(1);
        done();
      });
    });

    it('should redirect to the correct route', (done) => {
      const service = createService();

      loaded(service).subscribe(() => {
        expect(navigator.navigateByUrl).toHaveBeenCalledWith('/');
        done();
      });
    });

    it('should redirect to the route specified in appState', (done) => {
      (<any>auth0Client.handleRedirectCallback).and.resolveTo({
        appState: {
          target: '/test-route',
        },
      });

      const service = createService();

      loaded(service).subscribe(() => {
        expect(navigator.navigateByUrl).toHaveBeenCalledWith('/test-route');
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
      (<jasmine.Spy>auth0Client.isAuthenticated).calls.reset();
      (<jasmine.Spy>auth0Client.isAuthenticated).and.resolveTo(true);

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
      (<jasmine.Spy>auth0Client.isAuthenticated).calls.reset();
      (<jasmine.Spy>auth0Client.isAuthenticated).and.resolveTo(true);

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
});
