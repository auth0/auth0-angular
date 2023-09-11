import { defineConfig } from 'cypress';

export default defineConfig({
  chromeWebSecurity: false,
  viewportWidth: 1000,
  viewportHeight: 1000,
  fixturesFolder: false,
  reporter: 'junit',
  reporterOptions: {
    mochaFile: 'projects/playground/test-results/e2e/junit-[hash].xml',
  },
  fileServerFolder: 'projects/playground',
  pluginFolder: 'projects/playground/e2e/plugins',
  screenshotsFolder: 'projects/playground/e2e/screenshots',
  videosFolder: 'projects/playground/e2e/videos',
  e2e: {
    setupNodeEvents(on, config) {},
    baseUrl: 'http://127.0.0.1:4200',
    supportFile: false,
    specPattern: 'projects/playground/e2e/integration/**/*.cy.{js,jsx,ts,tsx}',
  },
});
