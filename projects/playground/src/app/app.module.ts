import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { AuthModule } from 'projects/auth0-angular/src/lib/auth.module';
import { ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ProtectedComponent } from './components/protected.component';
import { UnprotectedComponent } from './components/unprotected.component';
import { ChildRouteComponent } from './components/child-route.component';
import { NestedChildRouteComponent } from './components/nested-child-route.component';

const AUTH0_CONFIG = {
  clientId: 'wLSIP47wM39wKdDmOj6Zb5eSEw3JVhVp',
  domain: 'brucke.auth0.com',
};

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
    AuthModule.forRoot(AUTH0_CONFIG),
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
