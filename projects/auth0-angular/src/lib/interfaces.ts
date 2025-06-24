import {
  RedirectLoginOptions as SPARedirectLoginOptions,
  LogoutOptions as SPALogoutOptions,
} from '@auth0/auth0-spa-js';

export interface RedirectLoginOptions<TAppState>
  extends Omit<SPARedirectLoginOptions<TAppState>, 'onRedirect'> {}

export interface LogoutOptions extends Omit<SPALogoutOptions, 'onRedirect'> {}
