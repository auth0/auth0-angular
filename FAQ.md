# Frequently Asked Questions

**Note:** `auth0-angular` uses [Auth0 SPA JS](https://github.com/auth0/auth0-spa-js) behind the scenes, so be sure to check [their FAQs](https://github.com/auth0/auth0-spa-js/blob/master/FAQ.md) too.

1. [User is not logged in after page refresh](#1-user-is-not-logged-in-after-page-refresh)
2. [User is not logged in after successful sign in with redirect](#2-user-is-not-logged-in-after-successful-sign-in-with-redirect)
3. [User is redirected to `/` after successful sign in with redirect](#3-user-is-redirected-to--after-successful-sign-in-with-redirect)
4. [Getting an infinite redirect loop between my application and Auth0](#4-getting-an-infinite-redirect-loop-between-my-application-and-auth0)
5. [Preserve application state through redirects](#5-preserve-application-state-through-redirects)

## 1. User is not logged in after page refresh

There are usually 3 reasons for this:

**1. The user logged in with a Social Provider (like Google) and you are using the Auth0 Developer Keys**

If you are using the [Classic Universal Login](https://auth0.com/docs/universal-login/classic) experience, [Silent Authentication](https://auth0.com/docs/authorization/configure-silent-authentication) won't work on the `/authorize` endpoint. This library uses Silent Authentication internally to check if a user is already signed in after page refresh, so that won't work either. You should either change to the [New Universal Login](https://auth0.com/docs/universal-login/new-experience) experience or [add your own keys](https://auth0.com/docs/connections/identity-providers-social) to that particular social connection.

**2. You are using a browser like Safari or Brave that has Intelligent Tracking Prevention turned on by default**

In this case Silent Authentication will not work because it relies on a hidden iframe being logged in to a different domain (usually `auth0.com`) and browsers with ITP do not allow third-party (eg iframed) cookies. There are 2 workarounds for this using [Rotating Refresh Tokens](https://auth0.com/docs/tokens/refresh-tokens/refresh-token-rotation) or [Custom Domains](https://auth0.com/docs/custom-domains)

**3. You are using Multifactor Authentication**

In this case, when your users are not *remembering this device for 30 days*, Silent Authentication will not work because it can not get past the MFA step without the user's interaction. The consequence of it is that on both a page refresh as well as when trying to renew an expired Access Token, our SDK will throw a `Multifactor authentication required` error.

- On page load, catch this error and redirect the user to Auth0 by calling `loginWithRedirect`, prompting the user with MFA.
- Ensure you can renew access tokens without relying on Silent Authentication by using [Rotating Refresh Tokens](https://auth0.com/docs/tokens/refresh-tokens/refresh-token-rotation).

Because our SDK persists tokens in memory by default, refreshing the page relies on Auth0 side to restore our session. If you combine [Rotating Refresh Tokens](https://auth0.com/docs/tokens/refresh-tokens/refresh-token-rotation) with [localstorage](https://github.com/auth0/auth0-spa-js#user-content-data-caching-options), calling `loginWithRedirect` on page load should not be necessary.

```ts
AuthModule.forRoot({
  domain: 'YOUR_AUTH0_DOMAIN',
  clientId: 'YOUR_AUTH0_CLIENT_ID',
  useRefreshTokens: true,
  cacheLocation: 'localstorage'
}),
```

**Important**: This feature will allow the caching of data such as ID and access tokens to be stored in local storage. Exercising this option changes the security characteristics of your application and should not be used lightly. Extra care should be taken to mitigate against XSS attacks and minimize the risk of tokens being stolen from local storage.

## 2. User is not logged in after successful sign in with redirect

If after successfully logging in, your user returns to your SPA and is still not authenticated, do _not_ refresh the page - go to the Network tab on Chrome and confirm that the POST to `oauth/token` resulted in an error `401 Unauthorized`. If this is the case, your tenant is most likely misconfigured. Go to your **Application Properties** in your application's settings in the [Auth0 Dashboard](https://manage.auth0.com) and make sure that `Application Type` is set to `Single Page Application` and `Token Endpoint Authentication Method` is set to `None` (**Note:** there is a known issue with the Auth0 "Default App", if you are unable to set `Token Endpoint Authentication Method` to `None`, create a new Application of type `Single Page Application` or see the advice in [auth0-react/issues/93](https://github.com/auth0/auth0-react/issues/93#issuecomment-673431605))

## 3. User is redirected to `/` after successful sign in with redirect

By default, the SDK is configured to redirect the user back to the root of the application after succesfully exchanging the `code` for the corresponding token(s).

This is what a typical default flow looks like:

- AuthModule is configured with a specific redirectUrl (e.g. `http://localhost:4200/callback`).
- User initiates login by calling `AuthService.loginWithRedirect()`
- User is redirected to Auth0, including a `redirectUri` (in this case `http://localhost:4200/callback`)
- After succesful authentication, the user is redirected back to the provided redirectUri, including a `code` and `state` query parameter (in this case `http://localhost:4200/callback?code={code}&state={state}`)
- The configured `redirectUri` is only used to process `code` and `state` in order to retrieve an actual token.
- The user is then redirected to `/`

However, if the user should not be redirected back to `/` in the very last step, but instead they should end up at a different URL, this can be configured by providing that information to `AuthService.loginWithRedirect()`:

```
this.authService.loginWithRedirect({
  appState: { target: '/some-url' }
});
```

By doing that, in the very last step the SDK will not redirect the user back to `/`, but to `/some-url` instead.

**Restoring querystring parameters**

The same approach can be used in order to restore application specific querystring parameters that need to be restored after being redirected back to your application.

```
this.authService.loginWithRedirect({
 appState: { target: '/some-url?query=value' }
});
```

## 4. Getting an infinite redirect loop between my application and Auth0

In situations where the `redirectUri` points to a _protected_ route, your application will end up in an infinite redirect loop between your application and Auth0.

The `redirectUri` should always be a **public** route in your application (even if the entire application is secure, our SDK needs a public route to be redirected back to). This is because, when redirecting back to the application, there is no user information available yet. The SDK first needs to process the URL (`code` and `state` query parameters) and call Auth0's endpoints to exchange the code for a token. Once that is successful, the user is considered authenticated.

## 5. Preserve application state through redirects

To preserve application state through the redirect to Auth0 and the subsequent redirect back to your application (if the user authenticates successfully), you can pass in the state that you want preserved to the `loginWithRedirect` method:

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

  loginWithRedirect(): void {
    this.auth.loginWithRedirect({
      appState: {
        myValue: 'My State to Preserve',
      },
    });
  }
}
```

After Auth0 redirects the user back to your application, you can access the stored state using the `appState$` observable on the `AuthService`:

```ts
import { Component, OnInit } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  constructor(public auth: AuthService) {}

  ngOnInit() {
    this.auth.appState$.subscribe((appState) => {
      console.log(appState.myValue);
    });
  }
}
```

> By default, this method of saving application state will store it in Session Storage; however, if `useCookiesForTransactions` is set, a Cookie will be used instead.

> This information will be removed from storage once the user is redirected back to your application after a successful login attempt (although it will continue to be accessible on the `appState$` observable).
