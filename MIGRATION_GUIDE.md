# Auth0-Angular v2 Migration Guide
With the v2 release of Auth0-Angular, we have improved both the performance and developer experience by incorporating Auth0-SPA-JS v2 while trying to limit the amount of breaking changes. However, as with any major version bump, v2 of Auth0-Angular contains a set of breaking changes. 

Please review this guide thoroughly to understand the changes required to migrate your application to v2.

- [Polyfills and supported browsers](#polyfills-and-supported-browsers)
- [Public API changes](#public-api-changes)
  - [Introduction of authorizationParams](#introduction-of-authorizationparams)
  - [Introduction of logoutParams](#introduction-of-logoutparameters)
  - [buildAuthorizeUrl has been removed](#buildauthorizeurl-has-been-removed)
  - [buildLogoutUrl has been removed](#buildlogouturl-has-been-removed)
  - [redirectMethod has been removed from loginWithRedirect](#redirectmethod-has-been-removed-from-loginwithredirect)
  - [localOnly has been removed from logout](#localonly-has-been-removed-from-logout)
  - [ignoreCache on getTokenSilentlyhas been replaced by cacheMode](#ignorecache-on-gettokensilentlyhas-been-replaced-by-cachemode)
  - [application/x-www-form-urlencoded is used by default instead of application/json](#applicationx-www-form-urlencoded-is-used-by-default-instead-of-applicationjson)
  - [No more iframe fallback by default when using refresh tokens](#no-more-iframe-fallback-by-default-when-using-refresh-tokens)
  - [getUser and getIdTokenClaims have been removed](#getuser-and-getidtokenclaims-have-been-removed)
  - [Changes to default scopes (profile and email)](#changes-to-default-scopes-profile-and-email)
    - [advancedOptions and defaultScope are removed](#advancedoptions-and-defaultscope-are-removed)

## Polyfills and supported browsers

As [Microsoft has dropped support for IE11](https://blogs.windows.com/windowsexperience/2022/06/15/internet-explorer-11-has-retired-and-is-officially-out-of-support-what-you-need-to-know), Auth0-SPA-JS v2 no longer includes any polyfills in its bundle, as all of these polyfills were for IE11. Therefore <u>the Auth0-Angular SDK, which uses Auth0-SPA-JS internally, no longer support IE11 as of v2</u>. 

> :information_source: With Angular having dropped support for IE itself in Angular 13, and Angular 13 currently being the lowest supported version of Angular, this shouldn't impact any application that's using a version supported by the Angular team.

The following is the list of polyfills that got removed. If you would need any of these, you will need to include these in your application.

- [AbortController](https://www.npmjs.com/package/abortcontroller-polyfill): Used to polyfill [AbortController on IE11, Opera Mini, and some mobile-specific browsers](https://caniuse.com/?search=abortcontroller).
- [Promise](https://www.npmjs.com/package/promise-polyfill): Used to polyfill [Promise on IE11 and Opera Mini](https://caniuse.com/promises)
- [Core-js](https://www.npmjs.com/package/core-js): Used to polyfill a couple of things, also mostly on IE11, Opera Mini, and some mobile-specific browsers:
  - [string/startsWith](https://caniuse.com/?search=startsWith)
  - [string/includes](https://caniuse.com/es6-string-includes)
  - [set](https://caniuse.com/mdn-javascript_builtins_set)
  - [symbol](https://caniuse.com/mdn-javascript_builtins_symbol)
  - [array/from](https://caniuse.com/mdn-javascript_builtins_array_from)
  - [array/includes](https://caniuse.com/array-includes)
- [fast-text-encoding](https://www.npmjs.com/package/fast-text-encoding): Used to polyfill TextEncoder and TextDecoder on IE11 and Opera Mini.
- [unfetch](https://www.npmjs.com/package/unfetch): Used to [ponyfill fetch on IE11](https://caniuse.com/?search=fetch).

Because of this, we have <u>dropped 60% in bundle size</u> for Auth0-SPA-JS, which is a core dependency of the Auth0-Angular SDK. Ensuring your users have a better experience when integrating Auth0 using the Auth0-Angular SDK.

## Public API Changes

With the release of this new major version, a couple of changes were made that affect the public API of the Auth0-Angular SDK. Most of these should be noticed by TypeScript. However, it’s advised to take the time to go through this list thoroughly.

### Introduction of `authorizationParams`

A breaking change that will affect pretty much everyone is the introduction of `authorizationParams`, a more structured approach to providing parameters - including custom parameters - to Auth0.

In v1, objects passed to our methods are always a mix of properties used for configuring the SDK and properties with the sole purpose to pass through to Auth0.

```ts
@NgModule({
  // ...
  imports: [
    AuthModule.forRoot({
      domain: '',
      clientId: '',
      audience: '',
      redirectUri: ''
    }),
  ],
  // ...
})
export class AppModule {}
```
```ts
@Component({ /* ... */ })
export class AppComponent {
  constructor(public auth: AuthService) {}

  loginWithRedirect() {
    this.auth.loginWithRedirect({
      appState: {
        key: value // state to restore when getting redirected back
      }
      screen_hint: 'signup', // 1st-class property to send to Auth0
      any_custom_property: 'value' // Any additional custom property to send to Auth0
    });
  }
```

With v2 of our SDK, we have improved the API by separating those properties used to configure the SDK, from properties that are sent to Auth0. The SDK configuration properties will stay on the root, while any property that should be sent to Auth0 should be set on `authorizationParams`.

```ts
@NgModule({
  // ...
  imports: [
    AuthModule.forRoot({
      domain: '',
      clientId: '',
      authorizationParams: {
        audience: '',
        redirect_uri: ''
      }
    }),
  ],
  // ...
})
export class AppModule {}
```
```ts
@Component({ /* ... */ })
export class AppComponent {
  constructor(public auth: AuthService) {}

  loginWithRedirect() {
    this.auth.loginWithRedirect({
      appState: {
        key: value // state to restore when getting redirected back
      },
      authorizationParams: {
        screen_hint: 'signup',
        any_custom_property: 'value'
      }
    });
  }
```

The above changes affect the following methods:

- loginWithRedirect
- loginWithPopup
- getAccessTokenWithPopup
- getAccessTokenSilently

If you are using any of the above methods in your application(s), ensure to update all of these as mentioned above.

### Introduction of `logoutParams`

In v1 of the SDK, `logout` can be called with an object containing a number of properties, both a mix between properties used to configure the SDK as well as those used to pass through to Auth0.

With v2, logout now takes an object that can only contain three properties, `clientId`, `onRedirect` and `logoutParams`.

Any property, apart from clientId, that you used to set on the root of the object passed to `logout` should now be set on `logoutParams` instead.

```ts
@Component({ /* ... */ })
export class AppComponent {
  constructor(public auth: AuthService) {}

  logout() {
    this.auth.logout({
      clientId: '',
      logoutParams: {
        federated: true / false,
        returnTo: '',
        any_custom_property: 'value'
      }
    });
  }
```

### `buildAuthorizeUrl` has been removed

In v1, we introduced `buildAuthorizeUrl` for applications that couldn’t rely on `window.location.assign` to redirect to Auth0 when calling `loginWithRedirect`, a typical example is for people using v1 of our SDK with Ionic:

```ts
@Component({ /* ... */ })
export class LoginComponent {
  constructor(public auth: AuthService) {}

  login() {
    this.auth
      .buildAuthorizeUrl()
      .pipe(mergeMap((url) => Browser.open({ url, windowName: '_self' })))
      .subscribe();
  }
}
```

With v2, we have removed `buildAuthorizeUrl`. This means that the snippet above will no longer work, and you should update your code by using `openUrl` instead.

```ts
@Component({ /* ... */ })
export class LoginComponent {
  constructor(public auth: AuthService) {}

  login() {
    this.auth
      .loginWithRedirect({
        openUrl: (url) => Browser.open({ url, windowName: '_self' })
      })
      .subscribe();
  }
}
```

The above snippet aligns more with the intent, using our SDK to login but relying on Capacitor (or any other external browser) to do the actual redirect.

### `buildLogoutUrl` has been removed

In v1, we introduced `buildLogoutUrl` for applications that are unable to use `window.location.assign` when logging out from Auth0, a typical example is for people using v1 of our SDK with Ionic:

```ts
@Component({ /* ... */ })
export class LogoutComponent {
  constructor(public auth: AuthService) {}

   logout() {
    this.auth
      .buildLogoutUrl({ returnTo: '...' })
      .pipe(
        tap((url) => {
          this.auth.logout({ localOnly: true });
          Browser.open({ url });
        })
      )
      .subscribe();
  }
}
```

With v2, `buildLogoutUrl` has been removed and you should update any code that is not able to rely on `window.location.assign` to use `openUrl` when calling `logout`:

```ts
@Component({ /* ... */ })
export class LogoutComponent {
  constructor(public auth: AuthService) {}

   logout() {
    this.auth
      .logout({
        openUrl: (url)=> Browser.open({ url })
      })
      .subscribe();
  }
}
```

This method was removed because, when using our SDK, the logout method is expected to be called regardless of the browser used. Instead of calling both `logout` and `buildLogoutUrl`, you can now change the redirect behaviour when calling `logout`.

### `redirectMethod` has been removed from `loginWithRedirect`

In v1, `loginWithRedirect` takes a `redirectMethod` that can be set to any of `assign` and `replace`, allowing the users to control whether the SDK should redirect using `window.location.assign` or `window.location.replace`.

```ts
this.auth.loginWithRedirect({
  redirectMethod: 'replace'
});
```

With the release of v2, we have removed `redirectMethod`. If you want to use anything but `window.location.assign` to handle the redirect to Auth0, you should implement `onRedirect`:

```ts
this.auth.loginWithRedirect({
  openUrl: (url) => {
    // Open url in the browser
  }
});
```

### `localOnly` has been removed from `logout`

In v1, `logout` took a `localOnly` option to prevent logging the user out of Auth0 when logging out from your application.

```ts
this.auth.logout({
  localOnly: true
});
```

With v2, we have removed the `localOnly` options, instead you should set `openUrl` to `false`:

```ts
this.auth.logout({
  openUrl: false
});
```

### `ignoreCache` on `getAccessTokenSilently` has been replaced by `cacheMode`

In v1, users can bypass the cache when calling `getAccessTokenSilently` by passing `ignoreCache: true`.

```ts
this.auth.getAccessTokenSilently({ ignoreCache: true }).subscribe(token => { /* ... */ });
```

With v2, we wanted to add the ability to only retrieve a token from the cache, without contacting Auth0 if no token was found. To do so, we have removed the `ignoreCache` property and replaced it with `cacheMode` that can take any of the following three values:

- **on** (default): read from the cache caching, but fall back to Auth0 as needed
- **off**: ignore the cache, instead always call Auth0
- **cache-only**: read from the cache, don’t fall back to Auth0

Any code that was previously using `ignoreCache: true` should be changed to use `cacheMode: 'off'`:

```ts
this.auth.getAccessTokenSilently({ cacheMode: 'off' }).subscribe(token => { /* ... */ });
```

### `application/x-www-form-urlencoded` is used by default instead of `application/json`

Auth0’s token endpoint supports both `application/x-www-form-urlencoded` and `application/json` content types. However, using `application/x-www-form-urlencoded` provides a small performance benefit.

In v1 of the SDK, the default was to send request to /oauth/token using json, allowing to opt-in to use x-www-form-urlencoded by setting the `useFormData` flag to _true_.

With v2, we have flipped the default value for `useFormData` to **true**, meaning we will be sending requests to Auth0’s token endpoint using `application/x-www-form-urlencoded` as the content type by default.

> :warning: This can affect existing rules and actions, and it’s important to ensure all your actions still work as expected after upgrading to v2.
> To restore the original behaviour, you can set `useFormData` to **false**, and your rules and actions should continue to work as before.

### No more iframe fallback by default when using refresh tokens

When using refresh tokens in v1, we fall back to using iframes whenever a refresh token exchange would fail. This has caused problems before in environments that do not support iframes, and we have specifically introduced `useRefreshTokensFallback` to be able to opt-out of falling back to iframes in the case a refresh_grant fails.

With v2, we have flipped the default value for `useRefreshTokensFallback` to false so we do not fall back to using iframes by default when `useRefreshTokens` is `true`, and the refresh token exchange fails.

If you want to restore the original behaviour, and still fall back to iframes when the refresh token exchange fails, you can set `useRefreshTokensFallback` to true.

### `getUser` and `getIdTokenClaims` have been removed

With v1 of our SDK, both `getUser` and `getIdTokenClaims` supported optional audience and scope parameters when retrieving the user profile.

```ts
this.auth.getUser().subscribe(user => { /* ... */ });
this.auth.getUser({ audience, scope }).subscribe(user => { /* ... */ });

this.auth.getIdTokenClaims().subscribe(claims => { /* ... */ });
this.auth.getIdTokenClaims({ audience, scope }).subscribe(claims => { /* ... */ });
```

As an application should only have one user, it makes little sense to be passing these parameters when trying to retrieve the current user.

With v2, both `getUser` and `getIdTokenClaims` have been removed, and should be replaced by the corresponding Observables.

```ts
this.auth.user$.subscribe(user => { /* ... */ });

this.auth.idTokenClaims$.subscribe(claims => { /* ... */ });
```

### Changes to default scopes (profile and email)

Our SDK defaults to requesting `openid profile email` as the scopes. However, when the user explicitly sets the `scope` when configuring the SDK by importing the `AuthModule`, v1 would still include `openid profile email` as well.

With v2, we have reworked this to still default to `openid profile email` when the scope property has been omitted, but only include `openid` when the user sets a scope explicitly.

This means that the following code in v1:

```ts
AuthModule.forRoot({
  scope: 'scope1'
})
```

Needs to be updated to explicitly include the `profile email` scopes to achieve the same in v2:

```ts
AuthModule.forRoot({
  scope: 'profile email scope1'
})
```

#### advancedOptions and defaultScope are removed

With v1 of our SDK, users can set both `scope: '...'` and `advancedOptions: { defaultScope: '...' }` when configuring the SDK by importing the ``AuthModule`. As this has proven to be confusing, with v2 we have decided to drop `defaultScope` altogether. As this was its own property, we have also removed `advancedOptions`. Any code that used to rely on `defaultScope` will need to move those scopes into `scope` instead:

```ts
AuthModule.forRoot({
  advancedOptions: { defaultScope: 'email' }
  scope: 'scope1'
})
```

Will need to move those scopes into `scope` instead:

```ts
AuthModule.forRoot({
  scope: 'email scope1'
}),
```

As you can see, `scope` becomes a merged value of the previous `defaultScope` and `scope`.
