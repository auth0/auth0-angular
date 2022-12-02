import { NgModule, ModuleWithProviders } from '@angular/core';
import { AuthService } from './auth.service';
import { AuthConfig, AuthConfigService } from './auth.config';
import { AuthClient } from './auth.client';
import { AuthGuard } from './auth.guard';

@NgModule()
export class AuthModule {
  constructor(
    // Needs to be injected, but left unused
    // Ideally we would ensure it's used, but that would change the public API which we decided not to do for now.
    private authService: AuthService
  ) {}

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
        AuthClient,
      ],
    };
  }
}
