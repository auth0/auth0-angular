import { NgModule, ModuleWithProviders, InjectionToken } from '@angular/core';
import { AuthService } from './auth.service';
import { AuthConfig, AuthConfigService } from './auth.config';
import { Auth0ClientService, Auth0ClientFactory } from './auth.client';
import { Auth0Client } from '@auth0/auth0-spa-js';
import { WindowService, windowProvider } from './window';

@NgModule()
export class AuthModule {
  static forRoot(config: AuthConfig): ModuleWithProviders<AuthModule> {
    return {
      ngModule: AuthModule,
      providers: [
        AuthService,
        { provide: AuthConfigService, useValue: config },
        {
          provide: Auth0ClientService,
          useValue: Auth0ClientFactory.createClient(config),
        },
        { provide: WindowService, useFactory: windowProvider },
      ],
    };
  }
}
