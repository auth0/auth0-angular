const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://127.0.0.1:4200',
    specPattern: 'projects/playground/e2e/integration/**/*.cy.ts',
    screenshotsFolder: 'projects/playground/e2e/screenshots',
    videosFolder: 'projects/playground/e2e/videos',
    supportFile: false,
    chromeWebSecurity: false,
    viewportWidth: 1000,
    viewportHeight: 1000,
    reporter: 'junit',
    reporterOptions: {
      mochaFile: 'projects/playground/test-results/e2e/junit-[hash].xml',
    },
  },
});
