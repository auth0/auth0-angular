# Git Workflow

## Branch Naming

No enforced convention detected. Use descriptive names:
- `fix/auth-guard-canactivate`
- `feat/dpop-nonce-helper`
- `chore/bump-angular-20`

## Commit Messages

No commitlint is configured. Use Conventional Commits style for clarity:

```
feat: add setDpopNonce to AuthService
fix: handle missing refresh token in interceptor
chore: update Angular to v20
docs: add passkey examples to EXAMPLES.md
```

## Pull Requests

This is an Auth0-org repo with no local `.github/PULL_REQUEST_TEMPLATE.md`. The [Auth0 org-level PR template](https://github.com/auth0/.github/blob/master/.github/PULL_REQUEST_TEMPLATE.md) applies.

Sections: **Description**, **References**, **Testing**, **Checklist** — checklist items include:
- Adds test coverage for new/changed functionality
- Added documentation for new/changed functionality
- Correct base branch if not the default

## Releases

Releases are cut via `.github/workflows/npm-release.yml` and `.github/workflows/release.yml`. The version source is `projects/auth0-angular/package.json`. Do not bump the version manually.
