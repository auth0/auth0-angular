import { AuthHttpInterceptor } from './auth.interceptor';
import { TestBed, fakeAsync, flush } from '@angular/core/testing';
import { HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
  TestRequest,
} from '@angular/common/http/testing';
import { Data } from '@angular/router';
import {
  AuthConfig,
  HttpMethod,
  AuthClientConfig,
  HttpInterceptorConfig,
} from './auth.config';
import { throwError } from 'rxjs';
import { Auth0Client } from '@auth0/auth0-spa-js';
import { Auth0ClientService } from './auth.client';
import { AuthState } from './auth.state';

// NOTE: Read Async testing: https://github.com/angular/angular/issues/25733#issuecomment-636154553

describe('The Auth HTTP Interceptor', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;
  let auth0Client: Auth0Client;
  let req: TestRequest;
  let authState: AuthState;
  const testData: Data = { message: 'Hello, world' };

  const assertAuthorizedApiCallTo = (
    url: string,
    done: () => void,
    method = 'get'
  ) => {
    httpClient.request(method, url).subscribe(done);
    flush();
    req = httpTestingController.expectOne(url);

    expect(req.request.headers.get('Authorization')).toBe(
      'Bearer access-token'
    );
  };

  const assertPassThruApiCallTo = (url: string, done: () => void) => {
    httpClient.get<Data>(url).subscribe(done);
    flush();
    req = httpTestingController.expectOne(url);
    expect(req.request.headers.get('Authorization')).toBeFalsy();
  };

  let config: Partial<AuthConfig>;

  beforeEach(() => {
    req = undefined as any;

    auth0Client = new Auth0Client({
      domain: '',
      client_id: '',
    });

    spyOn(auth0Client, 'getTokenSilently').and.resolveTo('access-token');

    config = {
      httpInterceptor: {
        allowedList: [
          '',
          '/api/photos',
          '/api/people*',
          'https://my-api.com/orders',
          {
            uri: 'https://my-api.com/api/orders',
            allowAnonymous: true,
          },
          {
            uri: '/api/addresses',
            tokenOptions: {
              audience: 'audience',
              scope: 'scope',
            },
          },
          {
            uri: '/api/calendar*',
          },
          {
            uri: '/api/register',
            httpMethod: HttpMethod.Post,
          },
          {
            uriMatcher: (uri) => uri.indexOf('/api/contact') !== -1,
            httpMethod: HttpMethod.Post,
            tokenOptions: {
              audience: 'audience',
              scope: 'scope',
            },
          },
        ],
      },
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
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
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
    authState = TestBed.inject(AuthState);

    spyOn(authState, 'setError').and.callThrough();
  });

  afterEach(() => {
    httpTestingController.verify();
    if (req) {
      req.flush(testData);
    }
  });

  describe('When no httpInterceptor is configured', () => {
    it('pass through and do not have access tokens attached', fakeAsync((
      done: () => void
    ) => {
      config.httpInterceptor = (null as unknown) as HttpInterceptorConfig;
      assertPassThruApiCallTo('/api/public', done);
    }));
  });

  describe('Requests that do not require authentication', () => {
    it('pass through and do not have access tokens attached', fakeAsync((
      done: () => void
    ) => {
      assertPassThruApiCallTo('/api/public', done);
    }));
  });

  describe('Requests that are configured using a primitive', () => {
    it('attach the access token when the configuration uri is a string', fakeAsync((
      done: () => void
    ) => {
      // Testing /api/photos (exact match)
      assertAuthorizedApiCallTo('/api/photos', done);
    }));

    it('attach the access token when the configuration uri is a string with a wildcard', fakeAsync((
      done: () => void
    ) => {
      // Testing /api/people* (wildcard match)
      assertAuthorizedApiCallTo('/api/people/profile', done);
    }));

    it('matches a full url to an API', fakeAsync((done: () => void) => {
      // Testing 'https://my-api.com/orders' (exact)
      assertAuthorizedApiCallTo('https://my-api.com/orders', done);
    }));

    it('matches a URL that contains a query string', fakeAsync((
      done: () => void
    ) => {
      assertAuthorizedApiCallTo('/api/people?name=test', done);
    }));

    it('matches a URL that contains a hash fragment', fakeAsync((
      done: () => void
    ) => {
      assertAuthorizedApiCallTo('/api/people#hash-fragment', done);
    }));
  });

  describe('Requests that are configured using a complex object', () => {
    it('attach the access token when the uri is configured using a string', fakeAsync((
      done: () => void
    ) => {
      // Testing { uri: /api/orders } (exact match)
      assertAuthorizedApiCallTo('https://my-api.com/api/orders', done);
    }));

    it('pass through the route options to getTokenSilently, without additional properties', fakeAsync((
      done: () => void
    ) => {
      // Testing { uri: /api/addresses } (exact match)
      assertAuthorizedApiCallTo('/api/addresses', done);

      expect(auth0Client.getTokenSilently).toHaveBeenCalledWith({
        audience: 'audience',
        scope: 'scope',
      });
    }));

    it('attach the access token when the configuration uri is a string with a wildcard', fakeAsync((
      done: () => void
    ) => {
      // Testing { uri: /api/calendar* } (wildcard match)
      assertAuthorizedApiCallTo('/api/calendar/events', done);
    }));

    it('attaches the access token when the HTTP method matches', fakeAsync((
      done: () => void
    ) => {
      // Testing { uri: /api/register } (wildcard match)
      assertAuthorizedApiCallTo('/api/register', done, 'post');
    }));

    it('does not attach the access token if the HTTP method does not match', fakeAsync((
      done: () => void
    ) => {
      assertPassThruApiCallTo('/api/public', done);
    }));

    it('does not execute HTTP call when not able to retrieve a token', fakeAsync((
      done: () => void
    ) => {
      (auth0Client.getTokenSilently as jasmine.Spy).and.returnValue(
        throwError({ error: 'login_required' })
      );

      httpClient.request('get', '/api/calendar').subscribe({
        error: (err) => expect(err).toEqual({ error: 'login_required' }),
      });

      httpTestingController.expectNone('/api/calendar');
      flush();
    }));

    it('does execute HTTP call when not able to retrieve a token but allowAnonymous is set to true', fakeAsync((
      done: () => void
    ) => {
      (auth0Client.getTokenSilently as jasmine.Spy).and.returnValue(
        throwError({ error: 'login_required' })
      );

      assertPassThruApiCallTo('https://my-api.com//api/orders', done);
    }));

    it('emit error when not able to retrieve a token but allowAnonymous is set to false', fakeAsync((
      done: () => void
    ) => {
      (auth0Client.getTokenSilently as jasmine.Spy).and.callFake(() => {
        return Promise.reject({ error: 'login_required' });
      });

      httpClient.request('get', '/api/calendar').subscribe({
        error: (err) => expect(err).toEqual({ error: 'login_required' }),
      });

      httpTestingController.expectNone('/api/calendar');
      flush();

      expect(authState.setError).toHaveBeenCalled();
    }));

    it('does not emit error when not able to retrieve a token but allowAnonymous is set to true', fakeAsync(() => {
      (auth0Client.getTokenSilently as jasmine.Spy).and.callFake(() => {
        return Promise.reject({ error: 'login_required' });
      });

      assertPassThruApiCallTo('https://my-api.com/api/orders', () => {
        expect(authState.setError).not.toHaveBeenCalled();
      });
    }));
  });

  describe('Requests that are configured using an uri matcher', () => {
    it('attach the access token when the matcher returns true', fakeAsync((
      done: () => void
    ) => {
      // Testing { uriMatcher: (uri) => uri.indexOf('/api/contact') !== -1 }
      assertAuthorizedApiCallTo('/api/contact', done, 'post');
    }));

    it('pass through the route options to getTokenSilently, without additional properties', fakeAsync((
      done: () => void
    ) => {
      // Testing { uriMatcher: (uri) => uri.indexOf('/api/contact') !== -1 }
      assertAuthorizedApiCallTo('/api/contact', done, 'post');

      expect(auth0Client.getTokenSilently).toHaveBeenCalledWith({
        audience: 'audience',
        scope: 'scope',
      });
    }));

    it('does not attach the access token when the HTTP method does not match', fakeAsync((
      done: () => void
    ) => {
      // Testing { uriMatcher: (uri) => uri.indexOf('/api/contact') !== -1 }
      assertAuthorizedApiCallTo('/api/contact', done, 'post');
      assertPassThruApiCallTo('/api/contact', done);
    }));
  });
});
