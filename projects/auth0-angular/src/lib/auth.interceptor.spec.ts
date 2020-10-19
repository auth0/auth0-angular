import { AuthHttpInterceptor } from './auth.interceptor';
import { TestBed, fakeAsync, flush } from '@angular/core/testing';
import { HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
  TestRequest,
} from '@angular/common/http/testing';
import { Data } from '@angular/router';
import { Auth0ClientService } from './auth.client';
import { AuthConfig, HttpMethod, AuthClientConfig } from './auth.config';

// NOTE: Read Async testing: https://github.com/angular/angular/issues/25733#issuecomment-636154553

describe('The Auth HTTP Interceptor', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;
  let auth0Client: any;
  let req: TestRequest;
  const testData: Data = { message: 'Hello, world' };

  const assertAuthorizedApiCallTo = (
    url: string,
    done: () => void,
    method = 'get'
  ) => {
    httpClient[method](url).subscribe(done);
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

  beforeEach(() => {
    auth0Client = jasmine.createSpyObj('Auth0Client', ['getTokenSilently']);
    auth0Client.getTokenSilently.and.resolveTo('access-token');

    const config: Partial<AuthConfig> = {
      httpInterceptor: {
        allowedList: [
          '',
          '/api/photos',
          '/api/people*',
          'https://my-api.com/orders',
          { uri: '/api/orders' },
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
        { provide: Auth0ClientService, useValue: auth0Client },
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
    req.flush(testData);
  });

  describe('Requests that do not require authentication', () => {
    it('pass through and do not have access tokens attached', fakeAsync((
      done
    ) => {
      assertPassThruApiCallTo('/api/public', done);
    }));
  });

  describe('Requests that are configured using a primitive', () => {
    it('attach the access token when the configuration uri is a string', fakeAsync((
      done
    ) => {
      // Testing /api/photos (exact match)
      assertAuthorizedApiCallTo('/api/photos', done);
    }));

    it('attach the access token when the configuration uri is a string with a wildcard', fakeAsync((
      done
    ) => {
      // Testing /api/people* (wildcard match)
      assertAuthorizedApiCallTo('/api/people/profile', done);
    }));

    it('matches a full url to an API', fakeAsync((done) => {
      // Testing 'https://my-api.com/orders' (exact)
      assertAuthorizedApiCallTo('https://my-api.com/orders', done);
    }));

    it('matches a URL that contains a query string', fakeAsync((done) => {
      assertAuthorizedApiCallTo('/api/people?name=test', done);
    }));

    it('matches a URL that contains a hash fragment', fakeAsync((done) => {
      assertAuthorizedApiCallTo('/api/people#hash-fragment', done);
    }));
  });

  describe('Requests that are configured using a complex object', () => {
    it('attach the access token when the uri is configured using a string', fakeAsync((
      done
    ) => {
      // Testing { uri: /api/orders } (exact match)
      assertAuthorizedApiCallTo('/api/orders', done);
    }));

    it('pass through the route options to getTokenSilently, without additional properties', fakeAsync((
      done
    ) => {
      // Testing { uri: /api/addresses } (exact match)
      assertAuthorizedApiCallTo('/api/addresses', done);

      expect(auth0Client.getTokenSilently).toHaveBeenCalledWith({
        audience: 'audience',
        scope: 'scope',
      });
    }));

    it('attach the access token when the configuration uri is a string with a wildcard', fakeAsync((
      done
    ) => {
      // Testing { uri: /api/calendar* } (wildcard match)
      assertAuthorizedApiCallTo('/api/calendar/events', done);
    }));

    it('attaches the access token when the HTTP method matches', fakeAsync((
      done
    ) => {
      // Testing { uri: /api/register } (wildcard match)
      assertAuthorizedApiCallTo('/api/register', done, 'post');
    }));

    it('does not attach the access token if the HTTP method does not match', fakeAsync((
      done
    ) => {
      assertPassThruApiCallTo('/api/public', done);
    }));
  });
});
