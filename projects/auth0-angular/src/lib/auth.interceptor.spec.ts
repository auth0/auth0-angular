import { AuthHttpInterceptor } from './auth.interceptor';
import { TestBed, fakeAsync, flush } from '@angular/core/testing';
import { HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { Data } from '@angular/router';
import { Auth0ClientService } from './auth.client';
import { AuthConfigService, AuthConfig } from './auth.config';

describe('The Auth HTTP Interceptor', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;
  let auth0Client: any;

  beforeEach(() => {
    auth0Client = jasmine.createSpyObj('Auth0Client', ['getTokenSilently']);
    auth0Client.getTokenSilently.and.resolveTo('access-token');

    const config: Partial<AuthConfig> = {
      httpInterceptor: {
        allowedList: [
          '/basic-api',
          /^\/basic-api-regex/,
          { uri: '/api' },
          { uri: /^\/regex-api/ },
          {
            uri: '/api-with-options',
            audience: 'audience',
            scope: 'scope',
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
          provide: AuthConfigService,
          useValue: config,
        },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  describe('Requests that do not require authentication', () => {
    it('pass through and do not have access tokens attached', () => {
      const testData: Data = { message: 'Hello, world' };

      httpClient.get<Data>('/non-api').subscribe((result) => {
        expect(result).toEqual(testData);
        expect(req.request.headers.get('Authorization')).toBeFalsy();
      });

      const req = httpTestingController.expectOne('/non-api');
      req.flush(testData);
    });
  });

  describe('Requests that are configured using a primitive', () => {
    it('attach the access token when the configuration uri is a string', fakeAsync((
      done
    ) => {
      const testData: Data = { message: 'Hello, world' };

      httpClient.get('/basic-api').subscribe(done);
      flush();

      const req = httpTestingController.expectOne('/basic-api');

      expect(req.request.headers.get('Authorization')).toBe(
        'Bearer access-token'
      );

      req.flush(testData);
    }));

    it('attach the access token when the configuration uri is a regex', fakeAsync((
      done
    ) => {
      const testData: Data = { message: 'Hello, world' };

      httpClient.get('/basic-api-regex?value=123').subscribe(done);
      flush();

      const req = httpTestingController.expectOne('/basic-api-regex?value=123');

      expect(req.request.headers.get('Authorization')).toBe(
        'Bearer access-token'
      );

      req.flush(testData);
    }));
  });

  describe('Requests that are configured using a complex object', () => {
    it('attach the access token when the uri is configured using a string', fakeAsync((
      done
    ) => {
      // Async testing: https://github.com/angular/angular/issues/25733#issuecomment-636154553
      const testData: Data = { message: 'Hello, world' };

      httpClient.get('/api').subscribe(done);
      flush();

      const req = httpTestingController.expectOne('/api');

      expect(req.request.headers.get('Authorization')).toBe(
        'Bearer access-token'
      );

      req.flush(testData);
    }));

    it('attach the access token when the uri is configured using a regex', fakeAsync((
      done
    ) => {
      const testData: Data = { message: 'Hello, world' };

      httpClient.get('/regex-api?my-param=42').subscribe(done);
      flush();

      const req = httpTestingController.expectOne('/regex-api?my-param=42');

      expect(req.request.headers.get('Authorization')).toBe(
        'Bearer access-token'
      );

      req.flush(testData);
    }));

    it('pass through the route options to getTokenSilently, without additional properties', fakeAsync((
      done
    ) => {
      const testData: Data = { message: 'Hello, world' };
      httpClient.get('/api-with-options').subscribe(done);
      flush();

      const req = httpTestingController.expectOne('/api-with-options');

      expect(req.request.headers.get('Authorization')).toBe(
        'Bearer access-token'
      );

      expect(auth0Client.getTokenSilently).toHaveBeenCalledWith({
        audience: 'audience',
        scope: 'scope',
      });

      req.flush(testData);
    }));
  });
});
