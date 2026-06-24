import {
  RedirectLoginOptions as SPARedirectLoginOptions,
  LogoutOptions as SPALogoutOptions,
} from '@auth0/auth0-spa-js';
import type {
  Authenticator,
  EnrollParams,
  EnrollmentResponse,
  ChallengeAuthenticatorParams,
  ChallengeResponse,
  VerifyParams,
  EnrollmentFactor,
  TokenEndpointResponse,
  PasskeySignupOptions,
  PasskeyLoginOptions,
  AuthenticationMethod,
  AuthenticationMethodType,
  Factor,
  UpdateAuthenticationMethodRequest,
  EnrollmentChallengeOptions,
  EnrollmentChallengeResponse,
  EnrollmentVerifyOptions,
} from '@auth0/auth0-spa-js';
import { Observable } from 'rxjs';

export interface RedirectLoginOptions<TAppState>
  extends Omit<SPARedirectLoginOptions<TAppState>, 'onRedirect'> {}

export interface LogoutOptions extends Omit<SPALogoutOptions, 'onRedirect'> {}

/**
 * Observable-based MFA API client exposed by `AuthService.mfa`.
 *
 * This is the Angular counterpart of `MfaApiClient` from `@auth0/auth0-spa-js`.
 * All methods return `Observable` instead of `Promise`.
 */
export interface ObservableMfaApiClient {
  /**
   * Returns the list of enrolled MFA authenticators for the current user,
   * filtered by the challenge types stored in the MFA context.
   * @throws {MfaListAuthenticatorsError}
   */
  getAuthenticators(mfaToken: string): Observable<Authenticator[]>;

  /**
   * Enrolls a new MFA authenticator (OTP, SMS, Voice, Email, or Push).
   * @throws {MfaEnrollmentError}
   */
  enroll(params: EnrollParams): Observable<EnrollmentResponse>;

  /**
   * Initiates an MFA challenge, sending an OOB code via SMS, email, or push,
   * or preparing for OTP entry. Required for all factor types except OTP,
   * where it is optional.
   * @throws {MfaChallengeError}
   */
  challenge(
    params: ChallengeAuthenticatorParams
  ): Observable<ChallengeResponse>;

  /**
   * Returns the available enrollment factors from the stored MFA context.
   * A non-empty result means the user must enroll before they can authenticate.
   * @throws {MfaEnrollmentFactorsError}
   */
  getEnrollmentFactors(mfaToken: string): Observable<EnrollmentFactor[]>;

  /**
   * Verifies an MFA challenge and returns raw tokens. The grant type is inferred
   * automatically from the provided field: `otp`, `oobCode`, or `recoveryCode`.
   * Angular auth state (`isAuthenticated$`, `user$`) is not updated automatically —
   * call `getAccessTokenSilently()` afterwards to reflect the new session.
   * @throws {MfaVerifyError}
   */
  verify(params: VerifyParams): Observable<TokenEndpointResponse>;
}

/**
 * Observable-based Passkey API client exposed by `AuthService.passkey`.
 *
 * Wraps `PasskeyApiClient` from `@auth0/auth0-spa-js`. Both methods handle the
 * full WebAuthn flow internally and update Angular auth state on success.
 * All methods return `Observable` instead of `Promise`.
 */
export interface ObservablePasskeyApiClient {
  /**
   * Registers a new user with a passkey credential.
   * Updates `isAuthenticated$` and `user$` on success.
   * @throws {PasskeyRegisterError}
   * @throws {PasskeyGetTokenError}
   * @throws {PasskeyError}
   */
  signup(options: PasskeySignupOptions): Observable<TokenEndpointResponse>;

  /**
   * Authenticates an existing user via passkey assertion.
   * Updates `isAuthenticated$` and `user$` on success.
   * @throws {PasskeyChallengeError}
   * @throws {PasskeyGetTokenError}
   * @throws {PasskeyError}
   */
  login(options?: PasskeyLoginOptions): Observable<TokenEndpointResponse>;
}

/**
 * Observable-based MyAccount API client exposed by `AuthService.myAccount`.
 *
 * This is the Angular counterpart of `MyAccountApiClient` from `@auth0/auth0-spa-js`.
 * All methods return `Observable` instead of `Promise`.
 */
export interface ObservableMyAccountApiClient {
  /**
   * Returns the list of factors with their enabled and enrollment status.
   * @throws {MyAccountApiError}
   */
  getFactors(): Observable<Factor[]>;

  /**
   * Returns the authenticated user's enrolled authentication methods,
   * optionally filtered by type.
   * @throws {MyAccountApiError}
   */
  getAuthenticationMethods(
    type?: AuthenticationMethodType
  ): Observable<AuthenticationMethod[]>;

  /**
   * Returns a single authentication method by its ID.
   * @throws {MyAccountApiError}
   */
  getAuthenticationMethod(id: string): Observable<AuthenticationMethod>;

  /**
   * Deletes the specified authentication method.
   * @throws {MyAccountApiError}
   */
  deleteAuthenticationMethod(id: string): Observable<void>;

  /**
   * Updates the specified authentication method (e.g. name, preferred phone method).
   * @throws {MyAccountApiError}
   */
  updateAuthenticationMethod(
    id: string,
    data: UpdateAuthenticationMethodRequest
  ): Observable<AuthenticationMethod>;

  /**
   * Starts enrollment of an authentication method.
   * Returns a challenge response containing `auth_session` and type-specific data.
   * @throws {MyAccountApiError}
   */
  enrollmentChallenge(
    options: EnrollmentChallengeOptions
  ): Observable<EnrollmentChallengeResponse>;

  /**
   * Completes enrollment by verifying the challenge response.
   * Returns the created `AuthenticationMethod`.
   * @throws {MyAccountApiError}
   */
  enrollmentVerify(
    options: EnrollmentVerifyOptions
  ): Observable<AuthenticationMethod>;
}
