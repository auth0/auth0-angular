import {
  ApplicationConfig,
  APP_INITIALIZER,
  importProvidersFrom,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  HTTP_INTERCEPTORS,
  HttpClient,
  HttpBackend,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { AuthModule } from 'projects/auth0-angular/src/lib/auth.module';
import { AuthHttpInterceptor } from 'projects/auth0-angular/src/lib/auth.interceptor';
import { AuthClientConfig } from 'projects/auth0-angular/src/lib/auth.config';
import { routes } from './app.routes';

const configInitializer =
  (handler: HttpBackend, config: AuthClientConfig): (() => Promise<any>) =>
  () =>
    new HttpClient(handler)
      .get('/assets/config.json')
      .toPromise()
      .then((loadedConfig: any) => config.set(loadedConfig));

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    importProvidersFrom(AuthModule.forRoot()),
    {
      provide: APP_INITIALIZER,
      useFactory: configInitializer,
      deps: [HttpBackend, AuthClientConfig],
      multi: true,
    },
    { provide: HTTP_INTERCEPTORS, useClass: AuthHttpInterceptor, multi: true },
    provideHttpClient(withInterceptorsFromDi()),
  ],
};
