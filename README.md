![Stage: Stable Release](https://img.shields.io/badge/stage-stable-green)
![Release](https://img.shields.io/github/v/release/auth0/auth0-angular)
[![CircleCI](https://img.shields.io/circleci/build/github/auth0/auth0-angular)](https://circleci.com/gh/auth0/auth0-angular)
[![Codecov](https://img.shields.io/codecov/c/github/auth0/auth0-angular)](https://codecov.io/gh/auth0/auth0-angular)
![Downloads](https://img.shields.io/npm/dw/@auth0/auth0-angular)

# Auth0 Angular SDK

A library for integrating [Auth0](https://auth0.com) into an Angular 9+ application.

## Table of Contents

- [Documentation](#documentation)
- [Installation](#installation)
- [Getting Started](#getting-started)
- [Angular Universal](#angular-universal)
- [Development](#development)
- [Contributing](#contributing)
- [Support + Feedback](#support--feedback)
- [Vulnerability Reporting](#vulnerability-reporting)
- [What is Auth0](#what-is-auth0)
- [License](#license)

## Documentation

- [API Reference](https://auth0.github.io/auth0-angular/)
- [Quickstart Guide](https://auth0.com/docs/quickstart/spa/angular-next)

## Installation

Using npm:

```sh
npm install @auth0/auth0-angular
```

We also have `ng-add` support, so the library can also be installed using the Angular CLI:

```sh
ng add @auth0/auth0-angular
```

## Getting Started

- [Register the authentication module](#register-the-authentication-module)
- [Add login to your application](#add-login-to-your-application)
- [Add logout to your application](#add-logout-to-your-application)
- [Display the user profile](#display-the-user-profile)
- [Protect a route](#protect-a-route)
- [Call an API](#call-an-api)
- [Dynamic configuration](#dynamic-configuration)
- [Using multiple OAuth providers](#using-multiple-oauth-providers)

### Register the authentication module

Install the SDK into your application by importing `AuthModule` and configuring with your Auth0 domain and client ID:

```js
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { AppComponent } from './app.component';

// Import the module from the SDK
import { AuthModule } from '@auth0/auth0-angular';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,

    // Import the module into the application, with configuration
    AuthModule.forRoot({
      domain: 'YOUR_AUTH0_DOMAIN',
      clientId: 'YOUR_AUTH0_CLIENT_ID',
    }),
  ],

  bootstrap: [AppComponent],
})
export class AppModule {}
```

### Add login to your application

Next, inject the `AuthService` service into a component where you intend to provide the functionality to log in, by adding the `AuthService` type to your constructor. Then, provide a `loginWithRedirect()` method and call `this.auth.loginWithRedirect()` to log the user into the application.

```js
import { Component } from '@angular/core';

// Import the AuthService type from the SDK
import { AuthService } from '@auth0/auth0-angular';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  title = 'My App';

  // Inject the authentication service into your component through the constructor
  constructor(public auth: AuthService) {}

  loginWithRedirect(): void {
    // Call this to redirect the user to the login page
    this.auth.loginWithRedirect();
  }
}
```

By default the application will ask Auth0 will redirect back to the root URL of your application after authentication, but this can be configured by setting the [`redirectUri` option](https://auth0.github.io/auth0-angular/interfaces/authconfig.html#redirecturi).

On your template, provide a button that will allow the user to log in to the application. Use the `isAuthenticated$` observable to check that the user is not already authenticated:

```html
<button
  *ngIf="(auth.isAuthenticated$ | async) === false"
  (click)="loginWithRedirect()"
>
  Log in
</button>
```

### Add logout to your application

Add a `logout` method to your component and call the SDK's `logout` method:

```js
logout(): void {
  // Call this to log the user out of the application
  this.auth.logout({ returnTo: window.location.origin });
}
```

Then on your component's template, add a button that will log the user out of the application. Use the `isAuthenticated$` observable to check that the user has already been authenticated:

```html
<button *ngIf="auth.isAuthenticated$ | async" (click)="logout()">
  Log out
</button>
```

### Display the user profile

Access the `user$` observable on the `AuthService` instance to retrieve the user profile. This observable already heeds the `isAuthenticated$` observable, so you do not need to check if the user is authenticated before using it:

```html
<ul *ngIf="auth.user$ | async as user">
  <li>{{ user.name }}</li>
  <li>{{ user.email }}</li>
</ul>
```

### Access ID token claims

Access the `idTokenClaims$` observable on the `AuthService` instance to retrieve the ID token claims. Like the `user$` observable, this observable already heeds the `isAuthenticated$` observable, so you do not need to check if the user is authenticated before using it:

```js
authService.idTokenClaims$.subscribe((claims) => console.log(claims));
```

### Handle errors

Errors in the login flow can be captured by subscribing to the `error$` observable:

```js
authService.error$.subscribe((error) => console.log(error));
```

### Protect a route

To ensure that a route can only be visited by authenticated users, add the built-in `AuthGuard` type to the `canActivate` property on the route you wish to protect.

If an unauthenticated user tries to access this route, they will first be redirected to Auth0 to log in before returning to the URL they tried to get to before login:

```js
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HomeComponent } from './unprotected/unprotected.component';
import { ProtectedComponent } from './protected/protected.component';

// Import the authentication guard
import { AuthGuard } from '@auth0/auth0-angular';

const routes: Routes = [
  {
    path: 'protected',
    component: ProtectedComponent,

    // Protect a route by registering the auth guard in the `canActivate` hook
    canActivate: [AuthGuard],
  },
  {
    path: '',
    component: HomeComponent,
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
```

### Call an API

The SDK provides an `HttpInterceptor` that automatically attaches access tokens to outgoing requests when using the built-in `HttpClient`. However, you must provide configuration that tells the interceptor which requests to attach access tokens to.

#### Register AuthHttpInterceptor

First, register the interceptor with your application module, along with the `HttpClientModule`.

**Note:** We do not do this automatically for you as we want you to be explicit about including this interceptor. Also, you may want to chain this interceptor with others, making it hard for us to place it accurately.

```js
// Import the interceptor module and the Angular types you'll need
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthHttpInterceptor } from '@auth0/auth0-angular';

// Register the interceptor with your app module in the `providers` array
@NgModule({
  declarations: [],
  imports: [
    BrowserModule,
    HttpClientModule,     // Register this so that you can make API calls using HttpClient
    AppRoutingModule,
    AuthModule.forRoot(...),
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthHttpInterceptor, multi: true },
  ],
  bootstrap: [AppComponent],
})
```

#### Configure AuthHttpInterceptor to attach access tokens

Next, tell the SDK which requests to attach access tokens to in the SDK configuration. These are matched on the URL by using a string, a regex, or more complex object that also allows you to specify the configuration for fetching tokens by setting the `tokenOptions` property.

If an HTTP call is made using `HttpClient` and there is no match in this configuration for that URL, then the interceptor will simply be bypassed and the call will be executed without a token attached in the `Authorization` header.

**Note:** We do this to help prevent tokens being unintentionally attached to requests to the wrong recipient, which is a serious security issue. Those recipients could then use that token to call the API as if it were your application.

In the event that requests should be made available for both anonymous and authenticated users, the `allowAnonymous` property can be set to `true`. When omitted, or set to `false`, requests that match the configuration, will not be executed when there is no access token available.

Here are some examples:

```js
import { HttpMethod } from '@auth0/auth0-angular';

// Modify your existing SDK configuration to include the httpInterceptor config
AuthModule.forRoot({
  domain: 'YOUR_AUTH0_DOMAIN',
  clientId: 'YOUR_AUTH0_CLIENT_ID',
  redirectUri: window.location.origin,

  // The AuthHttpInterceptor configuration
  httpInterceptor: {
    allowedList: [
      // Attach access tokens to any calls to '/api' (exact match)
      '/api',

      // Attach access tokens to any calls that start with '/api/'
      '/api/*',

      // Match anything starting with /api/products, but also allow for anonymous users.
      {
        uri: '/api/products/*',
        allowAnonymous: true,
      },

      // Match anything starting with /api/accounts, but also specify the audience and scope the attached
      // access token must have
      {
        uri: '/api/accounts/*',
        tokenOptions: {
          audience: 'http://my-api/',
          scope: 'read:accounts',
        },
      },

      // Matching on HTTP method
      {
        uri: '/api/orders',
        httpMethod: HttpMethod.Post,
        tokenOptions: {
          audience: 'http://my-api/',
          scope: 'write:orders',
        },
      },

      // Using an absolute URI
      {
        uri: 'https://your-domain.auth0.com/api/v2/users',
        tokenOptions: {
          audience: 'https://your-domain.com/api/v2/',
          scope: 'read:users',
        },
      },
    ],
  },
});
```

> Under the hood, `tokenOptions` is passed as-is to [the `getTokenSilently` method](https://auth0.github.io/auth0-spa-js/classes/auth0client.html#gettokensilently) on the underlying SDK, so all the same options apply here.

**Uri Matching**

If you need more fine-grained control over the URI matching, you can provide a callback function to the `uriMatcher` property that takes a single `uri` argument (being [`HttpRequest.url`](https://angular.io/api/common/http/HttpRequest#url)) and returns a boolean. If this function returns true, then an access token is attached to the request in the ["Authorization" header](https://tools.ietf.org/html/draft-ietf-oauth-v2-bearer-20#section-2.1). If it returns false, the request proceeds without the access token attached.

```
AuthModule.forRoot({
  ...
  httpInterceptor: {
    allowedList: [
      {
        uriMatcher: (uri) => uri.indexOf('/api/orders') > -1,
        httpMethod: HttpMethod.Post,
        tokenOptions: {
          audience: 'http://my-api/',
          scope: 'write:orders',
        },
      },
    ],
  },
});
```

You might want to do this in scenarios where you need the token on multiple endpoints, but want to exclude it from only a few other endpoints. Instead of explicitly listing all endpoints that do need a token, a uriMatcher can be used to include all but the few endpoints that do not need a token attached to its requests.

#### Use HttpClient to make an API call

Finally, make your API call using the `HttpClient`. Access tokens are then attached automatically in the `Authorization` header:

```js
export class MyComponent {
  constructor(private http: HttpClient) {}

  callApi(): void {
    this.http.get('/api').subscribe(result => console.log(result));
  }
}
```

#### Handling errors

Whenever the SDK fails to retrieve an Access Token, either as part of the above interceptor or when manually calling `AuthService.getAccessTokenSilently` and `AuthService.getAccessTokenWithPopup`, it will emit the corresponding error in the `AuthService.error$` observable.

If you want to interact to these errors, subscribe to the `error$` observable and act accordingly.

```
ngOnInit() {
  this.authService.error$.subscribe(error => {
    // Handle Error here
  });
}
```

A common reason you might want to handle the above errors, emitted by the `error$` observable, is to re-login the user when the SDK throws a `login_required` error.

```
ngOnInit() {
  this.authService.error$.pipe(
    filter(e => e.error === 'login_required'),
    mergeMap(() => this.authService.loginWithRedirect())
  ).subscribe();
}
```

### Dynamic Configuration

Instead of using `AuthModule.forRoot` to specify auth configuration, you can provide a factory function using `APP_INITIALIZER` to load your config from an external source before the auth module is loaded, and provide your configuration using `AuthClientConfig.set`.

The configuration will only be used initially when the SDK is instantiated. Any changes made to the configuration at a later moment in time will have no effect on the default options used when calling the SDK's methods. This is also the reason why the dynamic configuration should be set using an `APP_INITIALIZER`, because doing so ensures the configuration is available prior to instantiating the SDK.

> :information_source: Any request made through an instance of `HttpClient` that got instantiated by Angular, will use all of the configured interceptors, including our `AuthHttpInterceptor`. Because the `AuthHttpInterceptor` requires the existence of configuration settings, the request for retrieving those dynamic configuration settings should ensure it's not using any of those interceptors. In Angular, this can be done by manually instantiating `HttpClient` using an injected `HttpBackend` instance.

```js
// app.module.ts
// ---------------------------
import { AuthModule, AuthClientConfig } from '@auth0/auth0-angular';

// Provide an initializer function that returns a Promise
function configInitializer(
  handler: HttpBackend,
  config: AuthClientConfig
) {
  return () =>
    new HttpClient(handler)
      .get('/config')
      .toPromise()
      .then((loadedConfig: any) => config.set(loadedConfig));   // Set the config that was loaded asynchronously here
}

// Provide APP_INITIALIZER with this function. Note that there is no config passed to AuthModule.forRoot
imports: [
  // other imports..

  HttpClientModule,
  AuthModule.forRoot(),   //<- don't pass any config here
],
providers: [
  {
    provide: APP_INITIALIZER,
    useFactory: configInitializer,    // <- pass your initializer function here
    deps: [HttpBackend, AuthClientConfig],
    multi: true,
  },
],
```

### Using multiple OAuth providers

If your application uses multiple OAuth providers, you may need to use multiple callback paths as well, one for each OAuth provider.
To ensure the SDK does not process the callback for any provider other than Auth0, configure the AuthModule by setting the `skipRedirectCallback` property as follows:

```js
AuthModule.forRoot({
  skipRedirectCallback: window.location.pathname === '/other-callback',
});
```

**Note**: In the above example, `/other-callback` is an existing route that will be called by any other OAuth provider with a `code` (or `error` in case something went wrong) and `state`.

### Organizations

[Organizations](https://auth0.com/docs/organizations) is a set of features that provide better support for developers who build and maintain SaaS and Business-to-Business (B2B) applications.

Using Organizations, you can:

- Represent teams, business customers, partner companies, or any logical grouping of users that should have different ways of accessing your applications, as organizations.

- Manage their membership in a variety of ways, including user invitation.

- Configure branded, federated login flows for each organization.

- Implement role-based access control, such that users can have different roles when authenticating in the context of different organizations.

- Build administration capabilities into your products, using Organizations APIs, so that those businesses can manage their own organizations.

Note that Organizations is currently only available to customers on our Enterprise and Startup subscription plans.

#### Log in to an organization

Log in to an organization by specifying the `organization` parameter importing the `AuthModule`:

```
AuthModule.forRoot({
  domain: 'YOUR_AUTH0_DOMAIN',
  clientId: 'YOUR_AUTH0_CLIENT_ID',
  organization: 'YOUR_ORGANIZATION_ID'
}),
```

You can also specify the organization when logging in:

```
// Using a redirect
this.auth.loginWithRedirect({
  organization: 'YOUR_ORGANIZATION_ID'
});

// Using a popup window
this.auth.loginWithPopup({
  organization: 'YOUR_ORGANIZATION_ID'
});
```

#### Accept user invitations

Accept a user invitation through the SDK by creating a route within your application that can handle the user invitation URL, and log the user in by passing the `organization` and `invitation` parameters from this URL. You can either use `loginWithRedirect` or `loginWithPopup` as needed.

```js
import { Component } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  constructor(public auth: AuthService, private activatedRoute: ActivatedRoute) {}

  loginWithRedirect(): void {
    const { organization, invitation } = this.activatedRoute.snapshot.params;

    this.auth.loginWithRedirect({
      organization,
      invitation
    });
  }
}
```

## Angular Universal

This library makes use of the `window` object in a couple of places during initialization, as well as `sessionStorage` in the underlying Auth0 SPA SDK, and thus [will have problems](https://github.com/angular/universal/blob/master/docs/gotchas.md#window-is-not-defined) when being used in an Angular Universal project. The recommendation currently is to only import this library into a module that is to be used in the browser, and omit it from any module that is to participate in a server-side environment.

See [Guards, and creating separate modules](https://github.com/angular/universal/blob/master/docs/gotchas.md#strategy-2-guards) in the Angular Universal "Gotchas" document.

## Development

### Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

### Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

### Running end-to-end tests

The end-to-end tests are executed using [Cypress](https://www.cypress.io/) against the built-in playground app.

The E2E tests require that the user password be specified as an environment variable. This is already set up in the CI environment, but locally you can do:

```
CYPRESS_INTEGRATION_PASSWORD=<password> ng e2e
```

### Running the playground app

The workspace includes a playground application that can be used to test out features of the SDK. Run this using `ng serve playground` and browse to http://localhost:4200.

#### Running an express server

An express server can be started by running `npm run server:api`, which can be used to make testing Http Interceptors easier.
The express server exposes a single endpoint at `http://localhost:3001/api/external` that needs to be called with an `Authorization` header containing a token for the corresponding `domain` and `audience`, configurable in [`api-server.js`](api-server.js).

The playground application is preconfigured to call the above endpoint when clicking the `Call external API` button.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).

## Contributing

We appreciate feedback and contribution to this repo! Before you get started, please see the following:

- [Auth0's general contribution guidelines](https://github.com/auth0/open-source-template/blob/master/GENERAL-CONTRIBUTING.md)
- [Auth0's code of conduct guidelines](https://github.com/auth0/open-source-template/blob/master/CODE-OF-CONDUCT.md)

## Support + Feedback

For support or to provide feedback, please [raise an issue on our issue tracker](https://github.com/auth0/auth0-angular/issues).

## Vulnerability Reporting

Please do not report security vulnerabilities on the public GitHub issue tracker. The [Responsible Disclosure Program](https://auth0.com/responsible-disclosure-policy) details the procedure for disclosing security issues.

## What is Auth0?

Auth0 helps you to easily:

- Implement authentication with multiple identity providers, including social (e.g., Google, Facebook, Microsoft, LinkedIn, GitHub, Twitter, etc), or enterprise (e.g., Windows Azure AD, Google Apps, Active Directory, ADFS, SAML, etc.)
- Log in users with username/password databases, passwordless, or multi-factor authentication
- Link multiple user accounts together
- Generate signed JSON Web Tokens to authorize your API calls and flow the user identity securely
- Access demographics and analytics detailing how, when, and where users are logging in
- Enrich user profiles from other data sources using customizable JavaScript rules

[Why Auth0?](https://auth0.com/why-auth0)

## License

This project is licensed under the MIT license. See the [LICENSE](https://github.com/auth0/auth0-angular/blob/master/LICENSE) file for more info.
