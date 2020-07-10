import { NgModule, ModuleWithProviders, InjectionToken } from '@angular/core';
import { AuthService } from './auth.service';
import { AuthConfig, AuthConfigService } from './auth.config';

@NgModule()
export class AuthModule {
  static forRoot(config: AuthConfig): ModuleWithProviders<AuthModule> {
    return {
      ngModule: AuthModule,
      providers: [
        AuthService,
        { provide: AuthConfigService, useValue: config },
      ],
    };
  }
}
