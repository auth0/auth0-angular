import { AuthConfig } from './auth.config';
import { AuthClient } from './auth.client';
import { of, Subject } from 'rxjs';
import { expect } from '@jest/globals';
import { fakeAsync, tick } from '@angular/core/testing';

const mockWindow = global as any;

mockWindow.crypto = {
  subtle: {
    digest: () => 'foo',
  },
  getRandomValues() {
    return '123';
  },
};

describe('AuthClient', () => {
  describe('createClient', () => {
    it('creates a new instance of Auth0Client', () => {
      const config: AuthConfig = {
        domain: 'test.domain.com',
        clientId: 'abc123',
      };

      const authClient = new AuthClient({ config$: of(config) } as any, false);

      authClient
        .getInstance$()
        .subscribe((client) => expect(client).toBeDefined());

      expect.assertions(1);
    });

    it('throws an error instantly when no config was supplied', fakeAsync(() => {
      const authClient = new AuthClient({ config$: new Subject() } as any, false);

      authClient.getInstance$().subscribe({
        error: (error) =>
          expect(error.message).toContain('Configuration must be specified'),
      });

      tick(0);

      expect.assertions(1);
    }));

    it('throws an error when no config was supplied after timeout duration when forceInitialization set to true', fakeAsync(() => {
      const authClient = new AuthClient({ config$: new Subject() } as any, true);

      authClient.getInstance$().subscribe({
        error: (error) =>
          expect(error.message).toContain('Configuration must be specified'),
      });

      tick(15000);

      expect.assertions(1);
    }));

    it('creates a new instance of Auth0Client with the correct properties to skip the refreshtoken fallback', () => {
      const config: AuthConfig = {
        domain: 'test.domain.com',
        clientId: 'abc123',
        useRefreshTokens: true,
        useRefreshTokensFallback: false,
      };

      const authClient = new AuthClient({ config$: of(config) } as any, false);

      authClient.getInstance$().subscribe((client) => {
        expect(client).not.toBeUndefined();
        expect((client as any).options.domain).toEqual('test.domain.com');
        expect((client as any).options.clientId).toEqual('abc123');
        expect((client as any).options.useRefreshTokens).toEqual(true);
        expect((client as any).options.useRefreshTokensFallback).toEqual(false);
      });

      expect.assertions(5);
    });

    it('creates a new instance of Auth0Client with the correct properties without any value for useRefreshTokensFallback', () => {
      const config: AuthConfig = {
        domain: 'test.domain.com',
        clientId: 'abc123',
        useRefreshTokens: true,
      };

      const authClient = new AuthClient({ config$: of(config) } as any, false);

      authClient.getInstance$().subscribe((client) => {
        expect(client).not.toBeUndefined();
        expect((client as any).options.domain).toEqual('test.domain.com');
        expect((client as any).options.clientId).toEqual('abc123');
        expect((client as any).options.useRefreshTokens).toEqual(true);
        expect((client as any).options.useRefreshTokensFallback).toEqual(false);
      });
      expect.assertions(5);
    });
  });
});
