# Examples using auth0-angular

- [Add login to your application](#add-login-to-your-application)
- [Add logout to your application](#add-logout-to-your-application)
- [Checking if a user is authenticated](#checking-if-a-user-is-authenticated)
- [Display the user profile](#display-the-user-profile)
- [Protect a route](#protect-a-route)
- [Call an API](#call-an-api)
- [Handling errors](#handling-errors)
- [Organizations](#organizations)
- [Device-bound tokens with DPoP](#device-bound-tokens-with-dpop)
- [Standalone Components and a more functional approach](#standalone-components-and-a-more-functional-approach)
- [Connect Accounts for using Token Vault](#connect-accounts-for-using-token-vault)

## Add login to your application

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

By default the application will ask Auth0 to redirect back to the root URL of your application after authentication. This can be configured by setting the [redirectUri](https://auth0.github.io/auth0-angular/interfaces/auth_config.AuthConfig.html#redirectUri) option.

## Add logout to your application

To log the user out of your application, call the `logout` method on `AuthService` from anywhere inside your application, such as a component:

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

  logout() {
    this.auth.logout();
  }
```

## Checking if a user is authenticated

The `isAuthenticated$` observable on `AuthService` emits true or false based on the current authentication state. You can use this observable to make any decisions based on whether or not the user is authenticated, such as only showing the login button when the user is not logged in yet, and the logout button only when the user is logged in.

```ts
<ng-container
  *ngIf="auth.isAuthenticated$ | async; then loggedIn; else loggedOut">
</ng-container>

<ng-template #loggedIn>
  <button (click)="logout()">
    Log out
  </button>
</ng-template>

<ng-template #loggedOut>
  <button (click)="loginWithRedirect()">
    Log in
  </button>
</ng-template>
```

## Display the user profile

Access the `user$` observable on the `AuthService` instance to retrieve the user profile. This observable already heeds the `isAuthenticated$` observable, so you do not need to check if the user is authenticated before using it:

```ts
import { Component } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';

@Component({
  selector: 'app-profile',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class ProfileComponent {
  user$ = this.auth.user$;

  constructor(public auth: AuthService) {}
```

You can then access the component's `user$` observable from within your template.

```html
<ul *ngIf="user$ | async as user">
  <li>{{ user.name }}</li>
  <li>{{ user.email }}</li>
</ul>
```

## Protect a route

To ensure that a route can only be visited by authenticated users, add the built-in `AuthGuard` type to the `canActivate` property on the route you wish to protect.

If an unauthenticated user tries to access this route, they will first be redirected to Auth0 to log in before returning to the URL they tried to get to before login:

```ts
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HomeComponent } from './unprotected/unprotected.component';
import { ProtectedComponent } from './protected/protected.component';
import { AuthGuard } from '@auth0/auth0-angular';

const routes: Routes = [
  {
    path: 'protected',
    component: ProtectedComponent,
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

## Call an API

The SDK provides an `HttpInterceptor` that automatically attaches access tokens to outgoing requests when using the built-in `HttpClient`. However, you must provide configuration that tells the interceptor which requests to attach access tokens to.

### Specify the audience

In order for Auth0 to be able to issue tokens for a specific API, we need to configure the Audience to inform Auth0 about the API in question. Set the `audience`, when calling `AuthModule.forRoot()`, to the **API Identifier** of the API from within your Auth0 dashboard.

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
        audience: 'YOUR_AUTH0_API_IDENTIFIER',
      },
    }),
  ],
  // ...
})
export class AppModule {}
```

### Register AuthHttpInterceptor

First, register the interceptor with your application module, along with the `HttpClientModule`.

```ts
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthHttpInterceptor } from '@auth0/auth0-angular';

@NgModule({
  // ...
  imports: [
    HttpClientModule,
    AuthModule.forRoot(...),
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthHttpInterceptor, multi: true },
  ],
  // ...
})
```

Note: We do not do this automatically for you as we want you to be explicit about including this interceptor. Also, you may want to chain this interceptor with others, making it hard for us to place it accurately.

### Configure AuthHttpInterceptor to attach access tokens

Next, tell the SDK which requests to attach access tokens to in the SDK configuration. These are matched on the URL by using a string, a regex, or more complex object that also allows you to specify the configuration for fetching tokens by setting the `tokenOptions` property.

If an HTTP call is made using `HttpClient` and there is no match in this configuration for that URL, then the interceptor will simply be bypassed and the call will be executed without a token attached in the `Authorization` header.

Note: We do this to help prevent tokens being unintentionally attached to requests to the wrong recipient, which is a serious security issue. Those recipients could then use that token to call the API as if it were your application.

In the event that requests should be made available for both anonymous and authenticated users, the `allowAnonymous` property can be set to `true`. When omitted, or set to `false`, requests that match the configuration, will not be executed when there is no access token available.

Here are some examples:

```ts
import { HttpMethod } from '@auth0/auth0-angular';

// Modify your existing SDK configuration to include the httpInterceptor config
AuthModule.forRoot({
  ...
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
          authorizationParams: {
            audience: 'http://my-api/',
            scope: 'read:accounts',
          }
        },
      },

      // Matching on HTTP method
      {
        uri: '/api/orders',
        httpMethod: HttpMethod.Post,
        tokenOptions: {
          authorizationParams: {
            audience: 'http://my-api/',
            scope: 'write:orders',
          }
        },
      },

      // Using an absolute URI
      {
        uri: 'https://your-domain.auth0.com/api/v2/users',
        tokenOptions: {
          authorizationParams: {
            audience: 'https://your-domain.com/api/v2/',
            scope: 'read:users',
          }
        },
      },
    ],
  },
});
```

**Note:** Under the hood, tokenOptions is passed as-is to [the getTokenSilently method](https://auth0.github.io/auth0-spa-js/classes/Auth0Client.html#getTokenSilently) on the underlying SDK, so all the same options apply here.

**Uri matching**

If you need more fine-grained control over the URI matching, you can provide a callback function to the `uriMatcher` property that takes a single `uri` argument (being [HttpRequest.url](https://angular.io/api/common/http/HttpRequest#url)) and returns a boolean. If this function returns true, then an access token is attached to the request in the ["Authorization" header](https://tools.ietf.org/html/draft-ietf-oauth-v2-bearer-20#section-2.1). If it returns false, the request proceeds without the access token attached.

```ts
AuthModule.forRoot({
  // ...
  httpInterceptor: {
    allowedList: [
      {
        uriMatcher: (uri) => uri.indexOf('/api/orders') > -1,
        httpMethod: HttpMethod.Post,
        tokenOptions: {
          authorizationParams: {
            audience: 'http://my-api/',
            scope: 'write:orders',
          },
        },
      },
    ],
  },
});
```

You might want to do this in scenarios where you need the token on multiple endpoints, but want to exclude it from only a few other endpoints. Instead of explicitly listing all endpoints that do need a token, a uriMatcher can be used to include all but the few endpoints that do not need a token attached to its requests.

## Handling errors

Whenever the SDK fails to retrieve an Access Token, either as part of the above interceptor or when manually calling `AuthService.getAccessTokenSilently` and `AuthService.getAccessTokenWithPopup`, it will emit the corresponding error in the `AuthService.error$` observable.

If you want to react to these errors, subscribe to the `error$` observable and act accordingly.

```ts
ngOnInit() {
  this.authService.error$.subscribe(error => {
    // Handle Error here
  });
}
```

A common reason you might want to handle the above errors, emitted by the `error$` observable, is to re-login the user when the SDK throws a `login_required` error.

```ts
ngOnInit() {
  this.authService.error$.pipe(
    filter((e) => e instanceof GenericError && e.error === 'login_required'),
    mergeMap(() => this.authService.loginWithRedirect())
  ).subscribe();
}
```

## Organizations

[Organizations](https://auth0.com/docs/organizations) is a set of features that provide better support for developers who build and maintain SaaS and Business-to-Business (B2B) applications.

Note that Organizations is currently only available to customers on our Enterprise and Startup subscription plans.

### Log in to an organization

Log in to an organization by specifying the `organization` parameter importing the `AuthModule`:

```
AuthModule.forRoot({
  domain: 'YOUR_AUTH0_DOMAIN',
  clientId: 'YOUR_AUTH0_CLIENT_ID',
  authorizationParams: {
    organization: 'YOUR_ORGANIZATION_ID_OR_NAME'
  }
}),
```

You can also specify the organization when logging in:

```
// Using a redirect
this.auth.loginWithRedirect({
  authorizationParams: {
    organization: 'YOUR_ORGANIZATION_ID_OR_NAME'
  }
});

// Using a popup window
this.auth.loginWithPopup({
  authorizationParams: {
    organization: 'YOUR_ORGANIZATION_ID_OR_NAME'
  }
});
```

### Accept user invitations

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
      authorizationParams: {
        organization,
        invitation
      }
    });
  }
}
```

## Device-bound tokens with DPoP

**Demonstrating Proof-of-Possession** —or simply **DPoP**— is a recent OAuth 2.0 extension defined in [RFC9449](https://datatracker.ietf.org/doc/html/rfc9449).

It defines a mechanism for securely binding tokens to a specific device using cryptographic signatures. Without it, **a token leak caused by XSS or other vulnerabilities could allow an attacker to impersonate the real user.**

To support DPoP in `auth0-angular`, some APIs available in modern browsers are required:

- [Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Crypto): allows to create and use cryptographic keys, which are used to generate the proofs (i.e. signatures) required for DPoP.

- [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API): enables the use of cryptographic keys [without exposing the private material](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto#storing_keys).

The following OAuth 2.0 flows are currently supported by `auth0-angular`:

- [Authorization Code Flow](https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow) (`authorization_code`).

- [Refresh Token Flow](https://auth0.com/docs/secure/tokens/refresh-tokens) (`refresh_token`).

> [!IMPORTANT]
> Currently, only the `ES256` algorithm is supported.

### Enabling DPoP

DPoP is disabled by default. To enable it, set the `useDpop` option to `true` when configuring the SDK. For example:

```ts
import { NgModule } from '@angular/core';
import { AuthModule } from '@auth0/auth0-angular';

@NgModule({
  imports: [
    AuthModule.forRoot({
      domain: 'YOUR_AUTH0_DOMAIN',
      clientId: 'YOUR_AUTH0_CLIENT_ID',
      useDpop: true, // 👈
      authorizationParams: {
        redirect_uri: window.location.origin,
      },
    }),
  ],
})
export class AppModule {}
```

After enabling DPoP, **every new session using a supported OAuth 2.0 flow in Auth0 will begin transparently to use tokens that are cryptographically bound to the current browser**.

> [!IMPORTANT]
> DPoP will only be used for new user sessions created after enabling it. Any previously existing sessions will continue using non-DPoP tokens until the user logs in again.
>
> You decide how to handle this transition. For example, you might require users to log in again the next time they use your application.

> [!NOTE]
> Using DPoP requires storing some temporary data in the user's browser. When you log the user out with `logout()`, this data is deleted.

> [!TIP]
> If all your clients are already using DPoP, you may want to increase security by making Auth0 reject any non-DPoP interactions. See [the docs on Sender Constraining](https://auth0.com/docs/secure/sender-constraining/configure-sender-constraining) for details.

### Using DPoP in your own requests

You use a DPoP token the same way as a "traditional" access token, except it must be sent to the server with an `Authorization: DPoP <token>` header instead of the usual `Authorization: Bearer <token>`.

For internal requests sent by `auth0-angular` to Auth0, simply enable the `useDpop` option and **every interaction with Auth0 will be protected**.

However, **to use DPoP with a custom, external API, some additional work is required**. The `AuthService` provides some low-level methods to help with this:

- `getDpopNonce()`
- `setDpopNonce()`
- `generateDpopProof()`

However, due to the nature of how DPoP works, **this is not a trivial task**:

- When a nonce is missing or expired, the request may need to be retried.
- Received nonces must be stored and managed.
- DPoP headers must be generated and included in every request, and regenerated for retries.

Because of this, we recommend using the provided `createFetcher()` method with `fetchWithAuth()`, which **handles all of this for you**.

#### Simple usage

The `fetchWithAuth()` method is a drop-in replacement for the native `fetch()` function from the Fetch API, so if you're already using it, the change will be minimal.

For example, if you had this code:

```ts
const response = await fetch('https://api.example.com/foo', {
  method: 'GET',
  headers: { 'user-agent': 'My Client 1.0' },
});

console.log(response.status);
console.log(response.headers);
console.log(await response.json());
```

You would change it as follows:

```ts
import { Component } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';

@Component({
  selector: 'app-data',
  template: `...`,
})
export class DataComponent {
  constructor(private auth: AuthService) {}

  async fetchData() {
    const fetcher = this.auth.createFetcher({
      dpopNonceId: 'my_api_request',
    });

    const response = await fetcher.fetchWithAuth('https://api.example.com/foo', {
      method: 'GET',
      headers: { 'user-agent': 'My Client 1.0' },
    });

    console.log(response.status);
    console.log(response.headers);
    console.log(await response.json());
  }
}
```

When using `fetchWithAuth()`, the following will be handled for you automatically:

- Use `getAccessTokenSilently()` to get the access token to inject in the headers.
- Generate and inject DPoP headers when needed.
- Store and update any DPoP nonces.
- Handle retries caused by a rejected nonce.

> [!IMPORTANT]
> If DPoP is enabled, a `dpopNonceId` **must** be present in the `createFetcher()` parameters, since it's used to keep track of the DPoP nonces for each request.

#### Advanced usage

If you need something more complex than the example above, you can provide a custom implementation in the `fetch` property.

However, since `auth0-angular` needs to make decisions based on HTTP responses, your implementation **must return an object with _at least_ two properties**:

1. `status`: the response status code as a number.
2. `headers`: the response headers as a plain object or as a Fetch API's Headers-like interface.

Whatever it returns, it will be passed as the output of the `fetchWithAuth()` method.

Your implementation will be called with a standard, ready-to-use [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) object, which will contain any headers needed for authorization and DPoP usage (if enabled). Depending on your needs, you can use this object directly or treat it as a container with everything required to make the request your own way.

##### Having a base URL

If you need to make requests to different endpoints of the same API, passing a `baseUrl` to `createFetcher()` can be useful:

```ts
import { Injectable } from '@angular/core';
import { AuthService, Fetcher } from '@auth0/auth0-angular';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private fetcher: Fetcher;

  constructor(private auth: AuthService) {
    this.fetcher = this.auth.createFetcher({
      dpopNonceId: 'my-api',
      baseUrl: 'https://api.example.com',
    });
  }

  async getFoo() {
    return this.fetcher.fetchWithAuth('/foo'); // => https://api.example.com/foo
  }

  async getBar() {
    return this.fetcher.fetchWithAuth('/bar'); // => https://api.example.com/bar
  }

  async getXyz() {
    return this.fetcher.fetchWithAuth('/xyz'); // => https://api.example.com/xyz
  }

  async getFromOtherApi() {
    // If the passed URL is absolute, `baseUrl` will be ignored for convenience:
    return this.fetcher.fetchWithAuth('https://other-api.example.com/foo');
  }
}
```

##### Multiple API endpoints

When working with multiple APIs, create separate fetchers for each. Each fetcher manages its own nonces independently:

```ts
import { Injectable } from '@angular/core';
import { AuthService, Fetcher } from '@auth0/auth0-angular';

@Injectable({ providedIn: 'root' })
export class MultiApiService {
  private internalApi: Fetcher;
  private partnerApi: Fetcher;

  constructor(private auth: AuthService) {
    // Each fetcher manages its own nonces independently
    this.internalApi = this.auth.createFetcher({
      dpopNonceId: 'internal-api',
      baseUrl: 'https://internal.example.com',
    });

    this.partnerApi = this.auth.createFetcher({
      dpopNonceId: 'partner-api',
      baseUrl: 'https://partner.example.com',
    });
  }

  async getInternalData() {
    const response = await this.internalApi.fetchWithAuth('/data');
    return response.json();
  }

  async getPartnerResources() {
    const response = await this.partnerApi.fetchWithAuth('/resources');
    return response.json();
  }

  async getAllData() {
    const [internal, partner] = await Promise.all([this.getInternalData(), this.getPartnerResources()]);
    return { internal, partner };
  }
}
```

##### Manual DPoP management

For scenarios requiring full control over DPoP proof generation and nonce management, you can use the low-level methods:

```ts
import { Component } from '@angular/core';
import { AuthService, UseDpopNonceError } from '@auth0/auth0-angular';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-advanced',
  template: `<button (click)="makeRequest()">Make Request</button>`,
})
export class AdvancedComponent {
  constructor(private auth: AuthService) {}

  async makeRequest() {
    try {
      // 1. Get access token
      const token = await firstValueFrom(this.auth.getAccessTokenSilently());

      // 2. Get current DPoP nonce for the API
      const nonce = await firstValueFrom(this.auth.getDpopNonce('my-api'));

      // 3. Generate DPoP proof
      const proof = await firstValueFrom(
        this.auth.generateDpopProof({
          url: 'https://api.example.com/data',
          method: 'POST',
          accessToken: token!,
          nonce,
        })
      );

      // 4. Make the API request
      const response = await fetch('https://api.example.com/data', {
        method: 'POST',
        headers: {
          Authorization: `DPoP ${token}`,
          DPoP: proof!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: 'example' }),
      });

      // 5. Update nonce if server provides a new one
      const newNonce = response.headers.get('DPoP-Nonce');
      if (newNonce) {
        await firstValueFrom(this.auth.setDpopNonce(newNonce, 'my-api'));
      }

      const data = await response.json();
      console.log('Success:', data);
    } catch (error) {
      if (error instanceof UseDpopNonceError) {
        console.error('DPoP nonce error:', error.message);
      } else {
        console.error('Request failed:', error);
      }
    }
  }
}
```

### Standalone Components with DPoP

When using standalone components, enable DPoP in your `provideAuth0` configuration:

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAuth0 } from '@auth0/auth0-angular';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideAuth0({
      domain: 'YOUR_AUTH0_DOMAIN',
      clientId: 'YOUR_AUTH0_CLIENT_ID',
      useDpop: true, // 👈
      authorizationParams: {
        redirect_uri: window.location.origin,
      },
    }),
  ],
});
```

## Standalone components and a more functional approach

As of Angular 15, the Angular team is putting standalone components, as well as a more functional approach, in favor of the traditional use of NgModules and class-based approach.

There are a couple of difference with how you would traditionally implement our SDK:

- Use our functional guard (`authGuardFn`) instead of our class-based `AuthGuard`.
- Use our functional interceptor (`authHttpInterceptorFn`) instead of our class-based `AuthHttpInterceptor`.
- Register the interceptor by passing it to `withInterceptors` when calling `provideHttpClient`.
- Register our SDK using `provideAuth0`.

```ts
import { authGuardFn, authHttpInterceptorFn, provideAuth0 } from '@auth0/auth0-angular';

const routes: Routes = [
  {
    path: 'profile',
    component: ProfileComponent,
    canActivate: [authGuardFn],
  },
];

bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes), provideAuth0(/* Auth Config Goes Here */), provideHttpClient(withInterceptors([authHttpInterceptorFn]))],
});
```

**Important:** `provideAuth0` returns `EnvironmentProviders`, which ensures it can only be used at the application/environment level. Attempting to add it to a component's `providers` array will result in a compile-time error.

## Connect Accounts for using Token Vault

The Connect Accounts feature uses the Auth0 My Account API to allow users to link multiple third party accounts to a single Auth0 user profile.

When using Connected Accounts, Auth0 acquires tokens from upstream Identity Providers (like Google) and stores them in a secure [Token Vault](https://auth0.com/docs/secure/tokens/token-vault). These tokens can then be used to access third-party APIs (like Google Calendar) on behalf of the user.

The tokens in the Token Vault are then accessible to [Resource Servers](https://auth0.com/docs/get-started/apis) (APIs) configured in Auth0. The SPA application can then issue requests to the API, which can retrieve the tokens from the Token Vault and use them to access the third-party APIs.

This is particularly useful for applications that require access to different resources on behalf of a user, like AI Agents.

### Configure the SDK

The SDK must be configured with an audience (an API Identifier) - this will be the resource server that uses the tokens from the Token Vault.

The SDK must also be configured to use refresh tokens and MRRT ([Multiple Resource Refresh Tokens](https://auth0.com/docs/secure/tokens/refresh-tokens/multi-resource-refresh-token)) since we will use the refresh token grant to get Access Tokens for the My Account API in addition to the API we are calling.

The My Account API requires DPoP tokens, so we also need to enable DPoP.

```ts
AuthModule.forRoot({
  domain: '<AUTH0_DOMAIN>',
  clientId: '<AUTH0_CLIENT_ID>',
  useRefreshTokens: true,
  useMrrt: true,
  useDpop: true,
  authorizationParams: {
    redirect_uri: '<MY_CALLBACK_URL>',
  },
});
```

### Login to the application

Use the login methods to authenticate to the application and get a refresh and access token for the API.

```ts
// Login specifying any scopes for the Auth0 API
this.auth
  .loginWithRedirect({
    authorizationParams: {
      audience: '<AUTH0_API_IDENTIFIER>',
      scope: 'openid profile email read:calendar',
    },
  })
  .subscribe();
```

### Connect to a third party account

Use the `connectAccountWithRedirect` method to redirect the user to the third party Identity Provider to connect their account.

```ts
// Start the connect flow by redirecting to the third party API's login, defined as an Auth0 connection
this.auth
  .connectAccountWithRedirect({
    connection: '<CONNECTION eg, google-apps-connection>',
    scopes: ['<SCOPE eg https://www.googleapis.com/auth/calendar.acls.readonly>'],
    authorizationParams: {
      // additional authorization params to forward to the authorization server
    },
  })
  .subscribe();
```

You can now call the API with your access token and the API can use [Access Token Exchange with Token Vault](https://auth0.com/docs/secure/tokens/token-vault/access-token-exchange-with-token-vault) to get tokens from the Token Vault to access third party APIs on behalf of the user.

> **Important**
>
> You must enable Offline Access from the Connection Permissions settings to be able to use the connection with Connected Accounts.
