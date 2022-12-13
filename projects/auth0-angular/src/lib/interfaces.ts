import { RedirectLoginOptions as SPARedirectLoginOptions, LogoutOptions as SPALogoutOptions } from '@auth0/auth0-spa-js';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface RedirectLoginOptions<TAppState> extends Omit<SPARedirectLoginOptions<TAppState>, 'onRedirect'> {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface LogoutOptions extends Omit<SPALogoutOptions, 'onRedirect'> {}

