import { AuthConfig, AuthClientConfig } from './auth.config';
import { Auth0ClientFactory, AuthClient } from './auth.client';
import { Auth0Client } from '@auth0/auth0-spa-js';

describe('Auth0ClientFactory', () => {
  describe('createClient', () => {
    it('creates a new instance of Auth0Client', () => {
      const config: AuthConfig = {
        domain: 'test.domain.com',
        clientId: 'abc123',
      };

      const configClient = new AuthClientConfig(config);
      const client = Auth0ClientFactory.createClient(configClient);

      expect(client).not.toBeUndefined();
    });

    it('throws an error when no config was supplied', () => {
      const configClient = new AuthClientConfig();

      expect(() => Auth0ClientFactory.createClient(configClient)).toThrowError(
        /^Configuration must be specified/
      );
    });

    it('creates a new instance of Auth0Client with the correct properties to skip the refreshtoken fallback', () => {
      const config: AuthConfig = {
        domain: 'test.domain.com',
        clientId: 'abc123',
        useRefreshTokens: true,
        useRefreshTokensFallback: false,
      };

      const configClient = new AuthClientConfig(config);
      const client = Auth0ClientFactory.createClient(configClient);

      expect(client).not.toBeUndefined();
      expect((client as any).options.domain).toEqual('test.domain.com');
      expect((client as any).options.clientId).toEqual('abc123');
      expect((client as any).options.useRefreshTokens).toEqual(true);
      expect((client as any).options.useRefreshTokensFallback).toEqual(false);
    });

    it('creates a new instance of Auth0Client with the correct properties without any value for useRefreshTokensFallback', () => {
      const config: AuthConfig = {
        domain: 'test.domain.com',
        clientId: 'abc123',
        useRefreshTokens: true,
      };

      const configClient = new AuthClientConfig(config);
      const client = Auth0ClientFactory.createClient(configClient);

      expect(client).not.toBeUndefined();
      expect((client as any).options.domain).toEqual('test.domain.com');
      expect((client as any).options.clientId).toEqual('abc123');
      expect((client as any).options.useRefreshTokens).toEqual(true);
      expect((client as any).options.useRefreshTokensFallback).toEqual(false);
    });
  });
});

describe('AuthClient', () => {
  describe('createClient', () => {
    it('creates a new instance of Auth0Client', () => {
      const config: AuthConfig = {
        domain: 'test.domain.com',
        clientId: 'abc123',
      };

      const client = new AuthClient((null as any) as Auth0Client);
      client.createClient(config);

      expect(client.get()).not.toBeUndefined();
      expect((client.get() as any).options.domain).toEqual('test.domain.com');
      expect((client.get() as any).options.clientId).toEqual('abc123');
    });
  });
});
