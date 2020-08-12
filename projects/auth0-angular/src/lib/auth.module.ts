import { NgModule, ModuleWithProviders } from '@angular/core';
import { AuthService } from './auth.service';
import { AuthConfig, AuthConfigService } from './auth.config';
import { Auth0ClientService, Auth0ClientFactory } from './auth.client';
import { WindowService, windowProvider } from './window';
import { AuthGuard } from './auth.guard';

@NgModule()
export class AuthModule {
  static forRoot(config: AuthConfig): ModuleWithProviders<AuthModule> {
    const defaultedConfig: AuthConfig = {
      redirectUri: window.location.origin,
      ...config,
    };

    return {
      ngModule: AuthModule,
      providers: [
        AuthService,
        AuthGuard,
        { provide: AuthConfigService, useValue: defaultedConfig },
        {
          provide: Auth0ClientService,
          useValue: Auth0ClientFactory.createClient(defaultedConfig),
        },
        { provide: WindowService, useFactory: windowProvider },
      ],
    };
  }
}
