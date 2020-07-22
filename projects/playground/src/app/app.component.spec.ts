import { TestBed, async } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { AuthService } from 'projects/auth0-angular/src/lib/auth.service';
import { BehaviorSubject } from 'rxjs';

describe('AppComponent', () => {
  let authMock: AuthService;

  beforeEach(async(() => {
    authMock = jasmine.createSpyObj(
      'AuthService',
      {
        loginWithRedirect: jasmine.createSpy().and.returnValue(null),
      },
      {
        user$: new BehaviorSubject(null),
        isLoading$: new BehaviorSubject(true),
        isAuthenticated$: new BehaviorSubject(false),
      }
    ) as any;

    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [AppComponent],
      providers: [
        {
          provide: AuthService,
          useValue: authMock,
        },
      ],
    }).compileComponents();
  }));

  describe('constructor', () => {
    it('should create the app', () => {
      const fixture = TestBed.createComponent(AppComponent);
      const app = fixture.componentInstance;
      expect(app).toBeTruthy();
    });

    it('should have as title `Auth0 Angular Playground`', () => {
      const fixture = TestBed.createComponent(AppComponent);
      const app = fixture.componentInstance;
      expect(app.title).toEqual('Auth0 Angular Playground');
    });

    it('should render title', () => {
      const fixture = TestBed.createComponent(AppComponent);
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('h1').textContent).toContain(
        'AUTH0 ANGULAR PLAYGROUND'
      );
    });

    it('should render buttons', () => {
      const fixture = TestBed.createComponent(AppComponent);
      fixture.detectChanges();
      const compiled = fixture.nativeElement;

      const butLoginRedirect = compiled.querySelector('#login-redirect');
      expect(butLoginRedirect.textContent).toContain('Log in (redirect)');

      const butLoginPopup = compiled.querySelector('#login-popup');
      expect(butLoginPopup.textContent).toContain('Log in (popup)');

      const butLogout = compiled.querySelector('#logout');
      expect(butLogout.textContent).toContain('Log out');

      const butLogoutFederated = compiled.querySelector('#logout-federated');
      expect(butLogoutFederated.textContent).toContain('Log out (federated)');
    });
  });

  describe('when user is authenticated', () => {
    beforeEach(() => {
      let authenticated = authMock.isAuthenticated$ as BehaviorSubject<boolean>;
      authenticated.next(true);
    });

    it('should enable logout buttons', () => {
      const fixture = TestBed.createComponent(AppComponent);
      fixture.detectChanges();
      const compiled = fixture.nativeElement;

      const butLogout = compiled.querySelector('#logout');
      expect(butLogout.disabled).toBeFalse();

      const butFederated = compiled.querySelector('#logout-federated');
      expect(butFederated.disabled).toBeFalse();
    });

    it('should disable login buttons', () => {
      const fixture = TestBed.createComponent(AppComponent);
      fixture.detectChanges();
      const compiled = fixture.nativeElement;

      const butLogout = compiled.querySelector('#login-popup');
      expect(butLogout.disabled).toBeTrue();

      const butFederated = compiled.querySelector('#login-redirect');
      expect(butFederated.disabled).toBeTrue();
    });
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      let authenticated = authMock.isAuthenticated$ as BehaviorSubject<boolean>;
      authenticated.next(false);
    });

    it('should disable logout buttons', () => {
      const fixture = TestBed.createComponent(AppComponent);
      fixture.detectChanges();
      const compiled = fixture.nativeElement;

      const butLogout = compiled.querySelector('#logout');
      expect(butLogout.disabled).toBeTrue();

      const butFederated = compiled.querySelector('#logout-federated');
      expect(butFederated.disabled).toBeTrue();
    });

    it('should enable login buttons', () => {
      const fixture = TestBed.createComponent(AppComponent);
      fixture.detectChanges();
      const compiled = fixture.nativeElement;

      const butLogout = compiled.querySelector('#login-popup');
      expect(butLogout.disabled).toBeFalse();

      const butFederated = compiled.querySelector('#login-redirect');
      expect(butFederated.disabled).toBeFalse();
    });
  });
});
