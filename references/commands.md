# Commands

All commands run from the repo root.

## Build

```bash
# Build library for production (runs update-useragent first, then ng build + schematics)
npm run build

# Build without production optimizations (faster for local iteration)
npm run build:dev

# Clean build output
rm -rf dist/
```

## Test

```bash
# Unit tests with coverage — the CI command
npm run test:ci

# Unit tests local (no coverage flag, faster feedback)
npm test

# Run a single spec file
npx jest projects/auth0-angular/src/lib/auth.service.spec.ts
```

## Lint

```bash
npm run lint
```

## Format

Prettier runs automatically via the pre-commit hook (`pretty-quick --staged`). To run manually:

```bash
npx pretty-quick
```

## Type Check

```bash
npx tsc --noEmit
```

## API Docs

```bash
npm run docs    # Generates TypeDoc output
```

## E2E Tests (Cypress)

Spins up the local OIDC provider and playground app, then runs Cypress headless. No live Auth0 tenant needed.

```bash
npm run e2e:ci
```

To run interactively:

```bash
# Terminal 1: start local OIDC provider + playground
npm run start:local

# Terminal 2: open Cypress UI
npm run e2e
```
