import { AuthConfig, AuthClientConfig } from './auth.config';
import { Auth0ClientFactory } from './auth.client';

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
      expect((client as any).options.client_id).toEqual('abc123');
      expect((client as any).options.useRefreshTokens).toEqual(true);
      expect((client as any).options.useRefreshTokensFallback).toEqual(false);
    });

    it('creates a new instance of Auth0Client with the correct properties without specifying any value for useRefreshTokensFallback', () => {
      const config: AuthConfig = {
        domain: 'test.domain.com',
        clientId: 'abc123',
        useRefreshTokens: true,
      };

      const configClient = new AuthClientConfig(config);
      const client = Auth0ClientFactory.createClient(configClient);

      expect(client).not.toBeUndefined();
      expect((client as any).options.domain).toEqual('test.domain.com');
      expect((client as any).options.client_id).toEqual('abc123');
      expect((client as any).options.useRefreshTokens).toEqual(true);
      expect(
        (client as any).options.useRefreshTokensFallback
      ).not.toBeDefined();
    });
  });
});
