import { Injectable } from '@angular/core';
import { ReplaySubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthErrorService {
  private errorSubject$ = new ReplaySubject<Error>(1);

  /**
   * Emits errors that occur during login, or when checking for an active session on startup.
   */
  readonly error$ = this.errorSubject$.asObservable();

  recordError(err: any) {
    if (
      !this.disabled ||
      !['login_required', 'consent_required'].includes(err.error)
    ) {
      this.errorSubject$.next(err);
    }
  }

  disabled?: boolean;
}
