import { InjectionToken, VERSION } from '@angular/core';
import { Auth0Client } from '@auth0/auth0-spa-js';
import { AuthClientConfig } from './auth.config';
import useragent from '../useragent';

export class Auth0ClientFactory {
  static createClient(configFactory: AuthClientConfig): Auth0Client {
    const config = configFactory.get();

    if (!config) {
      throw new Error(
        'Configuration must be specified either through AuthModule.forRoot or through AuthClientConfig.set'
      );
    }

    return new Auth0Client({
      ...config,
      auth0Client: {
        name: useragent.name,
        version: useragent.version,
        env: {
          'angular/core': VERSION.full,
        },
      },
    });
  }
}

export const Auth0ClientService = new InjectionToken<Auth0Client>(
  'auth0.client'
);
