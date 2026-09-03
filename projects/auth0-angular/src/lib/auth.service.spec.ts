// Each spec file runs in its own jsdom window; zone.js from test-setup.ts
// patched a different window, so it must be imported here too.
import 'zone.js';
import 'zone.js/testing';
import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { Auth0ClientService } from './auth.client';
import {
  Auth0Client,
  IdToken,
  ResponseType,
  ConnectAccountRedirectResult,
  RefreshTokenMode,
} from '@auth0/auth0-spa-js';
import { AbstractNavigator } from './abstract-navigator';
import { Observable } from 'rxjs';
import {
  bufferCount,
  bufferTime,
  delay,
  filter,
  mergeMap,
  take,
  tap,
} from 'rxjs/operators';

// RxJS 6 polyfill for firstValueFrom (added in RxJS 7)
const firstValueFrom = <T>(obs: Observable<T>): Promise<T> =>
  obs.pipe(take(1)).toPromise() as Promise<T>;
import { AuthConfig, AuthConfigService } from './auth.config';
import { AuthState } from './auth.state';
import type { MockInstance, Mock } from 'vitest';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';

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

/**
 * Wraps service.isLoading$ so that assertions can be made
 * only when the SDK has finished loading.
 *
 * @param service The service instance under test
 */
const loaded = (service: AuthService) =>
  service.isLoading$.pipe(filter((loading) => !loading));

describe('AuthService', () => {
  let auth0Client: Auth0Client;
  let moduleSetup: any;
  let authConfig: Partial<AuthConfig>;
  let authState: AuthState;

  const createService = () => TestBed.inject(AuthService);

  beforeEach(() => {
    authConfig = {};
    auth0Client = new Auth0Client({
      domain: '',
      clientId: '',
    });

    vi.spyOn(auth0Client, 'handleRedirectCallback').mockResolvedValue({
      appState: undefined,
      response_type: ResponseType.Code,
    } as any);
    vi.spyOn(auth0Client, 'loginWithRedirect').mockResolvedValue();
    vi.spyOn(auth0Client, 'connectAccountWithRedirect').mockResolvedValue();
    vi.spyOn(auth0Client, 'loginWithPopup').mockResolvedValue();
    vi.spyOn(auth0Client, 'checkSession').mockResolvedValue();
    vi.spyOn(auth0Client, 'isAuthenticated').mockResolvedValue(false);
    vi.spyOn(auth0Client, 'getUser').mockResolvedValue(undefined);
    vi.spyOn(auth0Client, 'getIdTokenClaims').mockResolvedValue(undefined);
    vi.spyOn(auth0Client, 'logout');
    vi.spyOn(auth0Client, 'getTokenSilently').mockResolvedValue(
      '__access_token__'
    );

    vi.spyOn(auth0Client, 'getTokenWithPopup').mockResolvedValue(
      '__access_token_from_popup__'
    );

    vi.spyOn(auth0Client, 'loginWithCustomTokenExchange').mockResolvedValue({
      access_token: '__exchanged_access_token__',
      id_token: '__exchanged_id_token__',
      token_type: 'Bearer',
      expires_in: 86400,
    });

    vi.spyOn(auth0Client, 'getDpopNonce').mockResolvedValue('test-nonce-value');
    vi.spyOn(auth0Client, 'setDpopNonce').mockResolvedValue(undefined);
    vi.spyOn(auth0Client, 'generateDpopProof').mockResolvedValue(
      'test-proof-jwt'
    );
    vi.spyOn(auth0Client, 'createFetcher').mockReturnValue({
      fetch: vi.fn(),
    } as any);

    vi.spyOn(auth0Client.mfa, 'getAuthenticators').mockResolvedValue([
      { id: 'auth-1', authenticatorType: 'otp', active: true },
    ]);
    vi.spyOn(auth0Client.mfa, 'enroll').mockResolvedValue({
      authenticatorType: 'otp',
      secret: '__totp_secret__',
      barcodeUri: '__barcode_uri__',
    });
    vi.spyOn(auth0Client.mfa, 'challenge').mockResolvedValue({
      challengeType: 'otp',
    });
    vi.spyOn(auth0Client.mfa, 'getEnrollmentFactors').mockResolvedValue([
      { type: 'otp' },
    ]);
    vi.spyOn(auth0Client.mfa, 'verify').mockResolvedValue({
      access_token: '__mfa_access_token__',
      id_token: '__mfa_id_token__',
      token_type: 'Bearer',
      expires_in: 86400,
    });

    vi.spyOn(auth0Client.passkey, 'signup').mockResolvedValue({
      access_token: '__passkey_access_token__',
      id_token: '__passkey_id_token__',
      token_type: 'Bearer',
      expires_in: 86400,
    });
    vi.spyOn(auth0Client.passkey, 'login').mockResolvedValue({
      access_token: '__passkey_access_token__',
      id_token: '__passkey_id_token__',
      token_type: 'Bearer',
      expires_in: 86400,
    });

    vi.spyOn(auth0Client.myAccount, 'getFactors').mockResolvedValue([]);
    vi.spyOn(
      auth0Client.myAccount,
      'getAuthenticationMethods'
    ).mockResolvedValue([]);
    vi.spyOn(
      auth0Client.myAccount,
      'getAuthenticationMethod'
    ).mockResolvedValue({ id: '__method_id__' } as any);
    vi.spyOn(
      auth0Client.myAccount,
      'deleteAuthenticationMethod'
    ).mockResolvedValue();
    vi.spyOn(
      auth0Client.myAccount,
      'updateAuthenticationMethod'
    ).mockResolvedValue({ id: '__method_id__' } as any);
    vi.spyOn(auth0Client.myAccount, 'enrollmentChallenge').mockResolvedValue({
      id: '__challenge_id__',
      location: 'https://example.auth0.com/enroll',
      auth_session: '__auth_session__',
      type: 'totp',
    } as any);
    vi.spyOn(auth0Client.myAccount, 'enrollmentVerify').mockResolvedValue({
      id: '__method_id__',
    } as any);

    window.history.replaceState(null, '', '');

    moduleSetup = {
      providers: [
        AbstractNavigator,
        {
          provide: Auth0ClientService,
          useValue: auth0Client,
        },
        {
          provide: AuthConfigService,
          useValue: authConfig,
        },
      ],
    };

    TestBed.configureTestingModule(moduleSetup);
    authState = TestBed.inject(AuthState);
  });

  afterEach(() => {});

  describe('constructor', () => {
    it('should be created', () => {
      const service = createService();
      expect(service).toBeTruthy();
    });

    it('should not call handleRedirectCallback on init, when code and state are not present on the URL', () => {
      createService();
      expect(auth0Client.handleRedirectCallback).not.toHaveBeenCalled();
    });

    it('should call checkSession', () => {
      createService();
      expect(auth0Client.checkSession).toHaveBeenCalled();
    });

    it('should set isLoading$ in the correct sequence', async () => {
      const service = createService();
      const values = await firstValueFrom(
        service.isLoading$.pipe(bufferCount(2))
      );
      expect(values).toEqual([true, false]);
    });

    it('should not set isLoading when service destroyed before checkSession finished', async () => {
      (auth0Client.checkSession as unknown as MockInstance).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 5000))
      );
      const localService = createService();
      const pending = firstValueFrom(
        localService.isLoading$.pipe(bufferTime(500))
      );
      localService.ngOnDestroy();
      const loading = await pending;
      expect(loading.length).toEqual(1);
      expect(loading).toEqual([true]);
    });
  });

  describe('The `isAuthenticated` observable', () => {
    it('should return `false` when the client is not authenticated', async () => {
      const service = createService();
      const value = await firstValueFrom(service.isAuthenticated$);
      expect(value).toBe(false);
    });

    it('should return `true` when the client is authenticated', async () => {
      (
        auth0Client.isAuthenticated as unknown as MockInstance
      ).mockResolvedValue(true);
      const service = createService();
      await firstValueFrom(loaded(service));
      const value = await firstValueFrom(service.isAuthenticated$);
      expect(value).toBe(true);
    });

    it('should return true after successfully getting a new token', async () => {
      (
        auth0Client.isAuthenticated as unknown as MockInstance
      ).mockResolvedValue(false);

      const service = createService();
      const pending = firstValueFrom(
        service.isAuthenticated$.pipe(bufferCount(2))
      );

      // Add a small delay before triggering a new emit to the isAuthenticated$.
      // This ensures we can capture both emits using the above bufferCount(2)
      setTimeout(() => {
        (
          auth0Client.getTokenSilently as unknown as MockInstance
        ).mockResolvedValue({});
        (
          auth0Client.isAuthenticated as unknown as MockInstance
        ).mockResolvedValue(true);

        service.getAccessTokenSilently().subscribe();
      }, 0);

      const values = await pending;
      expect(values[0]).toBe(false);
      expect(values[1]).toBe(true);
    });

    it('should still return true when the token is expired', async () => {
      authState.setIsLoading(false);
      (
        auth0Client.isAuthenticated as unknown as MockInstance
      ).mockResolvedValue(true);

      const service = createService();

      const value1 = await firstValueFrom(service.isAuthenticated$);
      expect(value1).toBe(true);

      // When the token is expired, auth0Client.isAuthenticated is resolving to false.
      // This is unexpected but known behavior in Auth0-SPA-JS, so we shouldnt rely on it apart from initially.
      // Once this is resolved, we should be able to rely on `auth0Client.isAuthenticated`, even when the Access Token is expired.
      (
        auth0Client.isAuthenticated as unknown as MockInstance
      ).mockResolvedValue(false);

      // shareReplay(1) returns the cached value; the service does not re-query isAuthenticated
      const value2 = await firstValueFrom(service.isAuthenticated$);
      expect(value2).toBe(true);
    });
  });

  describe('The `user` observable', () => {
    it('should get the user if authenticated', async () => {
      const user = {
        name: 'Test User',
      };

      (
        auth0Client.isAuthenticated as unknown as MockInstance
      ).mockResolvedValue(true);
      (auth0Client.getUser as unknown as MockInstance).mockResolvedValue(user);

      const service = createService();
      const value = await firstValueFrom(service.user$);
      expect(value).toBe(user);
    });

    it('should update the user after successfully getting a new token', async () => {
      const user = { name: 'Test User' };
      const user2 = { name: 'Another User' };

      (
        auth0Client.isAuthenticated as unknown as MockInstance
      ).mockResolvedValue(true);
      (auth0Client.getUser as unknown as MockInstance).mockResolvedValue(user);

      const service = createService();
      const pending = firstValueFrom(service.user$.pipe(bufferCount(2)));

      // Add a small delay before triggering a new emit to the user$.
      // This ensures we can capture both emits using the above bufferCount(2)
      setTimeout(() => {
        (
          auth0Client.getTokenSilently as unknown as MockInstance
        ).mockResolvedValue({});
        (auth0Client.getUser as unknown as MockInstance).mockResolvedValue(
          user2
        );
        service.getAccessTokenSilently().subscribe();
      }, 0);

      const values = await pending;
      expect(values[0]).toBe(user);
      expect(values[1]).toBe(user2);
    });

    it('should return null when logged out', async () => {
      const user = { name: 'Test User' };

      (
        auth0Client.isAuthenticated as unknown as MockInstance
      ).mockResolvedValue(true);
      (auth0Client.getUser as unknown as MockInstance).mockResolvedValue(user);

      const service = createService();
      const pending = firstValueFrom(service.user$.pipe(bufferCount(2)));

      service.isAuthenticated$.pipe(filter(Boolean)).subscribe(() => {
        (
          auth0Client.isAuthenticated as unknown as MockInstance
        ).mockResolvedValue(false);
        service.logout({ openUrl: false });
      });

      const values = await pending;
      expect(values[0]).toBe(user);
      expect(values[1]).toBe(null);
    });

    it('should not emit when state is updated that doesnt change the user', async () => {
      const user = { name: 'Test User' };

      (
        auth0Client.isAuthenticated as unknown as MockInstance
      ).mockResolvedValue(true);
      (
        auth0Client.getTokenSilently as unknown as MockInstance
      ).mockResolvedValue('AT1');
      (auth0Client.getUser as unknown as MockInstance).mockResolvedValue(user);

      let userEmissions = 0;
      const service = createService();
      service.user$.subscribe(() => userEmissions++);

      await firstValueFrom(
        service.getAccessTokenSilently().pipe(
          tap(() =>
            (
              auth0Client.getTokenSilently as unknown as MockInstance
            ).mockResolvedValue('AT2')
          ),
          mergeMap(() => service.getAccessTokenSilently()),
          tap(() =>
            (
              auth0Client.getTokenSilently as unknown as MockInstance
            ).mockResolvedValue('AT3')
          ),
          mergeMap(() => service.getAccessTokenSilently()),
          // Allow user emissions to come through
          delay(0)
        )
      );
      expect(userEmissions).toBe(1);
    });
  });

  describe('The `idTokenClaims` observable', () => {
    it('should get the ID token claims if authenticated', async () => {
      const claims: IdToken = {
        __raw: 'idToken',
        exp: 1602887231,
        iat: 1602883631,
        iss: 'https://example.eu.auth0.com/',
      };

      (
        auth0Client.isAuthenticated as unknown as MockInstance
      ).mockResolvedValue(true);
      (
        auth0Client.getIdTokenClaims as unknown as MockInstance
      ).mockResolvedValue(claims);
      const service = createService();

      const value = await firstValueFrom(service.idTokenClaims$);
      expect(value).toBe(claims);
    });

    it('should update the ID token claims if a new token is requested', async () => {
      const claims: IdToken = {
        __raw: 'idToken',
        exp: 1602887231,
        iat: 1602883631,
        iss: 'https://example.eu.auth0.com/',
      };

      const claims2: IdToken = {
        __raw: 'another_idToken',
        exp: 1613108744,
        iat: 1613105547,
        iss: 'https://example.eu.auth0.com/',
      };

      (
        auth0Client.isAuthenticated as unknown as MockInstance
      ).mockResolvedValue(true);
      (
        auth0Client.getIdTokenClaims as unknown as MockInstance
      ).mockResolvedValue(claims);

      const service = createService();
      const pending = firstValueFrom(
        service.idTokenClaims$.pipe(bufferCount(2))
      );

      // Add a small delay before triggering a new emit to the idTokenClaims$.
      // This ensures we can capture both emits using the above bufferCount(2)
      setTimeout(() => {
        (
          auth0Client.getTokenSilently as unknown as MockInstance
        ).mockResolvedValue({});
        (
          auth0Client.getIdTokenClaims as unknown as MockInstance
        ).mockResolvedValue(claims2);
        service.getAccessTokenSilently().subscribe();
      }, 0);

      const values = await pending;
      expect(values[0]).toBe(claims);
      expect(values[1]).toBe(claims2);
    });

    it('should return null when logged out', async () => {
      const claims: IdToken = {
        __raw: 'idToken',
        exp: 1602887231,
        iat: 1602883631,
        iss: 'https://example.eu.auth0.com/',
      };

      (
        auth0Client.isAuthenticated as unknown as MockInstance
      ).mockResolvedValue(true);
      (
        auth0Client.getIdTokenClaims as unknown as MockInstance
      ).mockResolvedValue(claims);

      const service = createService();
      const pending = firstValueFrom(
        service.idTokenClaims$.pipe(bufferCount(2))
      );

      service.isAuthenticated$.pipe(filter(Boolean)).subscribe(() => {
        (
          auth0Client.isAuthenticated as unknown as MockInstance
        ).mockResolvedValue(false);
        service.logout({ openUrl: false });
      });

      const values = await pending;
      expect(values[0]).toBe(claims);
      expect(values[1]).toBe(null);
    });
  });

  describe('when handling the redirect callback', () => {
    let navigator: AbstractNavigator;

    beforeEach(() => {
      TestBed.resetTestingModule();

      navigator = {
        navigateByUrl: vi.fn().mockResolvedValue(true),
      } as any;

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
            provide: AuthConfigService,
            useValue: authConfig,
          },
        ],
      });

      window.history.replaceState(null, '', '?code=123&state=456');
    });

    it('should handle the callback when code and state are available', async () => {
      mockWindow.location.search = '?code=123&state=456';
      const localService = createService();
      await firstValueFrom(loaded(localService));
      expect(auth0Client.handleRedirectCallback).toHaveBeenCalledTimes(1);
    });

    it('should handle the callback when connect_code and state are available', async () => {
      mockWindow.location.search = '?connect_code=123&state=456';
      const localService = createService();
      await firstValueFrom(loaded(localService));
      expect(auth0Client.handleRedirectCallback).toHaveBeenCalledTimes(1);
    });

    it('should not handle the callback when skipRedirectCallback is true', async () => {
      mockWindow.location.search = '?code=123&state=456';
      authConfig.skipRedirectCallback = true;
      const localService = createService();
      await firstValueFrom(loaded(localService));
      expect(auth0Client.handleRedirectCallback).not.toHaveBeenCalled();
    });

    it('should redirect to the correct route', async () => {
      const localService = createService();
      await firstValueFrom(loaded(localService));
      expect(navigator.navigateByUrl).toHaveBeenCalledWith('/');
    });

    it('should redirect to the route specified in appState', async () => {
      (
        auth0Client.handleRedirectCallback as unknown as MockInstance
      ).mockResolvedValue({
        appState: { target: '/test-route' },
      });
      const localService = createService();
      await firstValueFrom(loaded(localService));
      expect(navigator.navigateByUrl).toHaveBeenCalledWith('/test-route');
    });

    it('should fallback to `/` when missing appState', async () => {
      (
        auth0Client.handleRedirectCallback as unknown as MockInstance
      ).mockResolvedValue({});
      const localService = createService();
      await firstValueFrom(loaded(localService));
      expect(navigator.navigateByUrl).toHaveBeenCalledWith('/');
    });

    it('should fallback to `/` when handleRedirectCallback returns undefined', async () => {
      (
        auth0Client.handleRedirectCallback as unknown as MockInstance
      ).mockResolvedValue(undefined);
      const localService = createService();
      await firstValueFrom(loaded(localService));
      expect(navigator.navigateByUrl).toHaveBeenCalledWith('/');
    });

    it('should record the appState in the appState$ observable if it is present', async () => {
      const appState = { myValue: 'State to Preserve' };
      (
        auth0Client.handleRedirectCallback as unknown as MockInstance
      ).mockResolvedValue({ appState });
      const localService = createService();
      const recievedState = await firstValueFrom(localService.appState$);
      expect(recievedState).toEqual(appState);
    });

    it('should record errors in the error$ observable', async () => {
      const errorObj = new Error('An error has occured');
      (
        auth0Client.handleRedirectCallback as unknown as MockInstance
      ).mockImplementation(() => {
        throw errorObj;
      });
      const localService = createService();
      await firstValueFrom(loaded(localService));
      const err = await firstValueFrom(localService.error$);
      expect(err).toBe(errorObj);
      expect(navigator.navigateByUrl).toHaveBeenCalledWith('/');
    });

    it('should redirect to errorPath when an error occured in handleRedirectCallback', async () => {
      const errorObj = new Error('An error has occured');
      authConfig.errorPath = '/error';
      (
        auth0Client.handleRedirectCallback as unknown as MockInstance
      ).mockImplementation(() => {
        throw errorObj;
      });
      const localService = createService();
      await firstValueFrom(loaded(localService));
      expect(navigator.navigateByUrl).toHaveBeenCalledWith('/error');
    });

    it('should process the callback when an error appears in the query string', async () => {
      window.history.replaceState(
        null,
        '',
        `?error=${encodeURIComponent('This is an error')}&state=456`
      );
      const localService = createService();
      await firstValueFrom(loaded(localService));
      expect(auth0Client.handleRedirectCallback).toHaveBeenCalled();
    });

    it('should not process the callback when query string is a sub string', async () => {
      window.history.replaceState(null, '', '?abccode=123&xyzstate=456');
      const localService = createService();
      await firstValueFrom(loaded(localService));
      expect(auth0Client.handleRedirectCallback).not.toHaveBeenCalled();
    });
  });

  it('should call `loginWithRedirect`', async () => {
    const service = createService();
    await service.loginWithRedirect().toPromise();
    expect(auth0Client.loginWithRedirect).toHaveBeenCalled();
  });

  it('should call `loginWithRedirect` and pass options', async () => {
    const options = {
      authorizationParams: { redirect_uri: 'http://localhost:3001' },
    };

    const service = createService();
    await service.loginWithRedirect(options).toPromise();
    expect(auth0Client.loginWithRedirect).toHaveBeenCalledWith(options);
  });

  it('should call `connectAccountWithRedirect`', async () => {
    const service = createService();
    const options = { connection: 'google-oauth2' };
    await service.connectAccountWithRedirect(options).toPromise();
    expect(auth0Client.connectAccountWithRedirect).toHaveBeenCalledWith(
      options
    );
  });

  it('should call `connectAccountWithRedirect` and pass all options', async () => {
    const options = {
      connection: 'github',
      scopes: ['openid', 'profile', 'email'],
      authorization_params: { audience: 'https://api.github.com' },
      redirectUri: 'http://localhost:3000/callback',
      appState: { returnTo: '/profile' },
    };

    const service = createService();
    await service.connectAccountWithRedirect(options).toPromise();
    expect(auth0Client.connectAccountWithRedirect).toHaveBeenCalledWith(
      options
    );
  });

  it('should call `loginWithPopup`', async () => {
    const service = createService();
    await firstValueFrom(loaded(service));
    (auth0Client.isAuthenticated as unknown as MockInstance).mockReset();
    (auth0Client.isAuthenticated as unknown as MockInstance).mockResolvedValue(
      true
    );
    service.loginWithPopup();
    await firstValueFrom(service.isAuthenticated$.pipe(filter(Boolean)));
    expect(auth0Client.loginWithPopup).toHaveBeenCalled();
    expect(auth0Client.isAuthenticated).toHaveBeenCalled();
  });

  it('should call `loginWithPopup` with options', async () => {
    // These objects are empty, as we just want to check that the
    // same object reference was passed through than any specific options.
    const options = {};
    const config = {};
    const service = createService();
    await firstValueFrom(loaded(service));
    (auth0Client.isAuthenticated as unknown as MockInstance).mockReset();
    (auth0Client.isAuthenticated as unknown as MockInstance).mockResolvedValue(
      true
    );
    service.loginWithPopup(options, config);
    await firstValueFrom(service.isAuthenticated$.pipe(filter(Boolean)));
    expect(auth0Client.loginWithPopup).toHaveBeenCalledWith(options, config);
  });

  it('should call `logout`', () => {
    const service = createService();
    service.logout();
    expect(auth0Client.logout).toHaveBeenCalled();
  });

  it('should call `logout` with options', () => {
    const options = { logoutParams: { returnTo: 'http://localhost' } };
    const service = createService();
    service.logout(options);
    expect(auth0Client.logout).toHaveBeenCalledWith(options);
  });

  it('should reset the authentication state when passing `localOnly` to logout', async () => {
    const options = {
      openUrl: async () => {
        (
          auth0Client.isAuthenticated as unknown as MockInstance
        ).mockResolvedValue(false);
      },
    };

    (auth0Client.isAuthenticated as unknown as MockInstance).mockResolvedValue(
      true
    );

    const service = createService();
    await firstValueFrom(loaded(service));

    const pending = firstValueFrom(
      service.isAuthenticated$.pipe(bufferCount(2))
    );
    service.logout(options);
    const values = await pending;
    expect(values[0]).toBe(true);
    expect(values[1]).toBe(false);
  });

  describe('Online Access (Online Refresh Tokens)', () => {
    it('clears isAuthenticated$ and user$ after logout with an Online Refresh Token', async () => {
      authConfig.useRefreshTokens = true;
      authConfig.refreshTokenMode = RefreshTokenMode.Online;
      authConfig.useDpop = true;

      const user = { name: 'Test User' };

      (
        auth0Client.isAuthenticated as unknown as MockInstance
      ).mockResolvedValue(true);
      (auth0Client.getUser as unknown as MockInstance).mockResolvedValue(user);

      const service = createService();

      const userPending = firstValueFrom(service.user$.pipe(bufferCount(2)));
      const authPending = firstValueFrom(
        service.isAuthenticated$.pipe(bufferCount(2))
      );

      service.isAuthenticated$.pipe(filter(Boolean)).subscribe(() => {
        // Revoking the Online Refresh Token terminates the Auth0 session
        // server-side, so the underlying SDK reflects no user going forward.
        (
          auth0Client.isAuthenticated as unknown as MockInstance
        ).mockResolvedValue(false);
        (auth0Client.getUser as unknown as MockInstance).mockResolvedValue(
          undefined
        );
        service.logout({ openUrl: false });
      });

      const userValues = await userPending;
      expect(userValues[0]).toBe(user);
      expect(userValues[1]).toBe(null);

      const authValues = await authPending;
      expect(authValues[0]).toBe(true);
      expect(authValues[1]).toBe(false);
    });
  });

  describe('getAccessTokenSilently', () => {
    it('should call the underlying SDK', async () => {
      const service = createService();
      await firstValueFrom(service.getAccessTokenSilently());
      expect(auth0Client.getTokenSilently).toHaveBeenCalled();
    });

    it('should call the underlying SDK and pass along the options', async () => {
      // Empty object here just to test the object reference
      const options = {};
      const service = createService();
      await firstValueFrom(service.getAccessTokenSilently(options));
      expect(auth0Client.getTokenSilently).toHaveBeenCalledWith(options);
    });

    it('should get the full token response when detailedResponse is true', async () => {
      const tokenResponse = {
        access_token: '123',
        id_token: '456',
        expires_in: 2,
      };
      (
        auth0Client.getTokenSilently as unknown as MockInstance
      ).mockResolvedValue(tokenResponse);

      const service = createService();
      const token = await firstValueFrom(
        service.getAccessTokenSilently({ detailedResponse: true })
      );
      expect(token).toEqual(tokenResponse);
    });

    it('should null when nothing in cache', async () => {
      (
        auth0Client.getTokenSilently as unknown as MockInstance
      ).mockResolvedValue(null);

      const service = createService();
      const token = await firstValueFrom(service.getAccessTokenSilently());
      expect(token).toBeNull();
    });

    it('should record errors in the error$ observable', async () => {
      const errorObj = new Error('An error has occured');
      (
        auth0Client.getTokenSilently as unknown as MockInstance
      ).mockRejectedValue(errorObj);
      const service = createService();
      service.getAccessTokenSilently().subscribe({ error: () => {} });
      const err = await firstValueFrom(service.error$);
      expect(err).toBe(errorObj);
    });

    it('should bubble errors', async () => {
      const errorObj = new Error('An error has occured');
      (
        auth0Client.getTokenSilently as unknown as MockInstance
      ).mockRejectedValue(errorObj);
      const service = createService();
      await expect(
        firstValueFrom(service.getAccessTokenSilently())
      ).rejects.toBe(errorObj);
    });
  });

  describe('getAccessTokenWithPopup', () => {
    it('should call the underlying SDK', async () => {
      const service = createService();
      await firstValueFrom(service.getAccessTokenWithPopup());
      expect(auth0Client.getTokenWithPopup).toHaveBeenCalled();
    });

    it('should call the underlying SDK and pass along the options', async () => {
      // Empty object just to test reference
      const options = {};
      const service = createService();
      await firstValueFrom(service.getAccessTokenWithPopup(options));
      expect(auth0Client.getTokenWithPopup).toHaveBeenCalledWith(options);
    });

    it('should record errors in the error$ observable', async () => {
      const errorObj = new Error('An error has occured');
      (
        auth0Client.getTokenWithPopup as unknown as MockInstance
      ).mockRejectedValue(errorObj);
      const service = createService();
      service.getAccessTokenWithPopup().subscribe({ error: () => {} });
      const err = await firstValueFrom(service.error$);
      expect(err).toBe(errorObj);
    });

    it('should bubble errors', async () => {
      const errorObj = new Error('An error has occured');
      (
        auth0Client.getTokenWithPopup as unknown as MockInstance
      ).mockRejectedValue(errorObj);
      const service = createService();
      await expect(
        firstValueFrom(service.getAccessTokenWithPopup())
      ).rejects.toBe(errorObj);
    });
  });

  describe('loginWithCustomTokenExchange', () => {
    it('should call the underlying SDK', async () => {
      const service = createService();
      const options = {
        subject_token: '__test_token__',
        subject_token_type: 'urn:test:token-type',
      };
      await firstValueFrom(service.loginWithCustomTokenExchange(options));
      expect(auth0Client.loginWithCustomTokenExchange).toHaveBeenCalledWith(
        options
      );
    });

    it('should return the token response', async () => {
      const service = createService();
      const options = {
        subject_token: '__test_token__',
        subject_token_type: 'urn:test:token-type',
        scope: 'openid profile email',
      };
      const tokenResponse = await firstValueFrom(
        service.loginWithCustomTokenExchange(options)
      );
      expect(tokenResponse).toEqual({
        access_token: '__exchanged_access_token__',
        id_token: '__exchanged_id_token__',
        token_type: 'Bearer',
        expires_in: 86400,
      });
    });

    it('should update auth state after successful token exchange', async () => {
      const service = createService();
      const options = {
        subject_token: '__test_token__',
        subject_token_type: 'urn:test:token-type',
      };
      vi.spyOn(authState, 'setAccessToken');
      await firstValueFrom(service.loginWithCustomTokenExchange(options));
      expect(authState.setAccessToken).toHaveBeenCalledWith(
        '__exchanged_access_token__'
      );
    });

    it('should record errors in the error$ observable', async () => {
      const errorObj = new Error('Token exchange failed');
      (
        auth0Client.loginWithCustomTokenExchange as unknown as MockInstance
      ).mockRejectedValue(errorObj);
      const service = createService();
      service
        .loginWithCustomTokenExchange({
          subject_token: '__test_token__',
          subject_token_type: 'urn:test:token-type',
        })
        .subscribe({ error: () => {} });
      const err = await firstValueFrom(service.error$);
      expect(err).toBe(errorObj);
    });

    it('should bubble errors', async () => {
      const errorObj = new Error('Token exchange failed');
      (
        auth0Client.loginWithCustomTokenExchange as unknown as MockInstance
      ).mockRejectedValue(errorObj);
      const service = createService();
      await expect(
        firstValueFrom(
          service.loginWithCustomTokenExchange({
            subject_token: '__test_token__',
            subject_token_type: 'urn:test:token-type',
          })
        )
      ).rejects.toBe(errorObj);
    });
  });

  describe('handleRedirectCallback', () => {
    let navigator: AbstractNavigator;

    beforeEach(() => {
      TestBed.resetTestingModule();

      navigator = {
        navigateByUrl: vi.fn().mockResolvedValue(true),
      } as any;

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
            provide: AuthConfigService,
            useValue: {
              ...authConfig,
              skipRedirectCallback: true,
            },
          },
        ],
      });

      window.history.replaceState(null, '', '');
    });

    it('should call the underlying SDK', async () => {
      const localService = createService();
      await firstValueFrom(localService.handleRedirectCallback());
      expect(auth0Client.handleRedirectCallback).toHaveBeenCalled();
    });

    it('should call the underlying SDK and pass options', async () => {
      const url = 'http://localhost';
      const localService = createService();
      await firstValueFrom(localService.handleRedirectCallback(url));
      expect(auth0Client.handleRedirectCallback).toHaveBeenCalledWith(url);
    });

    it('should refresh the internal state', async () => {
      const localService = createService();
      const pending = firstValueFrom(
        localService.isAuthenticated$.pipe(bufferCount(2))
      );

      localService.isLoading$
        .pipe(
          filter((isLoading) => !isLoading),
          tap(() =>
            (
              auth0Client.isAuthenticated as unknown as MockInstance
            ).mockResolvedValue(true)
          ),
          mergeMap(() => localService.handleRedirectCallback())
        )
        .subscribe();

      const authenticatedStates = await pending;
      expect(authenticatedStates).toEqual([false, true]);
      expect(auth0Client.isAuthenticated).toHaveBeenCalled();
    });

    it('should record the appState in the appState$ observable if it is present', async () => {
      const appState = { myValue: 'State to Preserve' };
      (
        auth0Client.handleRedirectCallback as unknown as MockInstance
      ).mockResolvedValue({ appState });
      const localService = createService();
      await firstValueFrom(localService.handleRedirectCallback());
      const recievedState = await firstValueFrom(localService.appState$);
      expect(recievedState).toEqual(appState);
    });

    it('should preserve appState as-is for regular login', async () => {
      const appState = { myValue: 'State to Preserve' };
      (
        auth0Client.handleRedirectCallback as unknown as MockInstance
      ).mockResolvedValue({ appState, response_type: ResponseType.Code });
      const localService = createService();
      await firstValueFrom(localService.handleRedirectCallback());
      const receivedState = await firstValueFrom(localService.appState$);
      expect(receivedState).toEqual(appState);
    });

    it('should extract connected account data when response_type is ConnectCode', async () => {
      const appState = { myValue: 'State to Preserve' };
      const connectedAccount = {
        id: 'abc123',
        connection: 'google-oauth2',
        access_type: 'offline' as ConnectAccountRedirectResult['access_type'],
        created_at: '2024-01-01T00:00:00.000Z',
        expires_at: '2024-01-02T00:00:00.000Z',
      };
      (
        auth0Client.handleRedirectCallback as unknown as MockInstance
      ).mockResolvedValue({
        appState,
        response_type: ResponseType.ConnectCode,
        ...connectedAccount,
      });
      const localService = createService();
      await firstValueFrom(localService.handleRedirectCallback());
      const receivedState = await firstValueFrom(localService.appState$);
      expect(receivedState).toEqual({
        ...appState,
        response_type: ResponseType.ConnectCode,
        connectedAccount,
      });
    });

    it('should handle connected account redirect without initial appState', async () => {
      const connectedAccount = {
        id: 'xyz789',
        connection: 'github',
        access_type: 'offline' as ConnectAccountRedirectResult['access_type'],
        created_at: '2024-02-01T00:00:00.000Z',
        expires_at: '2024-02-02T00:00:00.000Z',
      };
      (
        auth0Client.handleRedirectCallback as unknown as MockInstance
      ).mockResolvedValue({
        response_type: ResponseType.ConnectCode,
        ...connectedAccount,
      });
      const localService = createService();
      await firstValueFrom(localService.handleRedirectCallback());
      const receivedState = await firstValueFrom(localService.appState$);
      expect(receivedState.response_type).toBe(ResponseType.ConnectCode);
      expect(receivedState.connectedAccount).toEqual(connectedAccount);
    });
  });

  describe('getDpopNonce', () => {
    it('should retrieve DPoP nonce from the client', async () => {
      const service = createService();
      const nonce = await firstValueFrom(service.getDpopNonce());
      expect(nonce).toBe('test-nonce-value');
      expect(auth0Client.getDpopNonce).toHaveBeenCalled();
    });

    it('should pass domain identifier to the underlying SDK', async () => {
      const domainId = 'custom-domain';
      const service = createService();
      await firstValueFrom(service.getDpopNonce(domainId));
      expect(auth0Client.getDpopNonce).toHaveBeenCalledWith(domainId);
    });

    it('should handle undefined nonce', async () => {
      (auth0Client.getDpopNonce as Mock).mockResolvedValue(undefined);
      const service = createService();
      const nonce = await firstValueFrom(service.getDpopNonce());
      expect(nonce).toBeUndefined();
    });
  });

  describe('setDpopNonce', () => {
    it('should set DPoP nonce through the client', async () => {
      const service = createService();
      const nonceValue = 'new-nonce-123';
      await firstValueFrom(service.setDpopNonce(nonceValue));
      expect(auth0Client.setDpopNonce).toHaveBeenCalledWith(
        nonceValue,
        undefined
      );
    });

    it('should pass nonce and domain identifier to the underlying SDK', async () => {
      const service = createService();
      const nonceValue = 'nonce-456';
      const domainId = 'domain-1';
      await firstValueFrom(service.setDpopNonce(nonceValue, domainId));
      expect(auth0Client.setDpopNonce).toHaveBeenCalledWith(
        nonceValue,
        domainId
      );
    });
  });

  describe('generateDpopProof', () => {
    it('should generate DPoP proof JWT', async () => {
      const service = createService();
      const params = {
        url: 'https://api.example.com/resource',
        method: 'POST',
        accessToken: 'access-token-123',
      };
      const proof = await firstValueFrom(service.generateDpopProof(params));
      expect(proof).toBe('test-proof-jwt');
      expect(auth0Client.generateDpopProof).toHaveBeenCalledWith(params);
    });

    it('should pass all parameters including nonce', async () => {
      const service = createService();
      const params = {
        url: 'https://api.example.com/data',
        method: 'GET',
        nonce: 'server-nonce',
        accessToken: 'token-xyz',
      };
      await firstValueFrom(service.generateDpopProof(params));
      expect(auth0Client.generateDpopProof).toHaveBeenCalledWith(params);
    });
  });

  describe('createFetcher', () => {
    it('should create a fetcher instance', () => {
      const service = createService();
      const fetcher = service.createFetcher();
      expect(fetcher).toBeDefined();
      expect(auth0Client.createFetcher).toHaveBeenCalled();
    });

    it('should pass configuration to the underlying SDK', () => {
      const service = createService();
      const config = {
        baseUrl: 'https://api.example.com',
      };
      service.createFetcher(config);
      expect(auth0Client.createFetcher).toHaveBeenCalledWith(config);
    });
  });

  describe('mfa', () => {
    describe('getAuthenticators', () => {
      it('should call the underlying SDK', async () => {
        const service = createService();
        const mfaToken = '__mfa_token__';
        await firstValueFrom(service.mfa.getAuthenticators(mfaToken));
        expect(auth0Client.mfa.getAuthenticators).toHaveBeenCalledWith(
          mfaToken
        );
      });

      it('should return the list of authenticators', async () => {
        const service = createService();
        const result = await firstValueFrom(
          service.mfa.getAuthenticators('__mfa_token__')
        );
        expect(result).toEqual([
          { id: 'auth-1', authenticatorType: 'otp', active: true },
        ]);
      });

      it('should bubble errors', async () => {
        const errorObj = new Error('getAuthenticators failed');
        (
          auth0Client.mfa.getAuthenticators as unknown as MockInstance
        ).mockRejectedValue(errorObj);
        const service = createService();
        await expect(
          firstValueFrom(service.mfa.getAuthenticators('__mfa_token__'))
        ).rejects.toBe(errorObj);
      });
    });

    describe('enroll', () => {
      it('should call the underlying SDK', async () => {
        const service = createService();
        const params = {
          mfaToken: '__mfa_token__',
          factorType: 'otp' as const,
        };
        await firstValueFrom(service.mfa.enroll(params));
        expect(auth0Client.mfa.enroll).toHaveBeenCalledWith(params);
      });

      it('should return the enrollment response', async () => {
        const service = createService();
        const result = await firstValueFrom(
          service.mfa.enroll({ mfaToken: '__mfa_token__', factorType: 'otp' })
        );
        expect(result).toEqual({
          authenticatorType: 'otp',
          secret: '__totp_secret__',
          barcodeUri: '__barcode_uri__',
        });
      });

      it('should bubble errors', async () => {
        const errorObj = new Error('enroll failed');
        (auth0Client.mfa.enroll as unknown as MockInstance).mockRejectedValue(
          errorObj
        );
        const service = createService();
        await expect(
          firstValueFrom(
            service.mfa.enroll({ mfaToken: '__mfa_token__', factorType: 'otp' })
          )
        ).rejects.toBe(errorObj);
      });
    });

    describe('challenge', () => {
      it('should call the underlying SDK', async () => {
        const service = createService();
        const params = {
          mfaToken: '__mfa_token__',
          challengeType: 'otp' as const,
        };
        await firstValueFrom(service.mfa.challenge(params));
        expect(auth0Client.mfa.challenge).toHaveBeenCalledWith(params);
      });

      it('should return the challenge response', async () => {
        const service = createService();
        const result = await firstValueFrom(
          service.mfa.challenge({
            mfaToken: '__mfa_token__',
            challengeType: 'otp',
          })
        );
        expect(result).toEqual({ challengeType: 'otp' });
      });

      it('should bubble errors', async () => {
        const errorObj = new Error('challenge failed');
        (
          auth0Client.mfa.challenge as unknown as MockInstance
        ).mockRejectedValue(errorObj);
        const service = createService();
        await expect(
          firstValueFrom(
            service.mfa.challenge({
              mfaToken: '__mfa_token__',
              challengeType: 'otp',
            })
          )
        ).rejects.toBe(errorObj);
      });
    });

    describe('getEnrollmentFactors', () => {
      it('should call the underlying SDK', async () => {
        const service = createService();
        const mfaToken = '__mfa_token__';
        await firstValueFrom(service.mfa.getEnrollmentFactors(mfaToken));
        expect(auth0Client.mfa.getEnrollmentFactors).toHaveBeenCalledWith(
          mfaToken
        );
      });

      it('should return the enrollment factors', async () => {
        const service = createService();
        const result = await firstValueFrom(
          service.mfa.getEnrollmentFactors('__mfa_token__')
        );
        expect(result).toEqual([{ type: 'otp' }]);
      });

      it('should bubble errors', async () => {
        const errorObj = new Error('getEnrollmentFactors failed');
        (
          auth0Client.mfa.getEnrollmentFactors as unknown as MockInstance
        ).mockRejectedValue(errorObj);
        const service = createService();
        await expect(
          firstValueFrom(service.mfa.getEnrollmentFactors('__mfa_token__'))
        ).rejects.toBe(errorObj);
      });
    });

    describe('verify', () => {
      it('should call the underlying SDK', async () => {
        const service = createService();
        const params = { mfaToken: '__mfa_token__', otp: '123456' };
        await firstValueFrom(service.mfa.verify(params));
        expect(auth0Client.mfa.verify).toHaveBeenCalledWith(params);
      });

      it('should return the token response', async () => {
        const service = createService();
        const result = await firstValueFrom(
          service.mfa.verify({ mfaToken: '__mfa_token__', otp: '123456' })
        );
        expect(result).toEqual({
          access_token: '__mfa_access_token__',
          id_token: '__mfa_id_token__',
          token_type: 'Bearer',
          expires_in: 86400,
        });
      });

      it('should bubble errors', async () => {
        const errorObj = new Error('verify failed');
        (auth0Client.mfa.verify as unknown as MockInstance).mockRejectedValue(
          errorObj
        );
        const service = createService();
        await expect(
          firstValueFrom(
            service.mfa.verify({ mfaToken: '__mfa_token__', otp: '123456' })
          )
        ).rejects.toBe(errorObj);
      });

      it('should not update isAuthenticated$ or user$ after a successful verify', async () => {
        // verify() intentionally does not update Angular auth state — callers must
        // follow up with getAccessTokenSilently() to reflect the new MFA session.
        const service = createService();
        let isAuthEmissions = 0;
        let userEmissions = 0;

        service.isAuthenticated$.subscribe(() => isAuthEmissions++);
        service.user$.subscribe(() => userEmissions++);

        await firstValueFrom(
          loaded(service).pipe(
            mergeMap(() =>
              service.mfa.verify({ mfaToken: '__mfa_token__', otp: '123456' })
            ),
            delay(0)
          )
        );
        expect(isAuthEmissions).toBe(1);
        expect(userEmissions).toBe(1);
      });
    });
  });

  describe('passkey', () => {
    describe('signup', () => {
      it('should call the underlying SDK', async () => {
        const service = createService();
        const options = { email: 'user@example.com' };
        await firstValueFrom(service.passkey.signup(options));
        expect(auth0Client.passkey.signup).toHaveBeenCalledWith(options);
      });

      it('should return the token response', async () => {
        const service = createService();
        const result = await firstValueFrom(
          service.passkey.signup({ email: 'user@example.com' })
        );
        expect(result).toEqual({
          access_token: '__passkey_access_token__',
          id_token: '__passkey_id_token__',
          token_type: 'Bearer',
          expires_in: 86400,
        });
      });

      it('should set the access token after successful signup', async () => {
        const service = createService();
        vi.spyOn(authState, 'setAccessToken');
        await firstValueFrom(
          service.passkey.signup({ email: 'user@example.com' })
        );
        expect(authState.setAccessToken).toHaveBeenCalledWith(
          '__passkey_access_token__'
        );
      });

      it('should record errors in the error$ observable', async () => {
        const errorObj = new Error('WebAuthn not supported');
        (
          auth0Client.passkey.signup as unknown as MockInstance
        ).mockRejectedValue(errorObj);
        const service = createService();
        service.passkey
          .signup({ email: 'user@example.com' })
          .subscribe({ error: () => {} });
        const err = await firstValueFrom(service.error$);
        expect(err).toBe(errorObj);
      });

      it('should bubble errors', async () => {
        const errorObj = new Error('WebAuthn not supported');
        (
          auth0Client.passkey.signup as unknown as MockInstance
        ).mockRejectedValue(errorObj);
        const service = createService();
        await expect(
          firstValueFrom(service.passkey.signup({ email: 'user@example.com' }))
        ).rejects.toBe(errorObj);
      });
    });

    describe('login', () => {
      it('should call the underlying SDK', async () => {
        const service = createService();
        await firstValueFrom(service.passkey.login());
        expect(auth0Client.passkey.login).toHaveBeenCalledWith(undefined);
      });

      it('should forward options to the underlying SDK', async () => {
        const service = createService();
        const options = {
          realm: 'Username-Password-Authentication',
          scope: 'openid profile email',
        };
        await firstValueFrom(service.passkey.login(options));
        expect(auth0Client.passkey.login).toHaveBeenCalledWith(options);
      });

      it('should return the token response', async () => {
        const service = createService();
        const result = await firstValueFrom(service.passkey.login());
        expect(result).toEqual({
          access_token: '__passkey_access_token__',
          id_token: '__passkey_id_token__',
          token_type: 'Bearer',
          expires_in: 86400,
        });
      });

      it('should set the access token after successful login', async () => {
        const service = createService();
        vi.spyOn(authState, 'setAccessToken');
        await firstValueFrom(service.passkey.login());
        expect(authState.setAccessToken).toHaveBeenCalledWith(
          '__passkey_access_token__'
        );
      });

      it('should record errors in the error$ observable', async () => {
        const errorObj = new Error('User cancelled');
        (
          auth0Client.passkey.login as unknown as MockInstance
        ).mockRejectedValue(errorObj);
        const service = createService();
        service.passkey.login().subscribe({ error: () => {} });
        const err = await firstValueFrom(service.error$);
        expect(err).toBe(errorObj);
      });

      it('should bubble errors', async () => {
        const errorObj = new Error('User cancelled');
        (
          auth0Client.passkey.login as unknown as MockInstance
        ).mockRejectedValue(errorObj);
        const service = createService();
        await expect(firstValueFrom(service.passkey.login())).rejects.toBe(
          errorObj
        );
      });
    });
  });

  describe('myAccount', () => {
    describe('getFactors', () => {
      it('should call the underlying SDK', async () => {
        const service = createService();
        await firstValueFrom(service.myAccount.getFactors());
        expect(auth0Client.myAccount.getFactors).toHaveBeenCalled();
      });

      it('should return the factors list', async () => {
        const service = createService();
        const result = await firstValueFrom(service.myAccount.getFactors());
        expect(Array.isArray(result)).toBe(true);
      });

      it('should bubble errors', async () => {
        const errorObj = new Error('getFactors failed');
        (
          auth0Client.myAccount.getFactors as unknown as MockInstance
        ).mockRejectedValue(errorObj);
        const service = createService();
        await expect(
          firstValueFrom(service.myAccount.getFactors())
        ).rejects.toBe(errorObj);
      });
    });

    describe('getAuthenticationMethods', () => {
      it('should call the underlying SDK without a filter', async () => {
        const service = createService();
        await firstValueFrom(service.myAccount.getAuthenticationMethods());
        expect(
          auth0Client.myAccount.getAuthenticationMethods
        ).toHaveBeenCalledWith(undefined);
      });

      it('should forward the type filter to the underlying SDK', async () => {
        const service = createService();
        await firstValueFrom(
          service.myAccount.getAuthenticationMethods('passkey')
        );
        expect(
          auth0Client.myAccount.getAuthenticationMethods
        ).toHaveBeenCalledWith('passkey');
      });

      it('should return the list of authentication methods', async () => {
        const service = createService();
        const result = await firstValueFrom(
          service.myAccount.getAuthenticationMethods()
        );
        expect(Array.isArray(result)).toBe(true);
      });

      it('should bubble errors', async () => {
        const errorObj = new Error('getAuthenticationMethods failed');
        (
          auth0Client.myAccount
            .getAuthenticationMethods as unknown as MockInstance
        ).mockRejectedValue(errorObj);
        const service = createService();
        await expect(
          firstValueFrom(service.myAccount.getAuthenticationMethods())
        ).rejects.toBe(errorObj);
      });
    });

    describe('getAuthenticationMethod', () => {
      it('should call the underlying SDK with the id', async () => {
        const service = createService();
        await firstValueFrom(
          service.myAccount.getAuthenticationMethod('__method_id__')
        );
        expect(
          auth0Client.myAccount.getAuthenticationMethod
        ).toHaveBeenCalledWith('__method_id__');
      });

      it('should return the authentication method', async () => {
        const service = createService();
        const result = await firstValueFrom(
          service.myAccount.getAuthenticationMethod('__method_id__')
        );
        expect(result.id).toBe('__method_id__');
      });

      it('should bubble errors', async () => {
        const errorObj = new Error('getAuthenticationMethod failed');
        (
          auth0Client.myAccount
            .getAuthenticationMethod as unknown as MockInstance
        ).mockRejectedValue(errorObj);
        const service = createService();
        await expect(
          firstValueFrom(
            service.myAccount.getAuthenticationMethod('__method_id__')
          )
        ).rejects.toBe(errorObj);
      });
    });

    describe('deleteAuthenticationMethod', () => {
      it('should call the underlying SDK with the id', async () => {
        const service = createService();
        await firstValueFrom(
          service.myAccount.deleteAuthenticationMethod('__method_id__')
        );
        expect(
          auth0Client.myAccount.deleteAuthenticationMethod
        ).toHaveBeenCalledWith('__method_id__');
      });

      it('should complete without a value', async () => {
        const service = createService();
        const result = await firstValueFrom(
          service.myAccount.deleteAuthenticationMethod('__method_id__')
        );
        expect(result).toBeUndefined();
      });

      it('should bubble errors', async () => {
        const errorObj = new Error('deleteAuthenticationMethod failed');
        (
          auth0Client.myAccount
            .deleteAuthenticationMethod as unknown as MockInstance
        ).mockRejectedValue(errorObj);
        const service = createService();
        await expect(
          firstValueFrom(
            service.myAccount.deleteAuthenticationMethod('__method_id__')
          )
        ).rejects.toBe(errorObj);
      });
    });

    describe('updateAuthenticationMethod', () => {
      it('should call the underlying SDK with id and data', async () => {
        const service = createService();
        const data = { name: 'My Passkey' };
        await firstValueFrom(
          service.myAccount.updateAuthenticationMethod('__method_id__', data)
        );
        expect(
          auth0Client.myAccount.updateAuthenticationMethod
        ).toHaveBeenCalledWith('__method_id__', data);
      });

      it('should return the updated authentication method', async () => {
        const service = createService();
        const result = await firstValueFrom(
          service.myAccount.updateAuthenticationMethod('__method_id__', {
            name: 'My Passkey',
          })
        );
        expect(result.id).toBe('__method_id__');
      });

      it('should bubble errors', async () => {
        const errorObj = new Error('updateAuthenticationMethod failed');
        (
          auth0Client.myAccount
            .updateAuthenticationMethod as unknown as MockInstance
        ).mockRejectedValue(errorObj);
        const service = createService();
        await expect(
          firstValueFrom(
            service.myAccount.updateAuthenticationMethod('__method_id__', {
              name: 'My Passkey',
            })
          )
        ).rejects.toBe(errorObj);
      });
    });

    describe('enrollmentChallenge', () => {
      it('should call the underlying SDK with options', async () => {
        const service = createService();
        const options = { type: 'totp' as const };
        await firstValueFrom(service.myAccount.enrollmentChallenge(options));
        expect(auth0Client.myAccount.enrollmentChallenge).toHaveBeenCalledWith(
          options
        );
      });

      it('should return the challenge response', async () => {
        const service = createService();
        const result = await firstValueFrom(
          service.myAccount.enrollmentChallenge({ type: 'totp' })
        );
        expect(result.id).toBe('__challenge_id__');
        expect(result.auth_session).toBe('__auth_session__');
      });

      it('should bubble errors', async () => {
        const errorObj = new Error('enrollmentChallenge failed');
        (
          auth0Client.myAccount.enrollmentChallenge as unknown as MockInstance
        ).mockRejectedValue(errorObj);
        const service = createService();
        await expect(
          firstValueFrom(
            service.myAccount.enrollmentChallenge({ type: 'totp' })
          )
        ).rejects.toBe(errorObj);
      });
    });

    describe('enrollmentVerify', () => {
      it('should call the underlying SDK with options', async () => {
        const service = createService();
        const options = {
          type: 'totp' as const,
          location: 'https://example.auth0.com/enroll',
          auth_session: '__auth_session__',
          otp_code: '123456',
        };
        await firstValueFrom(service.myAccount.enrollmentVerify(options));
        expect(auth0Client.myAccount.enrollmentVerify).toHaveBeenCalledWith(
          options
        );
      });

      it('should return the created authentication method', async () => {
        const service = createService();
        const result = await firstValueFrom(
          service.myAccount.enrollmentVerify({
            type: 'totp',
            location: 'https://example.auth0.com/enroll',
            auth_session: '__auth_session__',
            otp_code: '123456',
          })
        );
        expect(result.id).toBe('__method_id__');
      });

      it('should bubble errors', async () => {
        const errorObj = new Error('enrollmentVerify failed');
        (
          auth0Client.myAccount.enrollmentVerify as unknown as MockInstance
        ).mockRejectedValue(errorObj);
        const service = createService();
        await expect(
          firstValueFrom(
            service.myAccount.enrollmentVerify({
              type: 'totp',
              location: 'https://example.auth0.com/enroll',
              auth_session: '__auth_session__',
              otp_code: '123456',
            })
          )
        ).rejects.toBe(errorObj);
      });
    });
  });
});
