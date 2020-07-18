import { Component } from '@angular/core';
import { AuthService } from 'projects/auth0-angular/src/lib/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  title = 'Auth0 Angular Playground';

  isAuthenticated$ = this.auth.isAuthenticated$;
  isLoading$ = this.auth.isLoading$;
  user$ = this.auth.user$;

  constructor(public auth: AuthService) {}

  loginWithRedirect() {
    this.auth.loginWithRedirect();
  }

  loginWithPopup() {
    this.auth.loginWithPopup();
  }

  logout(federated: boolean = false) {
    const options = {
      localOnly: true,
      federated,
    };
    this.auth.logout(options);
  }
}
