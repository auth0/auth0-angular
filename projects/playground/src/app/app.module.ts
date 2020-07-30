import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { AuthModule } from 'projects/auth0-angular/src/lib/auth.module';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ProtectedComponent } from './protected/protected.component';
import { UnprotectedComponent } from './unprotected/unprotected.component';

const AUTH0_CONFIG = {
  clientId: 'wLSIP47wM39wKdDmOj6Zb5eSEw3JVhVp',
  domain: 'brucke.auth0.com',
  redirectUri: 'http://localhost:4200',
};

@NgModule({
  declarations: [AppComponent, ProtectedComponent, UnprotectedComponent],
  imports: [BrowserModule, AppRoutingModule, AuthModule.forRoot(AUTH0_CONFIG)],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
