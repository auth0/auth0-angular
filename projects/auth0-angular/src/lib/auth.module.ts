import { NgModule, ModuleWithProviders, Injector, Inject } from '@angular/core';
import { AuthService } from './auth.service';
import { AuthClient } from './auth.client';
import {
  RootAuthConfig,
  AuthConfigService,
  FORCE_INITIALIZATION_TOKEN,
} from './auth.config';
import { AuthGuard } from './auth.guard';

@NgModule()
export class AuthModule {
  constructor(
    injector: Injector,
    @Inject(FORCE_INITIALIZATION_TOKEN) forceInitialization: boolean
  ) {
    // If forceInitialization is set to true,
    // we need to instantiate the AuthService when the AuthModule is instantiated.
    if (forceInitialization) {
      console.log('force')
      injector.get<AuthService>(AuthService);
    }
  }

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
          useValue: config?.forceInitialization ? undefined : config,
        },
        AuthClient,
        {
          provide: FORCE_INITIALIZATION_TOKEN,
          useValue: config?.forceInitialization || false,
        },
      ],
    };
  }
}
