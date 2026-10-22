const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier/flat');

module.exports = defineConfig([
  expoConfig,
  // Must stay last: switches off stylistic rules that Prettier owns.
  prettierConfig,
  {
    // Both static web exports the layout harness builds, plus the harness' own output.
    ignores: [
      'dist/**',
      'dist-production/**',
      'coverage/**',
      '.expo/**',
      'node_modules/**',
      'test-results/**',
      'playwright-report/**',
    ],
  },
]);
