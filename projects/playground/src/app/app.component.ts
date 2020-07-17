import { Component } from '@angular/core';
import { AuthService } from 'projects/auth0-angular/src/lib/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  title = 'Auth0 Angular Playground';

  constructor(public auth: AuthService) {}

  loginWithRedirect() {
    this.auth.loginWithRedirect();
  }

  loginWithPopup() {
    this.auth.loginWithPopup();
  }

  logout() {
    //delegate to auth.logout()
    console.log('NOT IMPLEMENTED');
  }

  isAuthenticated() {
    return this.auth.isAuthenticated$;
  }

  isLoading() {
    return this.auth.isLoading$;
  }

  getIdTokenClaims() {
    return this.auth.user$;
  }
}
