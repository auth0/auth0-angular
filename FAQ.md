# Frequently Asked Questions

**Note:** `auth0-angular` uses [Auth0 SPA JS](https://github.com/auth0/auth0-spa-js) behind the scenes, so be sure to check [their FAQs](https://github.com/auth0/auth0-spa-js/blob/master/FAQ.md) too.

1. [User is not logged in after page refresh](#1-user-is-not-logged-in-after-page-refresh)
2. [User is not logged in after successful sign in with redirect](#2-user-is-not-logged-in-after-successful-sign-in-with-redirect)
3. [User is redirected to `/` after successful sign in with redirect](#3-user-is-redirected-to--after-successful-sign-in-with-redirect)
4. [Getting an infinite redirect loop between my application and Auth0](#4-getting-an-infinite-redirect-loop-between-my-application-and-auth0)
5. [Preserve application state through redirects](#5-preserve-application-state-through-redirects)
6. [Using multiple oauth providers](#6-using-multiple-oauth-providers)
7. [Using the SDK with Angular Universal](#7-using-the-sdk-with-angular-universal)
8. [Retrieving and refreshing a token](#8-retrieving-and-refreshing-a-token)
9. [When using localOnly logout, the user is getting logged in again](#9-when-using-localonly-logout-the-user-is-getting-logged-in-again)

## 1. User is not logged in after page refresh

There are usually 3 reasons for this:

**1. The user logged in with a Social Provider (like Google) and you are using the Auth0 Developer Keys**

If you are using the [Classic Universal Login](https://auth0.com/docs/universal-login/classic) experience, [Silent Authentication](https://auth0.com/docs/authorization/configure-silent-authentication) won't work on the `/authorize` endpoint. This library uses Silent Authentication internally to check if a user is already signed in after page refresh, so that won't work either. You should either change to the [New Universal Login](https://auth0.com/docs/universal-login/new-experience) experience or [add your own keys](https://auth0.com/docs/connections/identity-providers-social) to that particular social connection.

**2. You are using a browser like Safari or Brave that has Intelligent Tracking Prevention turned on by default**

In this case Silent Authentication will not work because it relies on a hidden iframe being logged in to a different domain (usually `auth0.com`) and browsers with ITP do not allow third-party (eg iframed) cookies. There are 2 workarounds for this using [Rotating Refresh Tokens](https://auth0.com/docs/tokens/refresh-tokens/refresh-token-rotation) or [Custom Domains](https://auth0.com/docs/custom-domains)

**3. You are using Multifactor Authentication**

In this case, when your users are not _remembering this device for 30 days_, Silent Authentication will not work because it can not get past the MFA step without the user's interaction. The consequence of it is that on both a page refresh as well as when trying to renew an expired Access Token, our SDK will throw a `Multifactor authentication required` error.

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

By default, the SDK is configured to redirect the user back to the root of the application after successfully exchanging the `code` for the corresponding token(s).

This is what a typical default flow looks like:

- `AuthModule` is configured with a specific `redirect_url` (e.g. `http://localhost:4200/callback`).
- User initiates login by calling `AuthService.loginWithRedirect()`
- User is redirected to Auth0, including a `redirect_uri` (in this case `http://localhost:4200/callback`)
- After successful authentication, the user is redirected back to the provided `redirect_uri`, including a `code` and `state` query parameter (in this case `http://localhost:4200/callback?code={code}&state={state}`)
- The configured `redirect_uri` is only used to process `code` and `state` to retrieve an actual token.
- The user is then redirected to `/`

However, if the user should not be redirected back to `/` in the very last step, but instead end up at a different URL, you should provide that URL when calling `AuthService.loginWithRedirect()` through the `appState.target` property:

```
this.authService.loginWithRedirect({
  appState: { target: '/some-url' }
});
```

By doing that, in the very last step the SDK will not redirect the user back to `/`, but to `/some-url` instead.

> This is done by our `AuthGuard` automatically, as it ensures the user ends up back at the protected route after being authenticated if needed.

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

## 6. Using multiple OAuth providers

If your application uses multiple OAuth providers, you may need to use multiple callback paths as well, one for each OAuth provider.
To ensure the SDK does not process the callback for any provider other than Auth0, configure the AuthModule by setting the `skipRedirectCallback` property as follows:

```js
AuthModule.forRoot({
  skipRedirectCallback: window.location.pathname === '/other-callback',
});
```

**Note**: In the above example, `/other-callback` is an existing route that will be called by any other OAuth provider with a `code` (or `error` in case something went wrong) and `state`.

## 7. Using the SDK with Angular Universal

This library makes use of the `window` object in a couple of places during initialization, as well as `sessionStorage` in the underlying Auth0 SPA SDK, and thus [will have problems](https://github.com/angular/universal/blob/master/docs/gotchas.md#window-is-not-defined) when being used in an Angular Universal project. The recommendation currently is to only import this library into a module that is to be used in the browser, and omit it from any module that is to participate in a server-side environment.

See [Guards, and creating separate modules](https://github.com/angular/universal/blob/master/docs/gotchas.md#strategy-2-guards) in the Angular Universal "Gotchas" document.

## 8. Retrieving and refreshing a token

Access tokens are used to add to the `Authorization` header when calling a protected API. You can do this manually, or rely on our SDK to do this for you.
We recommend relying on our SDK as explained in [our examples on calling an API](https://github.com/auth0/auth0-angular/blob/master/EXAMPLES.md#call-an-api).
Our SDK will store the tokens internally, and refresh any token when needed. This means you don't have to worry about refreshing any of those tokens manually when you are using our `AuthHttpInterceptor`.

If you have the need to retrieve or refresh the token manually, you can do so by calling `getAccessTokenSilently()`. Doing so will automatically try and refresh the token if it couldn't find a valid one in our internal cache.

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

  getToken() {
    this.auth.getAccessTokenSilently().subscribe((token) => {
      console.log(token);
    });
  }
}
```

To force refreshing the token, you can bypass our internal cache by setting `ignoreCache` to true when calling `getAccessTokenSilently`:

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

  getToken() {
    this.auth
      .getAccessTokenSilently({ ignoreCache: true })
      .subscribe((token) => {
        console.log(token);
      });
  }
}
```

## 9. When using localOnly logout, the user is getting logged in again

When only logging the user out of the SDK, and not from Auth0, you might stumble upon behavior that automatically logs the user in again.

Even though it might not feel like it at first, this is expected, and a side-effect of the fact that our SDK focuses on logging in the user as soon as we can.

The key players that can result in the above behavior are the SDK's `AuthGuard` and `AuthHttpInterceptor`.

### AuthGuard

When you are making use of `localOnly` logout, you probably don't want to use our AuthGuard, whose sole purpose is to log the user in automatically if there currently is no user. This can happen automatically and without the user noticing much of it. It relies on an existing session with Auth0 and will always log the user in again as long as there is an active session with Auth0.

Instead, you might want to use a guard that only blocks routing based on the `isAuthenticated` observable rather than doing anything to ensure the user is logged in automatically:

```ts
@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.auth.isAuthenticated$;
  }
}
```

### AuthHttpInterceptor

The purpose of the `AuthHttpInterceptor` is to attach a token to the request when making any calls using Angular's `HttpClient`. The convenience of this interceptor comes from the fact that it automatically refreshes any expired token. The side-effect of that is that it also fetches a new token if we cleared the local cache using `localOnly` logout.

If this effect is not desired, you want to ensure you avoid doing any calls that trigger the interceptor when the user is not authenticated in the first place.

An alternative could be to decorate the SDK's `AuthHttpInterceptor` to ensure it doesn't get triggered when the user isn't authenticated (or any other condition that with fit your use-case):

```ts
@Injectable()
export class MyAuthHttpInterceptor implements HttpInterceptor {
  constructor(
    private authService: AuthService,
    private authHttpInterceptor: AuthHttpInterceptor
  ) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return this.authService.isAuthenticated$.pipe(
      take(1),
      mergeMap((isAuthenticated) =>
        iif(
          () => isAuthenticated,
          this.authHttpInterceptor.intercept(req, next),
          next.handle(req)
        )
      )
    );
  }
}
```

Important is that the SDK's `AuthHttpInterceptor` is now to be registered as a service, and not as an interceptor. Instead, your custom interceptor should be configured as one of the interceptors, and it will make use of `AuthHttpInterceptor` internally.

```ts
providers: [
    AuthHttpInterceptor,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: MyAuthHttpInterceptor,
      multi: true,
    }
  ],
```

## 10. How can I skip the Auth0 login page?

When integrating with third party providers such as Google or Microsoft, being redirected to Auth0 before being redirected to the corresponding provider can be sub-optimal in terms of user-experience.
If you only have a single connection enabled, or you know up front how the user wants to authenticate, you can set the `connection` parameter when calling `loginWithRedirect()` or `loginWithPopup`:

```
this.auth.loginWithRedirect({
  // ...
  authorizationParams: {
    connection: 'connection_logical_identifier'
  }
})
```

Doing so for connections such as Google or Microsoft, would automatically redirect you to them instead of showing the Auth0 login page first.

Additionally, if you are using our AuthGuard, you may want it to pick up the same connection when it would redirect for login. To do so, you should provide the `connection` property when configuring Auth0:

```
bootstrapApplication(AppComponent, {
  providers: [
    provideAuth0({ 
      authorizationParams: { 
        connection: 'connection_logical_identifier' 
      }
    }),
  ]
});
```
