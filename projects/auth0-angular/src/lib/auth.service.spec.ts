import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { Auth0ClientService } from './auth.client';
import { WindowService } from './window';
import { Auth0Client } from '@auth0/auth0-spa-js';
import { AbstractNavigator } from './abstract-navigator';

describe('AuthService', () => {
  let service: AuthService;
  let auth0Client: Auth0Client;
  let moduleSetup: any;

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
    service = TestBed.inject(AuthService);
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
      service.isLoading$.subscribe((isLoading) => {
        expect(isLoading).toBeFalse();
        done();
      });
    });
  });

  describe('The isAuthenticated observable', () => {
    it('should return `false` when the client is not authenticated', (done) => {
      service.isAuthenticated$.subscribe((value) => {
        expect(value).toBeFalse();
        done();
      });
    });

    it('should return `true` when the client is authenticated', (done) => {
      (<jasmine.Spy>auth0Client.isAuthenticated).and.resolveTo(true);

      service.isAuthenticated$.subscribe((value) => {
        expect(value).toBeTrue();
        done();
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
      const service = TestBed.inject(AuthService);

      service.isLoading$.subscribe(() => {
        expect(auth0Client.handleRedirectCallback).toHaveBeenCalledTimes(1);
        done();
      });
    });

    it('should redirect to the correct route', (done) => {
      const service = TestBed.inject(AuthService);

      service.isLoading$.subscribe(() => {
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

      const service = TestBed.inject(AuthService);

      service.isLoading$.subscribe(() => {
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

  it('should call `loginWithPopup`', async () => {
    await service.loginWithPopup();
    expect(auth0Client.loginWithPopup).toHaveBeenCalled();
  });

  it('should call `loginWithPopup` with options', async () => {
    const options = {};
    const config = {};

    await service.loginWithPopup(options, config).toPromise();
    expect(auth0Client.loginWithPopup).toHaveBeenCalledWith(options, config);
  });
});
