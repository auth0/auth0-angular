# Code Style

## CI-Enforced Rules

- **Prettier**: `singleQuote: true`, `semi: true` — pre-commit hook runs `pretty-quick --staged`
- **TypeScript strict mode**: `strict: true`, `noImplicitReturns: true`, `noFallthroughCasesInSwitch: true`
- **`@angular-eslint/recommended`** and `@typescript-eslint` rules via `.eslintrc.json`
  - `member-ordering` and `naming-convention` rules are **disabled** — don't add them

## Naming Conventions

| Entity | Convention | Example |
|--------|------------|---------|
| Classes / Interfaces / Types | PascalCase | `AuthService`, `AuthConfig`, `AppState` |
| Methods / properties | camelCase | `loginWithRedirect`, `isAuthenticated$` |
| Injection tokens | PascalCase `const` | `Auth0ClientService`, `AuthConfigService` |
| RxJS Observables | camelCase with `$` suffix | `isLoading$`, `user$`, `error$` |
| Private subjects | camelCase with `Subject$` / `$` suffix | `appStateSubject$`, `ngUnsubscribe$` |

## Patterns

### Wrapping Promises as Observables

```typescript
// ✅ Good — use from() for one-shot promises
loginWithRedirect(options?: RedirectLoginOptions<TAppState>): Observable<void> {
  return from(this.auth0Client.loginWithRedirect(options));
}

// ✅ Good — use defer() when the promise must not execute until subscription
handleRedirectCallback(url?: string) {
  return defer(() => this.auth0Client.handleRedirectCallback<TAppState>(url)).pipe(
    tap(([result]) => { ... }),
  );
}
```

```typescript
// ❌ Bad — don't expose async methods or subscribe internally
async loginWithRedirect(options?) {
  await this.auth0Client.loginWithRedirect(options);
}
```

### RxJS Operator Choices

- `concatMap` — when order matters (chaining auth operations)
- `switchMap` — when only the latest emission matters (route checks)
- `catchError` → call `authState.setError(error)` and `authState.refresh()`, then `throwError(error)`
- `tap` → call `authState.setAccessToken(token)` side-effects (never inside `map`)
- `takeUntil(this.ngUnsubscribe$)` — for subscriptions created in the constructor

### Service Pattern

New auth methods on `AuthService` follow this shape:

```typescript
newMethod(options: SomeOptions): Observable<SomeResult> {
  return of(this.auth0Client).pipe(
    concatMap((client) => client.newMethod(options)),
    tap((result) => {
      if (result.access_token) {
        this.authState.setAccessToken(result.access_token);
      }
    }),
    catchError((error) => {
      this.authState.setError(error);
      this.authState.refresh();
      return throwError(error);
    })
  );
}
```
