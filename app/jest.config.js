/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
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
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/e2e/'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    // Barrel files only re-export; they carry no behaviour to cover.
    '!src/**/index.ts',
    // Route files are thin adapters: they are covered by E2E, not unit tests.
    '!src/app/**',
    // PROTOTYPE — throwaway scaffolding that answers a design question carries no tests, by
    // design (`src/components/prototype/`, `src/features/onboarding/components/prototype/`); the
    // winning variant is rewritten with tests, and the rest is deleted.
    '!src/**/prototype/**',
  ],
  // Coverage thresholds are intentionally not enforced yet: see
  // DEFINITION_OF_DONE.md ("Coverage"). Add them once product code lands.
};
