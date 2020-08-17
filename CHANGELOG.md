# Change Log

## [v0.2.1](https://github.com/auth0/auth0-angular/tree/v0.2.1) (2020-08-14)

[Full Changelog](https://github.com/auth0/auth0-angular/compare/v0.2.0...v0.2.1)

**Changed**

- Make the "publish" script copy the README file [\#36](https://github.com/auth0/auth0-angular/pull/36) ([lbalmaceda](https://github.com/lbalmaceda))
- Add metadata to package [\#35](https://github.com/auth0/auth0-angular/pull/35) ([stevehobbsdev](https://github.com/stevehobbsdev))

## [v0.2.0](https://github.com/auth0/auth0-angular/tree/v0.2.0) (2020-08-14)

[Full Changelog](https://github.com/auth0/auth0-angular/compare/v0.1.0...v0.2.0)

**Added**

- Improve the release pipeline [\#31](https://github.com/auth0/auth0-angular/pull/31) ([lbalmaceda](https://github.com/lbalmaceda))
- Add task to generate docs [\#27](https://github.com/auth0/auth0-angular/pull/27) ([lbalmaceda](https://github.com/lbalmaceda))
- Improve playground with options [\#26](https://github.com/auth0/auth0-angular/pull/26) ([lbalmaceda](https://github.com/lbalmaceda))
- Add temporary early access installation notes [\#25](https://github.com/auth0/auth0-angular/pull/25) ([lbalmaceda](https://github.com/lbalmaceda))

**Removed**

- Remove Regex support from the HTTP interceptor [\#29](https://github.com/auth0/auth0-angular/pull/29) ([stevehobbsdev](https://github.com/stevehobbsdev))

## [v0.1.0](https://github.com/auth0/auth0-angular/tree/v0.1.0) (2020-07-31)

**Early Access Release**
Do not use it in a Production environment.

### Installation

In order to install this package on your application, download the `auth0-auth0-angular-0.1.0.tgz` file from the Releases section on the Github repository and run the following command:

```bash
npm install /path/to/auth0-auth0-angular-0.1.0.tgz
```

**Added**

- [SDK-1860] SDK Useragent [\#19](https://github.com/auth0/auth0-angular/pull/19) ([stevehobbsdev](https://github.com/stevehobbsdev))
- [SDK-1847, SDK-1848] Add HttpInterceptor to attach access tokens to requests [\#18](https://github.com/auth0/auth0-angular/pull/18) ([stevehobbsdev](https://github.com/stevehobbsdev))
- [SDK-1778] Add AuthGuard to protect unauthenticated users from accessing certain routes [\#16](https://github.com/auth0/auth0-angular/pull/16) ([samjulien](https://github.com/samjulien))
- [SDK-1846] Add ability to get new access tokens [\#15](https://github.com/auth0/auth0-angular/pull/15) ([stevehobbsdev](https://github.com/stevehobbsdev))
- Add playground app [\#14](https://github.com/auth0/auth0-angular/pull/14) ([lbalmaceda](https://github.com/lbalmaceda))
- Enable access to isLoading `true` state [\#13](https://github.com/auth0/auth0-angular/pull/13) ([stevehobbsdev](https://github.com/stevehobbsdev))
- Add husky pre-commit hook to run prettier [\#12](https://github.com/auth0/auth0-angular/pull/12) ([lbalmaceda](https://github.com/lbalmaceda))
- Install and configure karma-junit-reporter [\#11](https://github.com/auth0/auth0-angular/pull/11) ([stevehobbsdev](https://github.com/stevehobbsdev))
- [SDK-1776] Add logout [\#9](https://github.com/auth0/auth0-angular/pull/9) ([stevehobbsdev](https://github.com/stevehobbsdev))
- [SDK-1780] Add user\$ observable [\#8](https://github.com/auth0/auth0-angular/pull/8) ([stevehobbsdev](https://github.com/stevehobbsdev))
- Add navigator to handle routing after login [\#7](https://github.com/auth0/auth0-angular/pull/7) ([stevehobbsdev](https://github.com/stevehobbsdev))
- [SDK-1781] Add isAuthenticated observable [\#6](https://github.com/auth0/auth0-angular/pull/6) ([stevehobbsdev](https://github.com/stevehobbsdev))
- [SDK-1815] Add silent authentication [\#5](https://github.com/auth0/auth0-angular/pull/5) ([stevehobbsdev](https://github.com/stevehobbsdev))
- [SDK-1779] AuthService creation and login methods [\#4](https://github.com/auth0/auth0-angular/pull/4) ([stevehobbsdev](https://github.com/stevehobbsdev))
- Setup CI and Coverage [\#3](https://github.com/auth0/auth0-angular/pull/3) ([lbalmaceda](https://github.com/lbalmaceda))
- [SDK-1783] Add ability to configure the SDK [\#2](https://github.com/auth0/auth0-angular/pull/2) ([stevehobbsdev](https://github.com/stevehobbsdev))

**Fixed**

- Fix type of the injected window service [\#23](https://github.com/auth0/auth0-angular/pull/23) ([lbalmaceda](https://github.com/lbalmaceda))
- General fixes and tweaks to prep for EA release [\#21](https://github.com/auth0/auth0-angular/pull/21) ([stevehobbsdev](https://github.com/stevehobbsdev))
- [Housekeeping] Fix TSLint issues and upgrade dependencies [\#17](https://github.com/auth0/auth0-angular/pull/17) ([stevehobbsdev](https://github.com/stevehobbsdev))
- Fix popup auth to correctly set authenticated state after login [\#10](https://github.com/auth0/auth0-angular/pull/10) ([stevehobbsdev](https://github.com/stevehobbsdev))
