import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { Auth0ClientService } from './auth.client';
import { WindowService } from './window';
import { Auth0Client } from '@auth0/auth0-spa-js';
import { toArray } from 'rxjs/operators';

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
