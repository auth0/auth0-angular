import { Inject, Injectable, InjectionToken, VERSION } from '@angular/core';
import { Auth0Client } from '@auth0/auth0-spa-js';
import { AuthClientConfig, AuthConfig } from './auth.config';
import useragent from '../useragent';

const createClient = (config: AuthConfig) =>
  new Auth0Client({
    ...config,
    auth0Client: {
      name: useragent.name,
      version: useragent.version,
      env: {
        'angular/core': VERSION.full,
      },
    },
  });

export class Auth0ClientFactory {
  static createClient(configFactory: AuthClientConfig): Auth0Client {
    const config = configFactory.get();

    if (!config) {
      throw new Error(
        'Configuration must be specified either through AuthModule.forRoot or through AuthClientConfig.set'
      );
    }

    return createClient(config);
  }
}

export const Auth0ClientService = new InjectionToken<Auth0Client>(
  'auth0.client'
);

@Injectable({ providedIn: 'root' })
export class AuthClient {
  private client: Auth0Client;

  constructor(@Inject(Auth0ClientService) auth0Client: Auth0Client) {
    this.client = auth0Client;
  }

  /**
   * Create a new instance of Auth0Client and track it.
   *
   * @param config The configuration used to initialize the Auth0Client
   */
  createClient(config: AuthConfig): void {
    this.client = createClient(config);
  }

  /**
   * Gets the current client
   */
  get(): Auth0Client {
    return this.client;
  }
}
