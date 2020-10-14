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
  });
});
