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
import { AuthService } from './auth.service';
import { of, throwError } from 'rxjs';

// NOTE: Read Async testing: https://github.com/angular/angular/issues/25733#issuecomment-636154553

describe('The Auth HTTP Interceptor', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;
  let authService: Partial<AuthService>;
  let req: TestRequest;
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
    authService = jasmine.createSpyObj('AuthService', [
      'getAccessTokenSilently',
    ]);
    (authService.getAccessTokenSilently as jasmine.Spy).and.returnValue(
      of('access-token')
    );

    config = {
      httpInterceptor: {
        allowedList: [
          '',
          '/api/photos',
          '/api/people*',
          'https://my-api.com/orders',
          {
            uri: '/api/orders',
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
        { provide: AuthService, useValue: authService },
        {
          provide: AuthClientConfig,
          useValue: { get: () => config },
        },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
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
      assertAuthorizedApiCallTo('/api/orders', done);
    }));

    it('pass through the route options to getTokenSilently, without additional properties', fakeAsync((
      done: () => void
    ) => {
      // Testing { uri: /api/addresses } (exact match)
      assertAuthorizedApiCallTo('/api/addresses', done);

      expect(authService.getAccessTokenSilently).toHaveBeenCalledWith({
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
      (authService.getAccessTokenSilently as jasmine.Spy).and.returnValue(
        throwError({ error: 'login_required' })
      );

      httpClient
        .request('get', '/api/calendar')
        .subscribe({
          error: (err) => expect(err).toEqual({ error: 'login_required' }),
        });

      httpTestingController.expectNone('/api/calendar');
      flush();
    }));

    it('does execute HTTP call when not able to retrieve a token but allowAnonymous is set to true', fakeAsync((
      done: () => void
    ) => {
      (authService.getAccessTokenSilently as jasmine.Spy).and.returnValue(
        throwError({ error: 'login_required' })
      );

      assertPassThruApiCallTo('/api/orders', done);
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

      expect(authService.getAccessTokenSilently).toHaveBeenCalledWith({
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
