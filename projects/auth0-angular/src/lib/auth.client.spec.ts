import { AuthConfig, AuthClientConfig } from './auth.config';
import { Auth0ClientFactory } from './auth.client';
import { RefreshTokenMode, InvalidConfigurationError } from '@auth0/auth0-spa-js';

const mockWindow = window as any;

Object.defineProperty(mockWindow, 'crypto', {
  value: {
    subtle: {
      digest: () => 'foo',
    },
    getRandomValues() {
      return '123';
    },
  },
  writable: false,
});

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

    describe('Online Access (Online Refresh Tokens)', () => {
      it('creates a new instance of Auth0Client with refreshTokenMode, useDpop, and useMrrt passed through', () => {
        const config: AuthConfig = {
          domain: 'test.domain.com',
          clientId: 'abc123',
          useRefreshTokens: true,
          refreshTokenMode: RefreshTokenMode.Online,
          useDpop: true,
          useMrrt: true,
        };

        const configClient = new AuthClientConfig(config);
        const client = Auth0ClientFactory.createClient(configClient);

        expect(client).not.toBeUndefined();
        expect((client as any).options.refreshTokenMode).toEqual('online');
        expect((client as any).options.useDpop).toEqual(true);
        expect((client as any).options.useMrrt).toEqual(true);
      });

      it('defaults to offline refresh tokens when refreshTokenMode is not specified', () => {
        const config: AuthConfig = {
          domain: 'test.domain.com',
          clientId: 'abc123',
          useRefreshTokens: true,
        };

        const configClient = new AuthClientConfig(config);
        const client = Auth0ClientFactory.createClient(configClient);

        expect((client as any).options.refreshTokenMode).toEqual('offline');
      });

      it('throws InvalidConfigurationError when refreshTokenMode is Online without useRefreshTokens', () => {
        const config: AuthConfig = {
          domain: 'test.domain.com',
          clientId: 'abc123',
          refreshTokenMode: RefreshTokenMode.Online,
          useDpop: true,
        };

        const configClient = new AuthClientConfig(config);

        expect(() =>
          Auth0ClientFactory.createClient(configClient)
        ).toThrow(InvalidConfigurationError);
      });

      it('throws InvalidConfigurationError when refreshTokenMode is Online without useDpop', () => {
        const config: AuthConfig = {
          domain: 'test.domain.com',
          clientId: 'abc123',
          useRefreshTokens: true,
          refreshTokenMode: RefreshTokenMode.Online,
        };

        const configClient = new AuthClientConfig(config);

        expect(() =>
          Auth0ClientFactory.createClient(configClient)
        ).toThrow(InvalidConfigurationError);
      });

      it('does not throw when refreshTokenMode is Offline even without useDpop', () => {
        const config: AuthConfig = {
          domain: 'test.domain.com',
          clientId: 'abc123',
          useRefreshTokens: true,
          refreshTokenMode: RefreshTokenMode.Offline,
        };

        const configClient = new AuthClientConfig(config);

        expect(() =>
          Auth0ClientFactory.createClient(configClient)
        ).not.toThrow();
      });
    });
  });
});
