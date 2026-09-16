# Testing

## Framework

Vitest 3 with `@analogjs/vite-plugin-angular` (JIT mode). Config: `vitest.config.ts` at the repo root.

## Test Location

Unit tests are co-located with source files:

```text
projects/auth0-angular/src/lib/auth.service.spec.ts
projects/auth0-angular/src/lib/auth.guard.spec.ts
projects/auth0-angular/src/lib/auth.interceptor.spec.ts
projects/auth0-angular/src/lib/auth.client.spec.ts
projects/auth0-angular/src/lib/auth.config.spec.ts
projects/auth0-angular/src/lib/abstract-navigator.spec.ts
```

## Unit Test Commands

```bash
npm run test:ci      # With coverage, silent (CI)
npm test             # Local, watch mode

# Single spec file
npx vitest run projects/auth0-angular/src/lib/auth.service.spec.ts
```

The default `npm run test:ci` suite is unit-only — no credentials required.

## Coverage

Reports land in `coverage/auth0-angular/`. Codecov uploads automatically in CI (`.github/workflows/test.yml`).

## Vitest Config Notes

`vitest.config.ts` uses `pool: 'forks'` with `environment: 'jsdom'`. Two non-obvious constraints apply:

1. **Module-cache isolation**: Vitest clears the Vite module runner cache between `setupFiles` and each spec file. This means `TestBed.initTestEnvironment` called in `test-setup.ts` operates on a different `TestBed` instance than the one the spec file imports. Every spec file that uses `TestBed` must call `TestBed.initTestEnvironment` itself in a top-level `beforeAll`.

2. **Per-file jsdom window**: Each spec file gets its own jsdom `window`. `zone.js` imported in `test-setup.ts` patches only that file's window. Every spec file that uses `TestBed` must import `zone.js`, `zone.js/testing`, and `@angular/compiler` at its own top level so they patch its window before Angular runs.

The `test-setup.ts` still handles `reflect-metadata` and `cross-fetch/polyfill` globally.

## Conventions

- Tests use Angular `TestBed` to configure the DI context
- `Auth0Client` is instantiated as a real object then spied on:
  ```typescript
  auth0Client = new Auth0Client({ domain: '', clientId: '' });
  vi.spyOn(auth0Client, 'checkSession').mockResolvedValue();
  ```
- The `loaded()` helper filters `isLoading$` to wait for the SDK to finish initializing before asserting:
  ```typescript
  const loaded = (service: AuthService) => service.isLoading$.pipe(filter((loading) => !loading));
  ```
- Use plain `async`/`await` for async assertions — `fakeAsync`/`tick` are not available under Vitest
- Use the local `firstValueFrom` polyfill (defined at the top of `auth.service.spec.ts`) to await a single emission — it rejects with `EmptyError` on empty completion, matching RxJS 7 semantics (RxJS 6 `toPromise()` would silently resolve `undefined`)
- Use `bufferCount(n)` or `bufferTime(ms)` to collect multiple emissions before asserting

## Mocking

- Inject `Auth0Client` via `Auth0ClientService` token; override the provider in `TestBed.configureTestingModule`
- Use `vi.spyOn` on the `Auth0Client` instance — not on the class
- `AbstractNavigator` is provided as a mock that records `navigateByUrl` calls

## E2E Tests (Cypress)

`projects/playground/e2e/integration/playground.cy.ts` — runs against the local OIDC provider (`scripts/oidc-provider.js`), **not** a live Auth0 tenant. Default credentials are `testing` / `testing`, matching the local OIDC config.

```bash
npm run e2e:ci    # Starts local OIDC + playground, then Cypress headless
```

Cross-browser e2e runs in CI via `.github/workflows/cross-browser.yml` (Chrome, Firefox, Edge).
