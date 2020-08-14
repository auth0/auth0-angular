import { NgModule, ModuleWithProviders } from '@angular/core';
import { AuthService } from './auth.service';
import { AuthConfig, AuthConfigService } from './auth.config';
import { Auth0ClientService, Auth0ClientFactory } from './auth.client';
import { WindowService, windowProvider } from './window';
import { AuthGuard } from './auth.guard';

@NgModule()
export class AuthModule {
  static forRoot(config: AuthConfig): ModuleWithProviders<AuthModule> {
    const defaultConfig: AuthConfig = {
      redirectUri: window.location.origin,
      ...config,
    };

    return {
      ngModule: AuthModule,
      providers: [
        AuthService,
        AuthGuard,
        { provide: AuthConfigService, useValue: defaultConfig },
        {
          provide: Auth0ClientService,
          useValue: Auth0ClientFactory.createClient(defaultConfig),
        },
        { provide: WindowService, useFactory: windowProvider },
      ],
    };
  }
}
