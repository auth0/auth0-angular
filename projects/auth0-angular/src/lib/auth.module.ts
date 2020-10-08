import { NgModule, ModuleWithProviders } from '@angular/core';
import { AuthService } from './auth.service';
import { AuthConfig, AuthConfigService, AuthClientConfig } from './auth.config';
import { Auth0ClientService, Auth0ClientFactory } from './auth.client';
import { AuthGuard } from './auth.guard';

@NgModule()
export class AuthModule {
  static forRoot(config?: AuthConfig): ModuleWithProviders<AuthModule> {
    return {
      ngModule: AuthModule,
      providers: [
        AuthService,
        AuthGuard,
        { provide: AuthConfigService, useFactory: () => config },
        {
          provide: Auth0ClientService,
          useFactory: Auth0ClientFactory.createClient,
          deps: [AuthClientConfig],
        },
      ],
    };
  }
}
