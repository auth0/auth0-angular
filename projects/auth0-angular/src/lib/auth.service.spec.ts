import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { Auth0ClientService } from './auth.client';
import { WindowService } from './window';
import { Auth0Client } from '@auth0/auth0-spa-js';

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

    moduleSetup = {
      providers: [
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

  describe('constructor when not handling the redirect callback', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should not call handleRedirectCallback on init, when code and state are not present on the URL', () => {
      expect(auth0Client.handleRedirectCallback).not.toHaveBeenCalled();
    });
  });

  describe('when handling the redirect callback', () => {
    beforeEach(() => {
      TestBed.resetTestingModule();

      TestBed.configureTestingModule({
        ...moduleSetup,
        providers: [
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

      service = TestBed.inject(AuthService);
    });

    it('should handle the callback when code and state are available', () => {
      expect(auth0Client.handleRedirectCallback).toHaveBeenCalledTimes(1);
    });
  });

  it('should call `loginWithRedirect`', () => {
    service.loginWithRedirect().subscribe(() => {
      expect(auth0Client.loginWithRedirect).toHaveBeenCalled();
    });
  });

  it('should call `loginWithRedirect` and pass options', () => {
    const options = { redirect_uri: 'http://localhost:3001' };

    service
      .loginWithRedirect(options)
      .subscribe(() =>
        expect(auth0Client.loginWithRedirect).toHaveBeenCalledWith(options)
      );
  });
});
