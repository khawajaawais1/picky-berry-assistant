const coverageThreshold = require('./coverage-thresholds.json');

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // Reanimated 4.7 and Worklets ship native and web implementations; Jest must resolve the web
  // one. Without this, importing Reanimated initialises `JSReanimated`, whose CSS event hook
  // throws, and every suite that loads NativeWind's setup dies before its first test. This is the
  // testing setup Reanimated 4.x documents.
  resolver: 'react-native-reanimated/jest/resolver',
  // Compiles global.css once per run; jest.setup.ts registers the result (see there).
  globalSetup: '<rootDir>/jest.global-setup.js',
  // `className` is compiled by NativeWind, whose runtime needs Reanimated mocked and
  // Worklets stubbed before the module graph loads.
  setupFiles: ['react-native-css-interop/test/setup'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  clearMocks: true,
  // Mirrors the tsconfig `paths` aliases; keep both in sync.
  moduleNameMapper: {
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // `/e2e/` is a Playwright harness with its own runner (npm run test:layout); Jest
  // matches `*.spec.ts` by default and would try to run those specs without a browser.
  // `/scripts/` holds plain-Node tooling tested with Node's own runner (npm run test:scripts).
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/e2e/', '/scripts/'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    // Barrel files only re-export; they carry no behaviour to cover.
    '!src/**/index.ts',
    // Test support: a fake of the API that only tests import.
    '!src/services/session/testing.ts',
    '!src/features/privacy/services/testing.ts',
    '!src/services/push/testing.ts',
    // Route files are thin adapters: they are covered by E2E, not unit tests.
    '!src/app/**',
    // PROTOTYPE — throwaway scaffolding that answers a design question carries no tests, by
    // design (`src/components/prototype/`, `src/features/onboarding/components/prototype/`); the
    // winning variant is rewritten with tests, and the rest is deleted.
    '!src/**/prototype/**',
    // Native-only: expo-sqlite cannot run under Jest (no native module), so the SQLite/Drizzle
    // report outbox (feature 6.9) is verified on a device rather than in the unit suite. The
    // AsyncStorage fallback in report-queue.ts is what the unit suite exercises (see
    // `src/services/__tests__/report-queue.test.ts`).
    '!src/services/report-outbox/**',
  ],
  // The floor is a ratchet, not a target: it starts at what the suite measured and is raised
  // by `npm run coverage:ratchet` after coverage improves, never lowered. CI runs
  // `npm run test:coverage -- --ci`, so a drop fails the pull request (TESTING.md §8).
  coverageReporters: ['text-summary', 'lcov', 'json-summary'],
  coverageThreshold: { global: coverageThreshold },
};
