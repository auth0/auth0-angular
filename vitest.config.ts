/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { resolve } from 'path';
import type { Plugin } from 'vite';
import angular from '@analogjs/vite-plugin-angular';

// Vitest loads Angular's ESM builds natively; rxjs/operators is a directory
// which Node ESM refuses to import — redirect it to the concrete index file.
const fixRxjsEsm: Plugin = {
  name: 'fix-rxjs-esm',
  enforce: 'pre',
  resolveId(id) {
    if (id === 'rxjs/operators')
      return {
        id: require.resolve('rxjs/operators/index.js'),
        external: false,
      };
    if (id === 'rxjs/ajax')
      return { id: require.resolve('rxjs/ajax/index.js'), external: false };
    if (id === 'rxjs/fetch')
      return { id: require.resolve('rxjs/fetch/index.js'), external: false };
    if (id === 'rxjs/testing')
      return { id: require.resolve('rxjs/testing/index.js'), external: false };
    if (id === 'rxjs/webSocket')
      return {
        id: require.resolve('rxjs/webSocket/index.js'),
        external: false,
      };
  },
};

export default defineConfig({
  plugins: [
    fixRxjsEsm,
    angular({
      tsconfig: resolve(__dirname, 'tsconfig.spec.json'),
      jit: true,
    }),
  ],
  test: {
    globals: true,
    pool: 'forks',
    setupFiles: ['projects/auth0-angular/src/test-setup.ts'],
    environment: 'jsdom',
    environmentOptions: {
      jsdom: { url: 'http://localhost/' },
    },
    include: [
      'projects/auth0-angular/src/**/*.spec.ts',
      'projects/playground/src/**/*.spec.ts',
    ],
    server: {
      deps: {
        inline: [/zone\.js/, /@angular\//, /@auth0\//, /rxjs/],
      },
    },
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage/auth0-angular',
      include: ['projects/auth0-angular/src/lib/**'],
    },
  },
});
