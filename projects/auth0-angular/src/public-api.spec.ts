import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock spa-js so the re-export chain resolves without a real network call.
// isFederatedDomain gets a controllable implementation so we can drive the
// federated / non-federated / discovery-failure branches.
const isFederatedDomainMock = vi.fn();

vi.mock('@auth0/auth0-spa-js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@auth0/auth0-spa-js')>();
  return {
    ...actual,
    isFederatedDomain: (...args: unknown[]) => isFederatedDomainMock(...args),
  };
});

import { isFederatedDomain } from './public-api';

describe('public-api', () => {
  describe('Enterprise Connect', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('re-exports isFederatedDomain from the package root', () => {
      expect(typeof isFederatedDomain).toBe('function');
    });

    it('forwards the domain and email domain and returns true for a managed domain', async () => {
      isFederatedDomainMock.mockResolvedValue(true);

      const federated = await isFederatedDomain('tenant.auth0.com', 'acme.com');

      expect(federated).toBe(true);
      expect(isFederatedDomainMock).toHaveBeenCalledWith(
        'tenant.auth0.com',
        'acme.com'
      );
    });

    it('propagates false for an unmanaged domain', async () => {
      isFederatedDomainMock.mockResolvedValue(false);

      await expect(
        isFederatedDomain('tenant.auth0.com', 'gmail.com')
      ).resolves.toBe(false);
    });

    // spa-js fails closed: a network error, 429, or any non-ok status resolves
    // to false rather than throwing, so discovery failures route to the fallback
    // login instead of surfacing an error the caller must catch.
    it('resolves false rather than rejecting when discovery fails', async () => {
      isFederatedDomainMock.mockResolvedValue(false);

      await expect(
        isFederatedDomain('tenant.auth0.com', 'acme.com')
      ).resolves.toBe(false);
    });
  });
});
