import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

setupZoneTestEnv();

// Provides fetch, Headers, Response, Request — works in Node + JSDOM
import 'cross-fetch/polyfill';
