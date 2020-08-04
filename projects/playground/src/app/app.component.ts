import { Component } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { AuthService } from 'projects/auth0-angular/src/lib/auth.service';
import { Observable, iif, BehaviorSubject, of } from 'rxjs';
import { tap, first } from 'rxjs/operators';
import { LogoutOptions } from '@auth0/auth0-spa-js';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  isAuthenticated$ = this.auth.isAuthenticated$;
  isLoading$ = this.auth.isLoading$;
  user$ = this.auth.user$;
  accessToken$ = new BehaviorSubject(null);

  loginOptionsForm = new FormGroup({
    usePopup: new FormControl(false),
  });

  logoutOptionsForm = new FormGroup({
    localOnly: new FormControl(false),
    federated: new FormControl(false),
  });

  accessTokenOptionsForm = new FormGroup({
    usePopup: new FormControl(false),
  });

  constructor(public auth: AuthService) {}

  launchLogin(): void {
    const usePopup = this.loginOptionsForm.value.usePopup === true;
    if (usePopup) {
      this.auth.loginWithPopup();
    } else {
      this.auth.loginWithRedirect();
    }
  }

  launchLogout(): void {
    const formOptions = this.logoutOptionsForm.value;
    const options: LogoutOptions = {
      localOnly: formOptions.localOnly === true,
      federated: formOptions.federated === true,
      returnTo: 'http://localhost:4200',
    };
    this.auth.logout(options);
  }

  updateAccessToken(): void {
    const usePopup = this.accessTokenOptionsForm.value.usePopup === true;
    iif(
      () => usePopup,
      this.auth.getAccessTokenWithPopup(),
      this.auth.getAccessTokenSilently()
    )
      .pipe(first())
      .subscribe((token) => {
        this.accessToken$.next(token);
      });
  }
}
