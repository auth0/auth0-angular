import { isFederatedDomain } from './public-api';

describe('public-api', () => {
  describe('Enterprise Connect', () => {
    it('re-exports isFederatedDomain from auth0-spa-js', () => {
      expect(typeof isFederatedDomain).toBe('function');
    });
  });
});
