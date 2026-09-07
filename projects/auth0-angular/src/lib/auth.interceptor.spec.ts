// Each spec file runs in its own jsdom window; zone.js from test-setup.ts
// patched a different window, so it must be imported here too.
import 'zone.js';
import 'zone.js/testing';
import '@angular/compiler';
import { AuthHttpInterceptor } from './auth.interceptor';
import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Data } from '@angular/router';
import {
  AuthConfig,
  HttpMethod,
  AuthClientConfig,
  HttpInterceptorConfig,
} from './auth.config';
import { BehaviorSubject, Subject, throwError } from 'rxjs';
import { Auth0Client } from '@auth0/auth0-spa-js';
import { Auth0ClientService } from './auth.client';
import { AuthState } from './auth.state';
import { AuthService } from './auth.service';
import type { MockInstance } from 'vitest';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';

// NOTE: Read Async testing: https://github.com/angular/angular/issues/25733#issuecomment-636154553

// The forks pool loads setupFiles in a separate module-cache context from spec
// files, so initTestEnvironment called in test-setup.ts targets a different
// TestBed instance. Initialize the environment here in the spec's own context.
beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
});

const mockWindow = global as any;

Object.defineProperty(mockWindow, 'crypto', {
  value: {
    subtle: {
      digest: () => 'foo',
    },
    getRandomValues() {
      return '123';
    },
  },
  writable: false,
});

describe('The Auth HTTP Interceptor', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;
  let auth0Client: Auth0Client;
  let req: TestRequest;
  let authState: AuthState;
  const testData: Data = { message: 'Hello, world' };
  let authService: AuthService;
  let isLoading$: Subject<boolean>;

  const assertAuthorizedApiCallTo = async (url: string, method = 'get') => {
    httpClient.request(method, url).subscribe();
    await new Promise(process.nextTick);
    req = httpTestingController.expectOne(url);

    expect(req.request.headers.get('Authorization')).toBe(
      'Bearer access-token'
    );
  };

  const assertPassThruApiCallTo = async (url: string) => {
    httpClient.get<Data>(url).subscribe();
    await new Promise(process.nextTick);
    req = httpTestingController.expectOne(url);
    expect(req.request.headers.get('Authorization')).toBeFalsy();
  };

  let config: Partial<AuthConfig>;

  beforeEach(() => {
    isLoading$ = new BehaviorSubject<boolean>(false);
    req = undefined as any;

    auth0Client = new Auth0Client({
      domain: '',
      clientId: '',
    });

    vi.spyOn(auth0Client, 'getTokenSilently').mockImplementation(() =>
      Promise.resolve('access-token')
    );

    config = {
      httpInterceptor: {
        allowedList: [
          '',
          'https://my-api.com/api/photos',
          'https://my-api.com/api/people*',
          'https://my-api.com/orders',
          {
            uri: 'https://my-api.com/api/orders',
            allowAnonymous: true,
          },
          {
            uri: 'https://my-api.com/api/addresses',
            tokenOptions: {
              authorizationParams: {
                audience: 'audience',
                scope: 'scope',
              },
            },
          },
          {
            uri: 'https://my-api.com/api/calendar*',
          },
          {
            uri: 'https://my-api.com/api/register',
            httpMethod: HttpMethod.Post,
          },
          {
            uriMatcher: (uri) => uri.indexOf('/api/contact') !== -1,
            httpMethod: HttpMethod.Post,
            tokenOptions: {
              authorizationParams: {
                audience: 'audience',
                scope: 'scope',
              },
            },
          },
        ],
      },
    };

    TestBed.configureTestingModule({
      imports: [],
      providers: [
        {
          provide: HTTP_INTERCEPTORS,
          useClass: AuthHttpInterceptor,
          multi: true,
        },
        {
          provide: Auth0ClientService,
          useValue: auth0Client,
        },
        {
          provide: AuthClientConfig,
          useValue: { get: () => config },
        },
        {
          provide: AuthService,
          useValue: {
            isLoading$,
          },
        },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
    authState = TestBed.inject(AuthState);
    authService = TestBed.inject(AuthService);

    vi.spyOn(authState, 'setError');
  });

  afterEach(() => {
    httpTestingController.verify();
    if (req) {
      req.flush(testData);
    }
  });

  describe('When no httpInterceptor is configured', () => {
    it('pass through and do not have access tokens attached', async () => {
      config.httpInterceptor = null as unknown as HttpInterceptorConfig;
      await assertPassThruApiCallTo('https://my-api.com/api/public');
    });
  });

  describe('Requests that do not require authentication', () => {
    it('pass through and do not have access tokens attached', async () => {
      await assertPassThruApiCallTo('https://my-api.com/api/public');
    });
  });

  describe('Requests that are configured using a primitive', () => {
    it('waits unil isLoading emits false', async () => {
      const method = 'GET';
      const url = 'https://my-api.com/api/photos';

      isLoading$.next(true);

      httpClient.request(method, url).subscribe();
      await new Promise(process.nextTick);

      httpTestingController.expectNone(url);

      isLoading$.next(false);
      await new Promise(process.nextTick);

      httpTestingController.expectOne(url);
    });

    it('attach the access token when the configuration uri is a string', async () => {
      // Testing /api/photos (exact match)
      await assertAuthorizedApiCallTo('https://my-api.com/api/photos');
    });

    it('attach the access token when the configuration uri is a string with a wildcard', async () => {
      // Testing /api/people* (wildcard match)
      await assertAuthorizedApiCallTo('https://my-api.com/api/people/profile');
    });

    it('matches a full url to an API', async () => {
      // Testing 'https://my-api.com/orders' (exact)
      await assertAuthorizedApiCallTo('https://my-api.com/orders');
    });

    it('matches a URL that contains a query string', async () => {
      await assertAuthorizedApiCallTo(
        'https://my-api.com/api/people?name=test'
      );
    });

    it('matches a URL that contains a hash fragment', async () => {
      await assertAuthorizedApiCallTo(
        'https://my-api.com/api/people#hash-fragment'
      );
    });
  });

  describe('Requests that are configured using a complex object', () => {
    it('waits unil isLoading emits false', async () => {
      const method = 'GET';
      const url = 'https://my-api.com/api/orders';

      isLoading$.next(true);

      httpClient.request(method, url).subscribe();
      await new Promise(process.nextTick);

      httpTestingController.expectNone(url);

      isLoading$.next(false);
      await new Promise(process.nextTick);

      httpTestingController.expectOne(url);
    });

    it('attach the access token when the uri is configured using a string', async () => {
      // Testing { uri: /api/orders } (exact match)
      await assertAuthorizedApiCallTo('https://my-api.com/api/orders');
    });

    it('pass through the route options to getTokenSilently, without additional properties', async () => {
      // Testing { uri: /api/addresses } (exact match)
      await assertAuthorizedApiCallTo('https://my-api.com/api/addresses');

      expect(auth0Client.getTokenSilently).toHaveBeenCalledWith({
        authorizationParams: {
          audience: 'audience',
          scope: 'scope',
        },
      });
    });

    it('attach the access token when the configuration uri is a string with a wildcard', async () => {
      // Testing { uri: /api/calendar* } (wildcard match)
      await assertAuthorizedApiCallTo('https://my-api.com/api/calendar/events');
    });

    it('attaches the access token when the HTTP method matches', async () => {
      // Testing { uri: /api/register } (wildcard match)
      await assertAuthorizedApiCallTo(
        'https://my-api.com/api/register',
        'post'
      );
    });

    it('does not attach the access token if the HTTP method does not match', async () => {
      await assertPassThruApiCallTo('https://my-api.com/api/public');
    });

    it('does not execute HTTP call when not able to retrieve a token', async () => {
      (auth0Client.getTokenSilently as unknown as MockInstance).mockReturnValue(
        throwError({ error: 'login_required' })
      );

      httpClient.request('get', 'https://my-api.com/api/calendar').subscribe({
        error: (err) => expect(err).toEqual({ error: 'login_required' }),
      });

      await new Promise(process.nextTick);

      httpTestingController.expectNone('https://my-api.com/api/calendar');
    });

    it('does execute HTTP call when not able to retrieve a token but allowAnonymous is set to true', async () => {
      (auth0Client.getTokenSilently as unknown as MockInstance).mockReturnValue(
        throwError({ error: 'login_required' })
      );

      await assertPassThruApiCallTo('https://my-api.com/api/orders');
    });

    it('does execute HTTP call when missing_refresh_token but allowAnonymous is set to true', async () => {
      (auth0Client.getTokenSilently as unknown as MockInstance).mockReturnValue(
        throwError({ error: 'missing_refresh_token' })
      );

      await assertPassThruApiCallTo('https://my-api.com/api/orders');
    });

    it('emit error when not able to retrieve a token but allowAnonymous is set to false', async () => {
      (
        auth0Client.getTokenSilently as unknown as MockInstance
      ).mockRejectedValue({ error: 'login_required' });

      httpClient.request('get', 'https://my-api.com/api/calendar').subscribe({
        error: (err) => expect(err).toEqual({ error: 'login_required' }),
      });

      await new Promise(process.nextTick);

      httpTestingController.expectNone('https://my-api.com/api/calendar');

      expect(authState.setError).toHaveBeenCalled();
    });

    it('does not emit error when not able to retrieve a token but allowAnonymous is set to true', async () => {
      (
        auth0Client.getTokenSilently as unknown as MockInstance
      ).mockRejectedValue({ error: 'login_required' });

      await assertPassThruApiCallTo('https://my-api.com/api/orders');
      expect(authState.setError).not.toHaveBeenCalled();
    });

    it('does not emit error when missing_refresh_token but allowAnonymous is set to true', async () => {
      (
        auth0Client.getTokenSilently as unknown as MockInstance
      ).mockRejectedValue({ error: 'missing_refresh_token' });

      await assertPassThruApiCallTo('https://my-api.com/api/orders');
      expect(authState.setError).not.toHaveBeenCalled();
    });

    it('does execute HTTP call when interaction_required but allowAnonymous is set to true', async () => {
      (auth0Client.getTokenSilently as unknown as MockInstance).mockReturnValue(
        throwError({ error: 'interaction_required' })
      );

      await assertPassThruApiCallTo('https://my-api.com/api/orders');
    });

    it('does execute HTTP call when getTokenSilently returns undefined but allowAnonymous is set to true', async () => {
      (
        auth0Client.getTokenSilently as unknown as MockInstance
      ).mockResolvedValue(undefined);

      await assertPassThruApiCallTo('https://my-api.com/api/orders');
    });

    it('does not emit error when interaction_required but allowAnonymous is set to true', async () => {
      (
        auth0Client.getTokenSilently as unknown as MockInstance
      ).mockRejectedValue({ error: 'interaction_required' });

      await assertPassThruApiCallTo('https://my-api.com/api/orders');
      expect(authState.setError).not.toHaveBeenCalled();
    });

    it('does not emit error when getTokenSilently returns undefined but allowAnonymous is set to true', async () => {
      (
        auth0Client.getTokenSilently as unknown as MockInstance
      ).mockResolvedValue(undefined);

      await assertPassThruApiCallTo('https://my-api.com/api/orders');
      expect(authState.setError).not.toHaveBeenCalled();
    });

    it('attach the access token when tokenOptions includes detailedResponse: true', async () => {
      // Mock getTokenSilently to return a detailed response object
      (
        auth0Client.getTokenSilently as unknown as MockInstance
      ).mockResolvedValue({
        access_token: 'detailed-access-token',
        id_token: 'id-token',
        expires_in: 86400,
        token_type: 'Bearer',
        scope: 'openid profile email',
      });

      // Add a route with detailedResponse: true
      config.httpInterceptor!.allowedList!.push({
        uri: 'https://my-api.com/api/detailed',
        tokenOptions: {
          detailedResponse: true,
        },
      });

      httpClient.get('https://my-api.com/api/detailed').subscribe();
      await new Promise(process.nextTick);
      req = httpTestingController.expectOne('https://my-api.com/api/detailed');

      // Should attach only the access_token string, not the whole object
      expect(req.request.headers.get('Authorization')).toBe(
        'Bearer detailed-access-token'
      );
    });

    it('stores only the access token string when detailedResponse is used', async () => {
      const detailedResponse = {
        access_token: 'detailed-token-123',
        id_token: 'id-token-456',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'openid profile',
      };

      (
        auth0Client.getTokenSilently as unknown as MockInstance
      ).mockResolvedValue(detailedResponse);

      vi.spyOn(authState, 'setAccessToken');

      config.httpInterceptor!.allowedList!.push({
        uri: 'https://my-api.com/api/detailed-store',
        tokenOptions: {
          detailedResponse: true,
        },
      });

      httpClient.get('https://my-api.com/api/detailed-store').subscribe();
      await new Promise(process.nextTick);
      req = httpTestingController.expectOne(
        'https://my-api.com/api/detailed-store'
      );

      // Should store only the token string, not the whole object
      expect(authState.setAccessToken).toHaveBeenCalledWith(
        'detailed-token-123'
      );
    });

    it('handles string token response when detailedResponse is false', async () => {
      // Mock getTokenSilently to return a plain string token (default behavior)
      (
        auth0Client.getTokenSilently as unknown as MockInstance
      ).mockResolvedValue('simple-access-token');

      vi.spyOn(authState, 'setAccessToken');

      config.httpInterceptor!.allowedList!.push({
        uri: 'https://my-api.com/api/simple',
        tokenOptions: {
          detailedResponse: false,
        },
      });

      httpClient.get('https://my-api.com/api/simple').subscribe();
      await new Promise(process.nextTick);
      req = httpTestingController.expectOne('https://my-api.com/api/simple');

      // Should handle string token correctly
      expect(req.request.headers.get('Authorization')).toBe(
        'Bearer simple-access-token'
      );
      expect(authState.setAccessToken).toHaveBeenCalledWith(
        'simple-access-token'
      );
    });
  });

  describe('Requests that are configured using an uri matcher', () => {
    it('waits unil isLoading emits false', async () => {
      const method = 'GET';
      const url = 'https://my-api.com/api/orders';

      isLoading$.next(true);

      httpClient.request(method, url).subscribe();
      await new Promise(process.nextTick);

      httpTestingController.expectNone(url);

      isLoading$.next(false);
      await new Promise(process.nextTick);

      httpTestingController.expectOne(url);
    });

    it('attach the access token when the matcher returns true', async () => {
      // Testing { uriMatcher: (uri) => uri.indexOf('/api/contact') !== -1 }
      await assertAuthorizedApiCallTo('https://my-api.com/api/contact', 'post');
    });

    it('pass through the route options to getTokenSilently, without additional properties', async () => {
      // Testing { uriMatcher: (uri) => uri.indexOf('/api/contact') !== -1 }
      await assertAuthorizedApiCallTo('https://my-api.com/api/contact', 'post');

      expect(auth0Client.getTokenSilently).toHaveBeenCalledWith({
        authorizationParams: {
          audience: 'audience',
          scope: 'scope',
        },
      });
    });

    it('does attach the access token when the HTTP method does match', async () => {
      // Testing { uriMatcher: (uri) => uri.indexOf('/api/contact') !== -1 }
      await assertAuthorizedApiCallTo('https://my-api.com/api/contact', 'post');
    });

    it('does not attach the access token when the HTTP method does not match', async () => {
      // Testing { uriMatcher: (uri) => uri.indexOf('/api/contact') !== -1 }
      await assertPassThruApiCallTo('https://my-api.com/api/contact');
    });
  });
});
