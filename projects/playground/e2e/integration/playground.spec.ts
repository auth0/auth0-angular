const EMAIL = Cypress.env('USER_EMAIL');
const PASSWORD = Cypress.env('USER_PASSWORD');

if (!EMAIL || !PASSWORD) {
  throw new Error(
    'You must provide CYPRESS_USER_EMAIL and CYPRESS_USER_PASSWORD environment variables'
  );
}

const loginToAuth0 = () => {
  cy.get('.auth0-lock-input-username .auth0-lock-input').clear().type(EMAIL);
  cy.get('.auth0-lock-input-password .auth0-lock-input').clear().type(PASSWORD);
  cy.get('.auth0-lock-submit').click();
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
    cy.get('#login').should('be.visible');
    cy.get('#login').click();

    loginToAuth0();

    cy.get('[data-cy=logout-local]').should('not.be.checked');
    cy.get('[data-cy=logout-federated]').should('not.be.checked');
    cy.get('[data-cy=accessToken-ignoreCache]').should('not.be.checked');
    cy.get('[data-cy=accessToken-silently]').should('be.checked');
    cy.get('[data-cy=accessToken-popup]').should('not.be.checked');

    cy.get('#logout').should('be.visible');
    cy.get('#logout').click();
  });

  it('do redirect login and show user and access token', () => {
    cy.visit('/');
    cy.get('#login').should('be.visible');
    cy.get('#login').click();

    cy.url().should('include', 'https://brucke.auth0.com/login');
    loginToAuth0();

    cy.get('[data-cy=userProfile]').contains(`"email": "${EMAIL}"`);

    cy.get('[data-cy=accessToken]').should('be.empty');
    cy.get('#accessToken').click();
    cy.wait(500);
    cy.get('[data-cy=accessToken]')
      .invoke('text')
      .then((token) => {
        expect(token).not.to.be.empty;
        cy.get('#accessToken').click();
        cy.get('[data-cy=accessToken]').should('have.text', token);
      });

    cy.get('#logout').should('be.visible');
    cy.get('#logout').click();
    cy.get('#login').should('exist');
  });

  it('do redirect login and get new access token', () => {
    cy.visit('/');
    cy.get('#login').should('be.visible');
    cy.get('#login').click();

    cy.url().should('include', 'https://brucke.auth0.com/login');
    loginToAuth0();

    cy.get('[data-cy=userProfile]').contains(`"email": "${EMAIL}"`);

    cy.get('[data-cy=accessToken]').should('be.empty');
    cy.get('[data-cy=accessToken-ignoreCache]').check();
    cy.get('#accessToken').click();
    cy.wait(2000);
    cy.get('[data-cy=accessToken]')
      .invoke('text')
      .then((token) => {
        expect(token).not.to.be.empty;
        cy.get('#accessToken').click();
        cy.get('[data-cy=accessToken]').should('not.be.empty');
        cy.get('[data-cy=accessToken]').should('not.have.text', token);
      });

    cy.get('#logout').should('be.visible');
    cy.get('#logout').click();
    cy.get('#login').should('exist');
  });

  it('do local logout', () => {
    cy.visit('/');
    cy.get('#login').should('be.visible');
    cy.get('#login').click();

    cy.url().should('include', 'https://brucke.auth0.com/login');
    loginToAuth0();

    cy.get('[data-cy=logout-localOnly]').check();

    cy.get('#logout').click();

    cy.get('#login').should('be.visible');
    cy.get('#login').click();

    cy.url().should('include', 'https://brucke.auth0.com/login');
    cy.get('.auth0-lock-last-login-pane').should('exist');
    cy.get('.auth0-lock-last-login-pane > a').click();

    cy.get('#logout').should('be.visible');
    cy.get('#logout').click();
    cy.get('#login').should('exist');
  });

  it('do federated logout', () => {
    cy.visit('/');
    cy.get('#login').should('be.visible');
    cy.get('#login').click();

    cy.url().should('include', 'https://brucke.auth0.com/login');
    loginToAuth0();

    cy.get('[data-cy=logout-federated]').check();

    cy.get('#logout').click();

    cy.get('#login').should('be.visible');
    cy.get('#login').click();

    cy.url().should('include', 'https://brucke.auth0.com/login');
    cy.get('.auth0-lock-last-login-pane').should('not.exist');
    loginToAuth0();

    cy.get('#logout').should('be.visible');
    cy.get('#logout').click();
    cy.get('#login').should('exist');
  });

  it('should protect a route and return to path after login', () => {
    cy.visit('/');
    cy.get('[data-cy=protected]').should('not.be.visible');
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
    cy.get('[data-cy=protected]').should('not.be.visible');
  });
});
