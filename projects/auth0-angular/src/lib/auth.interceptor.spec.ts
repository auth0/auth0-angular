import { AuthHttpInterceptor } from './auth.interceptor';
import { TestBed, fakeAsync, flush } from '@angular/core/testing';
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

// NOTE: Read Async testing: https://github.com/angular/angular/issues/25733#issuecomment-636154553

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

  const assertAuthorizedApiCallTo = async (
    url: string,
    done: () => void,
    method = 'get'
  ) => {
    httpClient.request(method, url).subscribe(done);
    flush();
    await new Promise(process.nextTick);
    req = httpTestingController.expectOne(url);

    expect(req.request.headers.get('Authorization')).toBe(
      'Bearer access-token'
    );
  };

  const assertPassThruApiCallTo = async (url: string, done: () => void) => {
    httpClient.get<Data>(url).subscribe(done);
    flush();
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

    jest
      .spyOn(auth0Client, 'getTokenSilently')
      .mockImplementation(() => Promise.resolve('access-token'));

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

    jest.spyOn(authState, 'setError');
  });

  afterEach(() => {
    httpTestingController.verify();
    if (req) {
      req.flush(testData);
    }
  });

  describe('When no httpInterceptor is configured', () => {
    it('pass through and do not have access tokens attached', fakeAsync(async (
      done: () => void
    ) => {
      config.httpInterceptor = null as unknown as HttpInterceptorConfig;
      await assertPassThruApiCallTo('https://my-api.com/api/public', done);
    }));
  });

  describe('Requests that do not require authentication', () => {
    it('pass through and do not have access tokens attached', fakeAsync(async (
      done: () => void
    ) => {
      await assertPassThruApiCallTo('https://my-api.com/api/public', done);
    }));
  });

  describe('Requests that are configured using a primitive', () => {
    it('waits unil isLoading emits false', fakeAsync(async (
      done: () => void
    ) => {
      const method = 'GET';
      const url = 'https://my-api.com/api/photos';

      isLoading$.next(true);

      httpClient.request(method, url).subscribe(done);
      flush();

      httpTestingController.expectNone(url);

      isLoading$.next(false);
      flush();

      httpTestingController.expectOne(url);
    }));

    it('attach the access token when the configuration uri is a string', fakeAsync(async (
      done: () => void
    ) => {
      // Testing /api/photos (exact match)
      await assertAuthorizedApiCallTo('https://my-api.com/api/photos', done);
    }));

    it('attach the access token when the configuration uri is a string with a wildcard', fakeAsync(async (
      done: () => void
    ) => {
      // Testing /api/people* (wildcard match)
      await assertAuthorizedApiCallTo(
        'https://my-api.com/api/people/profile',
        done
      );
    }));

    it('matches a full url to an API', fakeAsync(async (done: () => void) => {
      // Testing 'https://my-api.com/orders' (exact)
      await assertAuthorizedApiCallTo('https://my-api.com/orders', done);
    }));

    it('matches a URL that contains a query string', fakeAsync(async (
      done: () => void
    ) => {
      await assertAuthorizedApiCallTo(
        'https://my-api.com/api/people?name=test',
        done
      );
    }));

    it('matches a URL that contains a hash fragment', fakeAsync(async (
      done: () => void
    ) => {
      await assertAuthorizedApiCallTo(
        'https://my-api.com/api/people#hash-fragment',
        done
      );
    }));
  });

  describe('Requests that are configured using a complex object', () => {
    it('waits unil isLoading emits false', fakeAsync(async (
      done: () => void
    ) => {
      const method = 'GET';
      const url = 'https://my-api.com/api/orders';

      isLoading$.next(true);

      httpClient.request(method, url).subscribe(done);
      flush();

      httpTestingController.expectNone(url);

      isLoading$.next(false);
      flush();

      httpTestingController.expectOne(url);
    }));

    it('attach the access token when the uri is configured using a string', fakeAsync(async (
      done: () => void
    ) => {
      // Testing { uri: /api/orders } (exact match)
      await assertAuthorizedApiCallTo('https://my-api.com/api/orders', done);
    }));

    it('pass through the route options to getTokenSilently, without additional properties', fakeAsync(async (
      done: () => void
    ) => {
      // Testing { uri: /api/addresses } (exact match)
      await assertAuthorizedApiCallTo('https://my-api.com/api/addresses', done);

      expect(auth0Client.getTokenSilently).toHaveBeenCalledWith({
        authorizationParams: {
          audience: 'audience',
          scope: 'scope',
        },
      });
    }));

    it('attach the access token when the configuration uri is a string with a wildcard', fakeAsync(async (
      done: () => void
    ) => {
      // Testing { uri: /api/calendar* } (wildcard match)
      await assertAuthorizedApiCallTo(
        'https://my-api.com/api/calendar/events',
        done
      );
    }));

    it('attaches the access token when the HTTP method matches', fakeAsync(async (
      done: () => void
    ) => {
      // Testing { uri: /api/register } (wildcard match)
      await assertAuthorizedApiCallTo(
        'https://my-api.com/api/register',
        done,
        'post'
      );
    }));

    it('does not attach the access token if the HTTP method does not match', fakeAsync(async (
      done: () => void
    ) => {
      await assertPassThruApiCallTo('https://my-api.com/api/public', done);
    }));

    it('does not execute HTTP call when not able to retrieve a token', fakeAsync(async (
      done: () => void
    ) => {
      (
        auth0Client.getTokenSilently as unknown as jest.SpyInstance
      ).mockReturnValue(throwError({ error: 'login_required' }));

      httpClient.request('get', 'https://my-api.com/api/calendar').subscribe({
        error: (err) => expect(err).toEqual({ error: 'login_required' }),
      });

      flush();
      await new Promise(process.nextTick);

      httpTestingController.expectNone('https://my-api.com/api/calendar');
    }));

    it('does execute HTTP call when not able to retrieve a token but allowAnonymous is set to true', fakeAsync(async (
      done: () => void
    ) => {
      (
        auth0Client.getTokenSilently as unknown as jest.SpyInstance
      ).mockReturnValue(throwError({ error: 'login_required' }));

      await assertPassThruApiCallTo('https://my-api.com/api/orders', done);
    }));

    it('does execute HTTP call when missing_refresh_token but allowAnonymous is set to true', fakeAsync(async (
      done: () => void
    ) => {
      (
        auth0Client.getTokenSilently as unknown as jest.SpyInstance
      ).mockReturnValue(throwError({ error: 'missing_refresh_token' }));

      await assertPassThruApiCallTo('https://my-api.com/api/orders', done);
    }));

    it('emit error when not able to retrieve a token but allowAnonymous is set to false', fakeAsync(async (
      done: () => void
    ) => {
      (
        auth0Client.getTokenSilently as unknown as jest.SpyInstance
      ).mockRejectedValue({ error: 'login_required' });

      httpClient.request('get', 'https://my-api.com/api/calendar').subscribe({
        error: (err) => expect(err).toEqual({ error: 'login_required' }),
      });

      flush();
      await new Promise(process.nextTick);

      httpTestingController.expectNone('https://my-api.com/api/calendar');

      expect(authState.setError).toHaveBeenCalled();
    }));

    it('does not emit error when not able to retrieve a token but allowAnonymous is set to true', fakeAsync(async () => {
      (
        auth0Client.getTokenSilently as unknown as jest.SpyInstance
      ).mockRejectedValue({ error: 'login_required' });

      await assertPassThruApiCallTo('https://my-api.com/api/orders', () => {
        expect(authState.setError).not.toHaveBeenCalled();
      });
    }));

    it('does not emit error when missing_refresh_token but allowAnonymous is set to true', fakeAsync(async () => {
      (
        auth0Client.getTokenSilently as unknown as jest.SpyInstance
      ).mockRejectedValue({ error: 'missing_refresh_token' });

      await assertPassThruApiCallTo('https://my-api.com/api/orders', () => {
        expect(authState.setError).not.toHaveBeenCalled();
      });
    }));
  });

  describe('Requests that are configured using an uri matcher', () => {
    it('waits unil isLoading emits false', fakeAsync(async (
      done: () => void
    ) => {
      const method = 'GET';
      const url = 'https://my-api.com/api/orders';

      isLoading$.next(true);

      httpClient.request(method, url).subscribe(done);
      flush();

      httpTestingController.expectNone(url);

      isLoading$.next(false);
      flush();

      httpTestingController.expectOne(url);
    }));

    it('attach the access token when the matcher returns true', fakeAsync(async (
      done: () => void
    ) => {
      // Testing { uriMatcher: (uri) => uri.indexOf('/api/contact') !== -1 }
      await assertAuthorizedApiCallTo(
        'https://my-api.com/api/contact',
        done,
        'post'
      );
    }));

    it('pass through the route options to getTokenSilently, without additional properties', fakeAsync(async (
      done: () => void
    ) => {
      // Testing { uriMatcher: (uri) => uri.indexOf('/api/contact') !== -1 }
      await assertAuthorizedApiCallTo(
        'https://my-api.com/api/contact',
        done,
        'post'
      );

      expect(auth0Client.getTokenSilently).toHaveBeenCalledWith({
        authorizationParams: {
          audience: 'audience',
          scope: 'scope',
        },
      });
    }));

    it('does attach the access token when the HTTP method does match', fakeAsync(async (
      done: () => void
    ) => {
      // Testing { uriMatcher: (uri) => uri.indexOf('/api/contact') !== -1 }
      await assertAuthorizedApiCallTo(
        'https://my-api.com/api/contact',
        done,
        'post'
      );
    }));

    it('does not attach the access token when the HTTP method does not match', fakeAsync(async (
      done: () => void
    ) => {
      // Testing { uriMatcher: (uri) => uri.indexOf('/api/contact') !== -1 }
      await assertPassThruApiCallTo('https://my-api.com/api/contact', done);
    }));
  });
});
