import { NgModule, ModuleWithProviders, InjectionToken } from '@angular/core';
import { AuthService } from './auth.service';
import { AuthConfig, AuthConfigService } from './auth.config';
import { Auth0ClientService, Auth0ClientFactory } from './auth.client';
import { WindowService, windowProvider } from './window';
import { AuthGuard } from './auth.guard';

@NgModule()
export class AuthModule {
  static forRoot(config: AuthConfig): ModuleWithProviders<AuthModule> {
    return {
      ngModule: AuthModule,
      providers: [
        AuthService,
        AuthGuard,
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
