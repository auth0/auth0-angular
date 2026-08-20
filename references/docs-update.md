# Docs Update Rules

## Tracked Docs

| Doc | Exists | Covers |
|-----|--------|--------|
| `README.md` | ✅ | Installation, `ng add`, configuration (`provideAuth0`, `AuthModule.forRoot`), quick-start login/logout, API reference link |
| `EXAMPLES.md` | ✅ | Code samples for login, logout, guard, interceptor, token exchange, DPoP, online access, MFA, passkeys, MyAccount API, standalone components |

## Code-to-Docs Mapping

| When this changes | Update these docs |
|-------------------|-------------------|
| Public API surface (anything in `projects/auth0-angular/src/public-api.ts`) | `README.md` (API reference section), `EXAMPLES.md` (affected samples) |
| Configuration options (`AuthConfig`, `HttpInterceptorConfig`) | `README.md` (configuration section) |
| Auth flow (login, logout, token handling, callback) | `README.md` (getting started / quick-start), `EXAMPLES.md` (affected examples) |
| Install command or `ng add` schematic | `README.md` (installation section) |
| Any new public method or exported type added | `EXAMPLES.md` (add a usage sample) |
| Any public method or exported type renamed or removed | `README.md` + `EXAMPLES.md` (remove/update all references) |
| New integration pattern (DPoP, passkeys, MFA, MyAccount, token exchange) | `EXAMPLES.md` (add integration example) |
