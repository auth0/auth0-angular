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
