import { AuthClientConfig, AuthConfig } from './auth.config';

describe('AuthClientConfig', () => {
  const testConfig: AuthConfig = {
    domain: 'test.domain.com',
    clientId: '123abc',
  };

  it('caches the config as given through the constructor', () => {
    const config = new AuthClientConfig(testConfig);
    expect(config.get()).toBe(testConfig);
  });

  it('caches the config as given through the setter', () => {
    const config = new AuthClientConfig();
    config.set(testConfig);
    expect(config.get()).toBe(testConfig);
  });
});
