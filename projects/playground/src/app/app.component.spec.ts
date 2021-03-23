import { TestBed, ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { AuthService } from 'projects/auth0-angular/src/lib/auth.service';
import { BehaviorSubject, of } from 'rxjs';
import { ReactiveFormsModule } from '@angular/forms';

describe('AppComponent', () => {
  let authMock: AuthService;
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;
  let ne: HTMLElement;

  beforeEach(() => {
    authMock = jasmine.createSpyObj(
      'AuthService',
      {
        loginWithRedirect: jasmine.createSpy().and.returnValue(null),
        loginWithPopup: jasmine.createSpy().and.returnValue(null),
        logout: jasmine.createSpy().and.returnValue(null),
        getAccessTokenSilently: jasmine.createSpy().and.returnValue(null),
        getAccessTokenWithPopup: jasmine.createSpy().and.returnValue(null),
      },
      {
        user$: new BehaviorSubject(null),
        isLoading$: new BehaviorSubject(true),
        isAuthenticated$: new BehaviorSubject(false),
      }
    ) as any;

    TestBed.configureTestingModule({
      imports: [RouterTestingModule, ReactiveFormsModule],
      declarations: [AppComponent],
      providers: [
        {
          provide: AuthService,
          useValue: authMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    ne = fixture.nativeElement;
    fixture.detectChanges();
  });

  describe('when initialized', () => {
    it('should create the app', () => {
      expect(component).toBeTruthy();
    });

    it('should render title', () => {
      const h1 = ne.querySelector('h1');
      expect(h1?.textContent).toContain('AUTH0 ANGULAR PLAYGROUND');
    });

    it('should render SDK loading status', () => {
      const loadingIndicator = ne.querySelector('p.status-indicator');
      expect(loadingIndicator?.textContent).toContain(
        'SDK initialized = false'
      );

      const loading = authMock.isLoading$ as BehaviorSubject<boolean>;
      loading.next(false);
      fixture.detectChanges();

      expect(loadingIndicator?.textContent).toContain('SDK initialized = true');
    });

    it('should show controls when SDK finishes loading', () => {
      let actions = ne.querySelector('.actions');
      expect(actions).toBeNull();

      const loading = authMock.isLoading$ as BehaviorSubject<boolean>;
      loading.next(false);
      fixture.detectChanges();

      actions = ne.querySelector('.actions');
      expect(actions).toBeTruthy();
    });
  });

  describe('when user is authenticated', () => {
    beforeEach(() => {
      const loading = authMock.isLoading$ as BehaviorSubject<boolean>;
      const authenticated = authMock.isAuthenticated$ as BehaviorSubject<boolean>;
      const user = authMock.user$ as BehaviorSubject<any>;

      loading.next(false);
      authenticated.next(true);
      user.next({ name: 'John', lastname: 'Doe' });
      fixture.detectChanges();
    });

    it('should hide login options', () => {
      const wrapLogin = ne.querySelector('.login-wrapper');
      expect(wrapLogin).toBeNull();
    });

    it('should show logout options', () => {
      const wrapLogout = ne.querySelector('.logout-wrapper');
      expect(wrapLogout).toBeTruthy();

      const btnLogout = ne.querySelector('#logout');
      expect(btnLogout).toBeTruthy();
    });

    it('should logout with default options', () => {
      const form = component.logoutOptionsForm.controls;
      form.localOnly.setValue(false);
      form.federated.setValue(false);

      const btnLogout = ne.querySelector('#logout') as HTMLButtonElement;
      btnLogout.click();
      fixture.detectChanges();

      expect(authMock.logout).toHaveBeenCalledWith({
        localOnly: false,
        federated: false,
        returnTo: 'http://localhost:9876',
      });
    });

    it('should logout with federated', () => {
      const form = component.logoutOptionsForm.controls;
      form.localOnly.setValue(false);
      form.federated.setValue(true);

      const btnLogout = ne.querySelector('#logout') as HTMLButtonElement;
      btnLogout.click();
      fixture.detectChanges();

      expect(authMock.logout).toHaveBeenCalledWith({
        localOnly: false,
        federated: true,
        returnTo: 'http://localhost:9876',
      });
    });

    it('should logout with localOnly', () => {
      const form = component.logoutOptionsForm.controls;
      form.localOnly.setValue(true);
      form.federated.setValue(false);

      const btnLogout = ne.querySelector('#logout') as HTMLButtonElement;
      btnLogout.click();
      fixture.detectChanges();

      expect(authMock.logout).toHaveBeenCalledWith({
        localOnly: true,
        federated: false,
        returnTo: 'http://localhost:9876',
      });
    });

    it('should show user profile', () => {
      const divProfile = ne.querySelectorAll('.artifacts-wrapper .artifact')[0];
      expect(divProfile.querySelector('p')?.textContent).toContain(
        'User Profile: Subset of the ID token claims'
      );
      const userValue = JSON.parse(
        divProfile.querySelector('textarea')?.textContent ?? ''
      );
      expect(userValue).toEqual({ name: 'John', lastname: 'Doe' });
    });

    it('should show empty access token by default', () => {
      const divToken = ne.querySelectorAll('.artifacts-wrapper .artifact')[1];
      expect(divToken.querySelector('p')?.textContent).toContain(
        'Access Token: Select a mode and click the button to retrieve the token.'
      );
      const tokenContent = divToken.querySelector('textarea')?.textContent;
      expect(tokenContent).toEqual('');
    });

    it('should get access token silently', () => {
      const divToken = ne.querySelectorAll('.artifacts-wrapper .artifact')[1];
      expect(divToken.querySelector('p')?.textContent).toContain(
        'Access Token'
      );
      const form = component.accessTokenOptionsForm.controls;
      form.usePopup.setValue(false);
      (authMock.getAccessTokenSilently as jasmine.Spy).and.returnValue(
        of('access token silently')
      );

      const btnRefresh = divToken.querySelector('button');
      btnRefresh?.click();
      fixture.detectChanges();

      expect(authMock.getAccessTokenSilently).toHaveBeenCalledWith({
        ignoreCache: false,
      });
      console.log(divToken.querySelector('textarea'));
      const tokenContent = divToken.querySelector('textarea')?.textContent;
      expect(tokenContent).toEqual('access token silently');
    });

    it('should get access token silently', () => {
      const divToken = ne.querySelectorAll('.artifacts-wrapper .artifact')[1];
      expect(divToken.querySelector('p')?.textContent).toContain(
        'Access Token'
      );
      const form = component.accessTokenOptionsForm.controls;
      form.usePopup.setValue(false);
      form.ignoreCache.setValue(false);
      (authMock.getAccessTokenSilently as jasmine.Spy).and.returnValue(
        of('access token silently')
      );

      const btnRefresh = divToken.querySelector('button');
      btnRefresh?.click();
      fixture.detectChanges();

      expect(authMock.getAccessTokenSilently).toHaveBeenCalledWith({
        ignoreCache: false,
      });
      console.log(divToken.querySelector('textarea'));
      const tokenContent = divToken.querySelector('textarea')?.textContent;
      expect(tokenContent).toEqual('access token silently');
    });

    it('should get access token silently ignoring cache', () => {
      const divToken = ne.querySelectorAll('.artifacts-wrapper .artifact')[1];
      expect(divToken.querySelector('p')?.textContent).toContain(
        'Access Token'
      );
      const form = component.accessTokenOptionsForm.controls;
      form.usePopup.setValue(false);
      form.ignoreCache.setValue(true);
      (authMock.getAccessTokenSilently as jasmine.Spy).and.returnValue(
        of('access token silently')
      );

      const btnRefresh = divToken.querySelector('button');
      btnRefresh?.click();
      fixture.detectChanges();

      expect(authMock.getAccessTokenSilently).toHaveBeenCalledWith({
        ignoreCache: true,
      });
      console.log(divToken.querySelector('textarea'));
      const tokenContent = divToken.querySelector('textarea')?.textContent;
      expect(tokenContent).toEqual('access token silently');
    });

    it('should get access token with popup', () => {
      const divToken = ne.querySelectorAll('.artifacts-wrapper .artifact')[1];
      expect(divToken.querySelector('p')?.textContent).toContain(
        'Access Token'
      );
      const form = component.accessTokenOptionsForm.controls;
      form.usePopup.setValue(true);
      (authMock.getAccessTokenWithPopup as jasmine.Spy).and.returnValue(
        of('access token popup')
      );

      const btnRefresh = divToken.querySelector('button');
      btnRefresh?.click();
      fixture.detectChanges();

      expect(authMock.getAccessTokenWithPopup).toHaveBeenCalledWith();
      const tokenContent = divToken.querySelector('textarea')?.textContent;
      expect(tokenContent).toEqual('access token popup');
    });
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      const loading = authMock.isLoading$ as BehaviorSubject<boolean>;
      const authenticated = authMock.isAuthenticated$ as BehaviorSubject<boolean>;

      loading.next(false);
      authenticated.next(false);
      fixture.detectChanges();
    });

    it('should hide logout options', () => {
      const wrapLogout = ne.querySelector('.logout-wrapper');
      expect(wrapLogout).toBeNull();
    });

    it('should show login options', () => {
      const wrapLogin = ne.querySelector('.login-wrapper');
      expect(wrapLogin).toBeTruthy();

      const btnLogin = ne.querySelector('#login');
      expect(btnLogin).toBeTruthy();
    });

    it('should login with redirect', () => {
      const wrapLogin = ne.querySelector('.login-wrapper');
      const form = component.loginOptionsForm.controls;
      form.usePopup.setValue(false);

      const btnRefresh = wrapLogin?.querySelector('button');
      btnRefresh?.click();
      fixture.detectChanges();

      expect(authMock.loginWithRedirect).toHaveBeenCalledWith({});
    });

    it('should login with popup', () => {
      const wrapLogin = ne.querySelector('.login-wrapper');
      const form = component.loginOptionsForm.controls;
      form.usePopup.setValue(true);

      const btnRefresh = wrapLogin?.querySelector('button');
      btnRefresh?.click();
      fixture.detectChanges();

      expect(authMock.loginWithPopup).toHaveBeenCalledWith({});
    });
  });
});
