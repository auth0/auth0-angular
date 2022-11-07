import { NgModule, ModuleWithProviders } from '@angular/core';
import { AuthService } from './auth.service';
import { AuthConfig, AuthConfigService, AuthClientConfig } from './auth.config';
import { Auth0ClientService, Auth0ClientFactory } from './auth.client';
import { AuthGuard } from './auth.guard';

@NgModule()
export class AuthModule {
  /**
   * Initialize the authentication module system. Configuration can either be specified here,
   * or by calling AuthClientConfig.set (perhaps from an APP_INITIALIZER factory function).
   *
   * @param config The optional configuration for the SDK.
   */
  static forRoot(config?: AuthConfig): ModuleWithProviders<AuthModule> {
    return {
      ngModule: AuthModule,
      providers: [
        AuthService,
        AuthGuard,
        {
          provide: AuthConfigService,
          useValue: config,
        },
        {
          provide: Auth0ClientService,
          useFactory: Auth0ClientFactory.createClient,
          deps: [AuthClientConfig],
        },
      ],
    };
  }
}
