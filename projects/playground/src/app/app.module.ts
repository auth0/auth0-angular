import { BrowserModule } from '@angular/platform-browser';
import { NgModule, APP_INITIALIZER } from '@angular/core';
import {
  HttpClient,
  HTTP_INTERCEPTORS,
  HttpBackend,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { AuthModule } from 'projects/auth0-angular/src/lib/auth.module';
import { AuthHttpInterceptor } from 'projects/auth0-angular/src/lib/auth.interceptor';
import { ReactiveFormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ProtectedComponent } from './components/protected.component';
import { UnprotectedComponent } from './components/unprotected.component';
import { ChildRouteComponent } from './components/child-route.component';
import { NestedChildRouteComponent } from './components/nested-child-route.component';
import { ErrorComponent } from './components/error.component';

import { AuthClientConfig } from 'projects/auth0-angular/src/lib/auth.config';

/**
 * Provides configuration to the application
 *
 * @param handler The HttpBackend instance used to instantiate HttpClient manually
 * @param config The AuthConfigClient service
 */
const configInitializer =
  (handler: HttpBackend, config: AuthClientConfig): (() => Promise<any>) =>
  () =>
    new HttpClient(handler)
      .get('/assets/config.json')
      .toPromise()
      .then((loadedConfig: any) => config.set(loadedConfig)); // Set the config that was loaded asynchronously here

@NgModule({
  declarations: [],
  bootstrap: [AppComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    AuthModule.forRoot(/* authConfig */),
    AppComponent,
    ProtectedComponent,
    UnprotectedComponent,
    ChildRouteComponent,
    NestedChildRouteComponent,
    ErrorComponent,
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: configInitializer,
      deps: [HttpBackend, AuthClientConfig],
      multi: true,
    },
    { provide: HTTP_INTERCEPTORS, useClass: AuthHttpInterceptor, multi: true },
    provideHttpClient(withInterceptorsFromDi()),
  ],
})
export class AppModule {}
