![Auth0 SDK for Angular Single Page Applications](https://cdn.auth0.com/website/sdks/banners/auth0-angular-banner.png)

A library for integrating [Auth0](https://auth0.com) into an Angular application.

![Release](https://img.shields.io/npm/v/@auth0/auth0-angular)
[![Codecov](https://img.shields.io/codecov/c/github/auth0/auth0-angular)](https://codecov.io/gh/auth0/auth0-angular)
![Downloads](https://img.shields.io/npm/dw/@auth0/auth0-angular)
[![License](https://img.shields.io/:license-MIT-blue.svg?style=flat)](https://opensource.org/licenses/MIT)
[![CircleCI](https://img.shields.io/circleci/build/github/auth0/auth0-angular)](https://circleci.com/gh/auth0/auth0-angular)

📚 [Documentation](#documentation) - 🚀 [Getting Started](#getting-started) - 💻 [API Reference](#api-reference) - 💬 [Feedback](#feedback)

## Documentation

- [Quickstart](https://auth0.com/docs/quickstart/spa/angular) - our interactive guide for quickly adding login, logout and user information to an Angular app using Auth0.
- [Sample App](https://github.com/auth0-samples/auth0-angular-samples/tree/master/Sample-01) - a full-fledged Angular application integrated with Auth0.
- [FAQs](https://github.com/auth0/auth0-angular/tree/main/FAQ.md) - frequently asked questions about the auth0-angular SDK.
- [Examples](https://github.com/auth0/auth0-angular/tree/main/EXAMPLES.md) - code samples for common Angular authentication scenario's.
- [Docs site](https://www.auth0.com/docs) - explore our docs site and learn more about Auth0.

## Getting started

### Requirements

This project only supports the [actively supported versions of Angular as stated in the Angular documentation](https://angular.io/guide/releases#actively-supported-versions). Whilst other versions might be compatible they are not actively supported.

### Installation

Using npm:

```sh
npm install @auth0/auth0-angular
```

We also have `ng-add` support, so the library can also be installed using the Angular CLI:

```sh
ng add @auth0/auth0-angular
```

### Configure Auth0

Create a **Single Page Application** in the [Auth0 Dashboard](https://manage.auth0.com/#/applications).

> **If you're using an existing application**, verify that you have configured the following settings in your Single Page Application:
>
> - Click on the "Settings" tab of your application's page.
> - Scroll down and click on the "Show Advanced Settings" link.
> - Under "Advanced Settings", click on the "OAuth" tab.
> - Ensure that "JsonWebToken Signature Algorithm" is set to `RS256` and that "OIDC Conformant" is enabled.

Next, configure the following URLs for your application under the "Application URIs" section of the "Settings" page:

- **Allowed Callback URLs**: `http://localhost:4200`
- **Allowed Logout URLs**: `http://localhost:4200`
- **Allowed Web Origins**: `http://localhost:4200`

> These URLs should reflect the origins that your application is running on. **Allowed Callback URLs** may also include a path, depending on where you're handling the callback.

Take note of the **Client ID** and **Domain** values under the "Basic Information" section. You'll need these values in the next step.

### Configure the SDK

#### Static configuration

Install the SDK into your application by importing `AuthModule.forRoot()` and configuring with your Auth0 domain and client id, as well as the URL to which Auth0 should redirect back after succesful authentication:

```ts
import { NgModule } from '@angular/core';
import { AuthModule } from '@auth0/auth0-angular';

@NgModule({
  // ...
  imports: [
    AuthModule.forRoot({
      domain: 'YOUR_AUTH0_DOMAIN',
      clientId: 'YOUR_AUTH0_CLIENT_ID',
      authorizationParams: {
        redirect_uri: window.location.origin,
      },
    }),
  ],
  // ...
})
export class AppModule {}
```

#### Dynamic configuration

Instead of using `AuthModule.forRoot` to specify auth configuration, you can provide a factory function using `APP_INITIALIZER` to load your config from an external source before the auth module is loaded, and provide your configuration using `AuthClientConfig.set`.

The configuration will only be used initially when the SDK is instantiated. Any changes made to the configuration at a later moment in time will have no effect on the default options used when calling the SDK's methods. This is also the reason why the dynamic configuration should be set using an `APP_INITIALIZER`, because doing so ensures the configuration is available prior to instantiating the SDK.

> :information_source: Any request made through an instance of `HttpClient` that got instantiated by Angular, will use all of the configured interceptors, including our `AuthHttpInterceptor`. Because the `AuthHttpInterceptor` requires the existence of configuration settings, the request for retrieving those dynamic configuration settings should ensure it's not using any of those interceptors. In Angular, this can be done by manually instantiating `HttpClient` using an injected `HttpBackend` instance.

```js
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
      // Set the config that was loaded asynchronously here
      .then((loadedConfig: any) => config.set(loadedConfig));
}

export class AppModule {
  // ...
  imports: [
    HttpClientModule,
    AuthModule.forRoot(), // <- don't pass any config here
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: configInitializer, // <- pass your initializer function here
      deps: [HttpBackend, AuthClientConfig],
      multi: true,
    },
  ],
  // ...
}
```

### Add login to your application

To log the user into the application, inject the `AuthService` and call its `loginWithRedirect` method.

```ts
import { Component } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  constructor(public auth: AuthService) {}

  loginWithRedirect() {
    this.auth.loginWithRedirect();
  }
```

By default the application will ask Auth0 to redirect back to the root URL of your application after authentication. This can be configured by setting the [redirectUri](https://auth0.github.io/auth0-angular/interfaces/AuthorizationParams.html#redirect_uri) option.

For more code samples on how to integrate the **auth0-angular** SDK in your **Angular** application, including how to use our standalone and function APIs, have a look at the [examples](https://github.com/auth0/auth0-angular/tree/main/EXAMPLES.md).

## API reference

Explore public API's available in auth0-angular.

- [AuthService](https://auth0.github.io/auth0-angular/classes/AuthService.html) - service used to interact with the SDK.
- [AuthConfig](https://auth0.github.io/auth0-angular/interfaces/AuthConfig.html) - used to configure the SDK.

## Feedback

### Contributing

We appreciate feedback and contribution to this repo! Before you get started, please see the following:

- [Auth0's general contribution guidelines](https://github.com/auth0/open-source-template/blob/master/GENERAL-CONTRIBUTING.md)
- [Auth0's code of conduct guidelines](https://github.com/auth0/open-source-template/blob/master/CODE-OF-CONDUCT.md)

### Raise an issue

To provide feedback or report a bug, please [raise an issue on our issue tracker](https://github.com/auth0/auth0-angular/issues).

### Vulnerability Reporting

Please do not report security vulnerabilities on the public GitHub issue tracker. The [Responsible Disclosure Program](https://auth0.com/responsible-disclosure-policy) details the procedure for disclosing security issues.

---

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: light)" srcset="https://cdn.auth0.com/website/sdks/logos/auth0_light_mode.png"   width="150">
    <source media="(prefers-color-scheme: dark)" srcset="https://cdn.auth0.com/website/sdks/logos/auth0_dark_mode.png" width="150">
    <img alt="Auth0 Logo" src="https://cdn.auth0.com/website/sdks/logos/auth0_light_mode.png" width="150">
  </picture>
</p>
<p align="center">Auth0 is an easy to implement, adaptable authentication and authorization platform. To learn more checkout <a href="https://auth0.com/why-auth0">Why Auth0?</a></p>
<p align="center">
This project is licensed under the MIT license. See the <a href="https://github.com/auth0/auth0-angular/tree/main/LICENSE"> LICENSE</a> file for more info.</p>
