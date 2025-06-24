import { createCjsPreset } from 'jest-preset-angular/presets';
/* eslint-disable */
export default {
  displayName: 'playground',
  ...createCjsPreset(),
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/no-ng-attributes',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/html-comment',
  ],
  testPathIgnorePatterns: ['<rootDir>/e2e'],
  collectCoverage: false,
  coveragePathIgnorePatterns: ['<rootDir>/src'],
};
