# Common Pitfalls

## 1. Editing `useragent.ts` by hand

`projects/auth0-angular/src/useragent.ts` is **auto-generated** by `npm run update-useragent`, which runs automatically as the `prebuild` step before every `npm run build`. It reads the version from `projects/auth0-angular/package.json` and writes `useragent.ts`. Manual edits are silently overwritten on the next build.

## 2. Using the root `package.json` version

The root `package.json` has `"version": "0.0.0"` and is marked `"private": true`. It is never published. The real package version lives in `projects/auth0-angular/package.json`.

## 3. Bypassing `Auth0ClientFactory`

Never construct `new Auth0Client(config)` directly. The factory (`Auth0ClientFactory.createClient`) in `projects/auth0-angular/src/lib/auth.client.ts` wires the `auth0Client` telemetry object:

```typescript
auth0Client: {
  name: useragent.name,
  version: useragent.version,
  env: { 'angular/core': VERSION.full },
}
```

Bypassing it silently drops telemetry and produces an untraceable `Auth0Client` instance.

## 4. Forgetting `takeUntil(ngUnsubscribe$)` in constructor subscriptions

`AuthService` creates a long-lived subscription in its constructor. It must be cleaned up via `ngUnsubscribe$` in `ngOnDestroy`. Missing this leaks subscriptions in apps that re-initialize the service and causes test failures (dangling subscriptions interfere with subsequent test cases).

## 5. Asserting auth state before `isLoading$` settles

`isAuthenticated$`, `user$`, and `idTokenClaims$` only emit after `isLoading$` becomes `false`. In unit tests, always wait for loading to complete using the `loaded()` helper:

```typescript
const loaded = (service: AuthService) =>
  service.isLoading$.pipe(filter((loading) => !loading));
```

Asserting without this typically yields stale/empty initial values.

## 6. Third-party cookie limitations

`getAccessTokenSilently` falls back to an iframe `/authorize` call when refresh tokens are unavailable. This iframe requires the `auth0` cookie, which is blocked by default in Safari, Brave, and Firefox ETP. Document this behaviour and its workaround (refresh tokens) in any feature that uses silent token renewal.
