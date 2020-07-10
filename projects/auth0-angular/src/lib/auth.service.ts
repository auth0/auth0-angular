import { Injectable, Inject } from '@angular/core';
import { AuthConfigService, AuthConfig } from './auth.config';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(@Inject(AuthConfigService) config: AuthConfig) {}
}
