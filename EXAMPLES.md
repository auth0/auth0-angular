# Examples using auth0-angular

- [Add login to your application](#add-login-to-your-application)
- [Add logout to your application](#add-logout-to-your-application)
- [Checking if a user is authenticated](#checking-if-a-user-is-authenticated)
- [Dislay the user profile](#display-the-user-profile)
- [Protect a route](#protect-a-route)
- [Call an API](#call-an-api)
- [Handling errors](#handling-errors)
- [Organizations](#organizations)

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

By default the application will ask Auth0 to redirect back to the root URL of your application after authentication. This can be configured by setting the [redirectUri](https://auth0.github.io/auth0-angular/interfaces/auth_config.authconfig.html#redirecturi) option.

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
      audience: 'YOUR_AUTH0_API_IDENTIFIER',
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

**Note:** Under the hood, tokenOptions is passed as-is to [the getTokenSilently method](https://auth0.github.io/auth0-spa-js/classes/auth0client.html#gettokensilently) on the underlying SDK, so all the same options apply here.

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
          audience: 'http://my-api/',
          scope: 'write:orders',
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

Using Organizations, you can:

- Represent teams, business customers, partner companies, or any logical grouping of users that should have different ways of accessing your applications, as organizations.

- Manage their membership in a variety of ways, including user invitation.

- Configure branded, federated login flows for each organization.

- Implement role-based access control, such that users can have different roles when authenticating in the context of different organizations.

- Build administration capabilities into your products, using Organizations APIs, so that those businesses can manage their own organizations.

Note that Organizations is currently only available to customers on our Enterprise and Startup subscription plans.

### Log in to an organization

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
      organization,
      invitation
    });
  }
}
```
