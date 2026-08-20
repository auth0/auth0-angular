# Testing

## Framework

Jest 29 with `jest-preset-angular`. Config: `projects/auth0-angular/jest.config.ts` (delegates to the root `jest.config.ts`).

## Test Location

Unit tests are co-located with source files:
```
projects/auth0-angular/src/lib/auth.service.spec.ts
projects/auth0-angular/src/lib/auth.guard.spec.ts
projects/auth0-angular/src/lib/auth.interceptor.spec.ts
projects/auth0-angular/src/lib/auth.client.spec.ts
projects/auth0-angular/src/lib/auth.config.spec.ts
```

## Unit Test Commands

```bash
npm run test:ci      # With coverage, silent (CI)
npm test             # Local, no coverage flag

# Single spec file
npx jest projects/auth0-angular/src/lib/auth.service.spec.ts
```

The default `npm run test:ci` suite is unit-only — no credentials required.

## Coverage

Reports land in `coverage/auth0-angular/`. Codecov uploads automatically in CI (`.github/workflows/test.yml`).

## Conventions

- Tests use Angular `TestBed` to configure the DI context
- `Auth0Client` is instantiated as a real object then spied on:
  ```typescript
  auth0Client = new Auth0Client({ domain: '', clientId: '' });
  jest.spyOn(auth0Client, 'checkSession').mockResolvedValue();
  ```
- The `loaded()` helper filters `isLoading$` to wait for the SDK to finish initializing before asserting:
  ```typescript
  const loaded = (service: AuthService) =>
    service.isLoading$.pipe(filter((loading) => !loading));
  ```
- Use `fakeAsync` / `tick()` for promise-based async assertions
- Use `bufferCount` or `bufferTime` to collect multiple emissions from an Observable before asserting

## Mocking

- Inject `Auth0Client` via `Auth0ClientService` token; override the provider in `TestBed.configureTestingModule`
- Use `jest.spyOn` on the `Auth0Client` instance — not on the class
- `AbstractNavigator` is provided as a mock that records `navigateByUrl` calls

## E2E Tests (Cypress)

`projects/playground/e2e/integration/playground.cy.ts` — runs against the local OIDC provider (`scripts/oidc-provider.js`), **not** a live Auth0 tenant. Default credentials are `testing` / `testing`, matching the local OIDC config.

```bash
npm run e2e:ci    # Starts local OIDC + playground, then Cypress headless
```

Cross-browser e2e runs in CI via `.github/workflows/cross-browser.yml` (Chrome, Firefox, Edge).
