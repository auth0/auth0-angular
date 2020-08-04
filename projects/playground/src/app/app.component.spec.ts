import { TestBed, ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { AuthService } from 'projects/auth0-angular/src/lib/auth.service';
import { BehaviorSubject } from 'rxjs';
import { ReactiveFormsModule } from '@angular/forms';

describe('AppComponent', () => {
  let authMock: AuthService;
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;
  let ne;

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
      expect(h1.textContent).toContain('AUTH0 ANGULAR PLAYGROUND');
    });

    it('should render SDK loading status', () => {
      const loadingIndicator = ne.querySelector('p.status-indicator');
      expect(loadingIndicator.textContent).toContain('SDK initialized = false');

      const loading = authMock.isLoading$ as BehaviorSubject<boolean>;
      loading.next(false);
      fixture.detectChanges();

      expect(loadingIndicator.textContent).toContain('SDK initialized = true');
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
      const authenticated = authMock.isAuthenticated$ as BehaviorSubject<
        boolean
      >;
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

    xit('should logout with default options', () => {
      //TODO: uncheck all checkboxes

      const btnLogout = ne.querySelector('#logout');
      btnLogout.click();
      fixture.detectChanges();

      //TODO: assert logout() was called without options
    });

    xit('should logout with federated', () => {
      //TODO: check federated

      const btnLogout = ne.querySelector('#logout');
      btnLogout.click();
      fixture.detectChanges();

      //TODO: assert logout() was called with federated=true
    });

    xit('should logout with localOnly', () => {
      //TODO: check localOnly

      const btnLogout = ne.querySelector('#logout');
      btnLogout.click();
      fixture.detectChanges();

      //TODO: assert logout() was called with localOnly=true
    });

    it('should show user profile', () => {
      const divProfile = ne.querySelectorAll('.artifacts-wrapper .artifact')[0];
      expect(divProfile.querySelector('p').textContent).toContain(
        'User Profile: Subset of the ID token claims'
      );
      const userValue = JSON.parse(
        divProfile.querySelector('textarea').textContent
      );
      expect(userValue).toEqual({ name: 'John', lastname: 'Doe' });
    });

    it('should show empty access token', () => {
      const divToken = ne.querySelectorAll('.artifacts-wrapper .artifact')[1];
      expect(divToken.querySelector('p').textContent).toContain(
        'Access Token: Select a mode and click the button to retrieve the token.'
      );
      const tokenContent = divToken.querySelector('textarea').textContent;
      expect(tokenContent).toEqual('');
    });

    xit('should get access token silently', () => {
      const divToken = ne.querySelectorAll('.artifacts-wrapper .artifact')[1];
      expect(divToken.querySelector('p').textContent).toContain('Access Token');

      (authMock.getAccessTokenSilently as jasmine.Spy).and.returnValue(
        'access token silently'
      );
      //TODO: select "silently" radio button

      const btnRefresh = divToken.querySelector('button');
      btnRefresh.click();
      fixture.detectChanges();
      //TODO: assert updateAccessToken() was called?

      const tokenContent = divToken.querySelector('textarea').textContent;
      expect(tokenContent).toEqual('access token silently');
    });

    xit('should get access token with popup', () => {
      const divToken = ne.querySelectorAll('.artifacts-wrapper .artifact')[1];
      expect(divToken.querySelector('p').textContent).toContain('Access Token');

      (authMock.getAccessTokenWithPopup as jasmine.Spy).and.returnValue(
        'access token popup'
      );
      //TODO: select "popup" radio button

      const btnRefresh = divToken.querySelector('button');
      btnRefresh.click();
      fixture.detectChanges();
      //TODO: assert updateAccessToken() was called?

      const tokenContent = divToken.querySelector('textarea').textContent;
      expect(tokenContent).toEqual('access token popup');
    });
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      const loading = authMock.isLoading$ as BehaviorSubject<boolean>;
      const authenticated = authMock.isAuthenticated$ as BehaviorSubject<
        boolean
      >;

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

    xit('should login with redirect', () => {
      const wrapLogin = ne.querySelector('.login-wrapper');

      //TODO: select "redirect" radio button

      const btnRefresh = wrapLogin.querySelector('button');
      btnRefresh.click();
      fixture.detectChanges();
      //TODO: assert loginWithRedirect() was called?
    });

    xit('should login with popup', () => {
      const wrapLogin = ne.querySelector('.login-wrapper');

      //TODO: select "popup" radio button

      const btnRefresh = wrapLogin.querySelector('button');
      btnRefresh.click();
      fixture.detectChanges();
      //TODO: assert loginWithPopup() was called?
    });
  });
});
