import { BrowserModule } from '@angular/platform-browser';
import { NgModule, APP_INITIALIZER } from '@angular/core';
import { AuthModule } from 'projects/auth0-angular/src/lib/auth.module';
import { ReactiveFormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ProtectedComponent } from './components/protected.component';
import { UnprotectedComponent } from './components/unprotected.component';
import { ChildRouteComponent } from './components/child-route.component';
import { NestedChildRouteComponent } from './components/nested-child-route.component';
import { HttpClient, HttpClientModule } from '@angular/common/http';

import {
  AuthClientConfig,
  AuthConfig,
} from 'projects/auth0-angular/src/lib/auth.config';

const authConfig: AuthConfig = {
  clientId: 'wLSIP47wM39wKdDmOj6Zb5eSEw3JVhVp',
  domain: 'brucke.auth0.com',
};

/**
 * Provides configuration to the application
 * @param config The AuthConfigClient service
 */
const configInitializer = (config: AuthClientConfig, http: HttpClient) => () =>
  http
    .get('http://localhost:3000/config')
    .toPromise()
    .then((c: AuthConfig) => config.set(c));

@NgModule({
  declarations: [
    AppComponent,
    ProtectedComponent,
    UnprotectedComponent,
    ChildRouteComponent,
    NestedChildRouteComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    HttpClientModule,

    // This playground has been configured by default to use dynamic configuration.
    // If you wish to specify configuration to `forRoot` directly, uncomment `authConfig`
    // here, and comment out the APP_INITIALIZER config in the providers array below.
    AuthModule.forRoot(/* authConfig */),
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: configInitializer,
      deps: [AuthClientConfig, HttpClient],
      multi: true,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
