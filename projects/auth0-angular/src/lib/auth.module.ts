import { NgModule, ModuleWithProviders } from '@angular/core';
import { AuthService } from './auth.service';
import { AuthClient } from './auth.client';
import {
  AuthConfigService,
  LAZY_LOAD_TOKEN,
  RootAuthConfig,
} from './auth.config';
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
  static forRoot(
    config: RootAuthConfig & { lazy: true }
  ): ModuleWithProviders<AuthModule>;
  static forRoot(config?: RootAuthConfig): ModuleWithProviders<AuthModule>;
  static forRoot(config?: RootAuthConfig): ModuleWithProviders<AuthModule> {
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
        {
          provide: LAZY_LOAD_TOKEN,
          useValue: config?.lazy || false,
        },
      ],
    };
  }
}
