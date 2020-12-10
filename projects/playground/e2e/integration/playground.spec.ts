const EMAIL = 'johnfoo+integration@gmail.com';
const PASSWORD = '1234';

const loginToAuth0 = () => {
  cy.get('.auth0-lock-form')
    .should('have.length.above', 1)
    .then(($form) => {
      if ($form.find('.auth0-lock-last-login-pane').length) {
        cy.get('.auth0-lock-last-login-pane > a').click();
        return;
      }
      cy.get('.auth0-lock-input-username .auth0-lock-input')
        .clear()
        .type(EMAIL);
      cy.get('.auth0-lock-input-password .auth0-lock-input')
        .clear()
        .type(PASSWORD);
      cy.get('.auth0-lock-submit').click();
    });
};

describe('Smoke tests', () => {
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
  });

  it('do redirect login and show user and access token', () => {
    cy.visit('/');
    cy.get('#login').should('be.visible').click();
    cy.url().should('include', 'https://brucke.auth0.com/login');
    loginToAuth0();
    cy.get('[data-cy=userProfile]').contains(`"email": "${EMAIL}"`);
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

    cy.get('#logout').should('be.visible').click();
    cy.get('#login').should('be.visible');
  });

  it('do redirect login and get new access token', () => {
    cy.visit('/');
    cy.get('#login').should('be.visible').click();

    cy.url().should('include', 'https://brucke.auth0.com/login');
    loginToAuth0();

    cy.get('[data-cy=userProfile]').contains(`"email": "${EMAIL}"`);

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
    cy.get('#login').should('be.visible');
  });

  it('do local logout (auth0 session remains valid)', () => {
    cy.visit('/');
    cy.get('#login').should('be.visible').click();

    cy.url().should('include', 'https://brucke.auth0.com/login');
    loginToAuth0();

    cy.get('[data-cy=logout-localOnly]').check();
    cy.get('#logout').click();

    cy.get('#login').should('be.visible').click();
    cy.url().should('include', 'https://brucke.auth0.com/login');
    // logs in with the "last time you logged in with" button
    cy.get('.auth0-lock-last-login-pane > a').should('be.visible').click();

    cy.get('#logout').should('be.visible').click();
    cy.get('#login').should('be.visible');
  });

  it('do regular logout (auth0 session is cleared)', () => {
    cy.visit('/');
    cy.get('#login').should('be.visible').click();

    cy.url().should('include', 'https://brucke.auth0.com/login');
    loginToAuth0();

    cy.get('#logout').click();

    cy.get('#login').should('be.visible').click();
    cy.url().should('include', 'https://brucke.auth0.com/login');
    cy.get('.auth0-lock-last-login-pane').should('not.exist');
    loginToAuth0();

    cy.get('#logout').should('be.visible').click();
    cy.get('#login').should('be.visible');
  });

  it('should protect a route and return to path after login', () => {
    cy.visit('/');
    cy.get('[data-cy=protected]').should('not.exist');
    cy.visit('/protected');

    cy.url().should('include', 'https://brucke.auth0.com/login');
    loginToAuth0();

    cy.url().should('include', '/protected');
    cy.get('[data-cy=protected]').should('be.visible');
    cy.get('#logout').click();
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

    cy.url().should('include', 'https://brucke.auth0.com/login');
    loginToAuth0();

    cy.url().should('include', '/child/nested');
    cy.get('[data-cy=nested-child-route]').should('be.visible');
    cy.get('#logout').click();
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
