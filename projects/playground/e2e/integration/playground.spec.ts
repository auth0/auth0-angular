const EMAIL = Cypress.env('USER_EMAIL') || 'a';
const PASSWORD = Cypress.env('USER_PASSWORD') || 'a';

if (!EMAIL || !PASSWORD) {
  throw new Error(
    'You must provide CYPRESS_USER_EMAIL and CYPRESS_USER_PASSWORD environment variables'
  );
}

const loginToAuth0 = () => {
  cy.get('.login-card')
    .should('have.length', 1)
    .then(($form) => {
      cy.get('input[name=login]').clear().type(EMAIL);
      cy.get('input[name=password]').clear().type(PASSWORD);
      cy.get('.login-submit').click();
      cy.get('.login-submit').click();
    });
};

const fixCookies = () => {
  // Temporary fix for https://github.com/cypress-io/cypress/issues/6375
  if (Cypress.isBrowser('firefox')) {
    cy.getCookies({ log: false }).then((cookies) =>
      cookies.forEach((cookie) => cy.clearCookie(cookie.name, { log: false }))
    );
    cy.log('clearCookies');
  } else {
    cy.clearCookies();
  }
};

describe('Smoke tests', () => {
  afterEach(fixCookies);

  it('shows default logged out options', () => {
    cy.visit('/');
    cy.get('#login').should('be.visible');
    cy.get('[data-cy=login-redirect]').should('be.checked');
    cy.get('[data-cy=login-popup]').should('not.be.checked');
  });

  it('shows default logged in options', () => {
    cy.visit('/');
    cy.get('#login').should('be.visible').click();

    loginToAuth0();

    cy.get('[data-cy=logout-localOnly]').should('not.be.checked');
    cy.get('[data-cy=logout-federated]').should('not.be.checked');
    cy.get('[data-cy=accessToken-ignoreCache]').should('not.be.checked');
    cy.get('[data-cy=accessToken-silently]').should('be.checked');
    cy.get('[data-cy=accessToken-popup]').should('not.be.checked');

    cy.get('#logout').should('be.visible').click();
    cy.get('button[name=logout]').should('be.visible').click();
  });

  it('do redirect login and show user, access token and appState', () => {
    const appState = 'Any Random String';

    cy.visit('/');
    cy.get('[data-cy=app-state-input]').type(appState);
    cy.get('#login').should('be.visible').click();
    cy.url().should('include', 'http://127.0.0.1:4200');
    loginToAuth0();
    cy.get('[data-cy=userProfile]').contains(`"sub": "${EMAIL}"`);
    cy.get('[data-cy=idTokenClaims]').contains('__raw');
    cy.get('[data-cy=accessToken]').should('be.empty');
    cy.get('#accessToken').click();

    cy.get('[data-cy=accessToken]')
      .should('not.be.empty')
      .invoke('text')
      .then((token) => {
        cy.get('#accessToken').click();
        cy.get('[data-cy=accessToken]').should('have.text', token);
      });

    cy.get('[data-cy=app-state-result]').should('have.value', appState);

    cy.get('#logout').should('be.visible').click();
    cy.get('button[name=logout]').should('be.visible').click();
    cy.get('#login').should('be.visible');
  });

  it('do redirect login and get new access token', () => {
    cy.visit('/');
    cy.get('#login').should('be.visible').click();

    cy.url().should('include', 'http://127.0.0.1:4200');
    loginToAuth0();

    cy.get('[data-cy=userProfile]').contains(`"sub": "${EMAIL}"`);

    cy.get('[data-cy=accessToken]').should('be.empty');
    cy.get('[data-cy=accessToken-ignoreCache]').check();
    cy.get('#accessToken').click();
    cy.get('[data-cy=accessToken]')
      .should('not.be.empty')
      .invoke('text')
      .then((token) => {
        cy.get('#accessToken').click();
        cy.get('[data-cy=accessToken]')
          .should('not.be.empty')
          .and('not.have.text', token);
      });

    cy.get('#logout').should('be.visible').click();
    cy.get('button[name=logout]').should('be.visible').click();
    cy.get('#login').should('be.visible');
  });

  it('do local logout (auth0 session remains valid)', () => {
    cy.visit('/');
    cy.get('#login').should('be.visible').click();

    cy.url().should('include', 'http://127.0.0.1:4200');
    loginToAuth0();

    cy.get('[data-cy=logout-localOnly]').check();
    cy.get('#logout').click();

    cy.get('#login').should('be.visible').click();
    cy.url().should('include', 'http://127.0.0.1:4200');

    cy.get('#logout').should('be.visible').click();
    cy.get('button[name=logout]').should('be.visible').click();
    cy.get('#login').should('be.visible');
  });

  it('do regular logout (auth0 session is cleared)', () => {
    cy.visit('/');
    cy.get('#login').should('be.visible').click();

    cy.url().should('include', 'http://127.0.0.1:4200');
    loginToAuth0();

    cy.get('#logout').click();
    cy.get('button[name=logout]').should('be.visible').click();

    cy.get('#login').should('be.visible').click();
    cy.url().should('include', 'http://127.0.0.1:4200');
    cy.get('.auth0-lock-last-login-pane').should('not.exist');
    loginToAuth0();

    cy.get('#logout').should('be.visible').click();
    cy.get('button[name=logout]').should('be.visible').click();
    cy.get('#login').should('be.visible');
  });

  it('should protect a route and return to path after login', () => {
    cy.visit('/');
    cy.get('[data-cy=protected]').should('not.exist');
    cy.visit('/protected');

    cy.url().should('include', 'http://127.0.0.1:4200');
    loginToAuth0();

    cy.url().should('include', '/protected');
    cy.get('[data-cy=protected]').should('be.visible');
    cy.get('#logout').click();
    cy.get('button[name=logout]').should('be.visible').click();
  });

  it('should see public route content without logging in', () => {
    cy.visit('/');
    cy.get('#login').should('be.visible');

    cy.get('[data-cy=unprotected]').should('be.visible');
    cy.get('[data-cy=protected]').should('not.exist');
  });

  it('should see child route content without logging in', () => {
    cy.visit('/child');
    cy.get('#login').should('be.visible');

    cy.get('[data-cy=child-route]').should('be.visible');
  });

  it('should protect the nested child route and return to the right place after login', () => {
    cy.visit('/');
    cy.get('[data-cy=nested-child-route]').should('not.exist');
    cy.visit('/child/nested');

    cy.url().should('include', 'http://127.0.0.1:4200');
    loginToAuth0();

    cy.url().should('include', '/child/nested');
    cy.get('[data-cy=nested-child-route]').should('be.visible');
    cy.get('#logout').click();
    cy.get('button[name=logout]').should('be.visible').click();
  });

  it('should not navigate to the lazy loaded module when not authenticated', () => {
    cy.visit('/lazy');
    cy.get('[data-cy=lazy-module]').should('not.exist');
  });

  it('should show lazy module content when authenticated', () => {
    cy.visit('/');
    cy.get('#login').should('be.visible').click();
    loginToAuth0();
    cy.get('#logout').should('be.visible');
    cy.visit('/lazy');
    cy.get('[data-cy=lazy-module]').should('be.visible');
  });
});
