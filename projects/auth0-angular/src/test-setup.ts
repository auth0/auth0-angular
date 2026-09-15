import 'reflect-metadata';
import 'zone.js';
import 'zone.js/testing';
import '@angular/compiler';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';
import { getTestBed } from '@angular/core/testing';

getTestBed().initTestEnvironment(
  BrowserTestingModule,
  platformBrowserTesting()
);

// Provides fetch, Headers, Response, Request — works in Node + JSDOM
import 'cross-fetch/polyfill';
