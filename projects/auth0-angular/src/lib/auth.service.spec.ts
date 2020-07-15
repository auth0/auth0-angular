import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { Auth0ClientService } from './auth.client';
import { Auth0Client } from '@auth0/auth0-spa-js';
import { WindowService } from './window';

describe('AuthService', () => {
  let service: AuthService;
  let spy: any;

  const auth0Client = new Auth0Client({
    domain: 'test.domain',
    client_id: 'test-client-id',
  });

  beforeEach(() => {
    spy = spyOn(auth0Client, 'handleRedirectCallback').and.resolveTo({});
  });

  afterEach(() => {
    spy.calls.reset();
  });

  describe('constructor when not handling the redirect callback', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          { provide: Auth0ClientService, useValue: auth0Client },
          {
            provide: WindowService,
            useValue: {
              location: {
                search: '',
              },
            },
          },
        ],
      });

      service = TestBed.inject(AuthService);
    });

    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should not call handleRedirectCallback on init, when code and state are not present on the URL', () => {
      expect(auth0Client.handleRedirectCallback).not.toHaveBeenCalled();
    });
  });

  describe('when handling the redirect callback', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
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
      expect(auth0Client.handleRedirectCallback).toHaveBeenCalled();
    });
  });
});
