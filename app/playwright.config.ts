import { defineConfig } from '@playwright/test';

/**
 * The browser harness behind `npm run test:layout`: the layout measurement of every
 * built screen in every shipped language (e2e/layout.spec.ts, ADR-018), plus the states and
 * routes that only exist in the built app (e2e/accessibility.spec.ts).
 *
 * This config builds and serves **the app as it is developed**. `npm run test:layout` runs it,
 * then `playwright.production.config.ts` for the app as it ships; they are two commands and two
 * exports on purpose, because the second one must not inherit the first one's inlined
 * `EXPO_PUBLIC_*` values through Metro's transform cache — read that config's header before
 * merging them back into one.
 *
 * Locally and in CI the same steps run — `expo export` builds the static web app, `expo serve`
 * hosts it — so a local pass means the same thing as a CI pass. Nothing here deploys anything:
 * the served directory is the git-ignored `dist/`.
 */
const PORT = 8090;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  // Generous: the first request after an export compiles nothing, but a cold CI runner
  // is slow, and the screens are static.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  forbidOnly: !!process.env.CI,
  // A failed measurement is information, never flakiness: retrying could only hide the
  // break this harness exists to find (TESTING.md §9).
  retries: 0,
  // One page at a time: the screens are measured, not load-tested, and a single worker
  // keeps memory bounded on a CI runner.
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  webServer: {
    // `--clear` for the same reason the production export has it: this run's inlined
    // environment must be this run's, whatever the last export left in the cache.
    command: `npx expo export --platform web --clear && npx expo serve --port ${PORT}`,
    url: BASE_URL,
    // Never reuse somebody's dev server: reusing one would measure whatever they happen
    // to have running instead of this commit's export.
    reuseExistingServer: false,
    timeout: 300_000,
    // The harness must never send a real reset email: an empty public key keeps the export on the
    // test-build path, whatever a developer's `.env` contains.
    env: { EXPO_NO_TELEMETRY: '1', EXPO_PUBLIC_FIREBASE_API_KEY: '' },
  },
  // The production spec belongs to the other config, which is the only place it can run
  // against a bundle built for people.
  testIgnore: /production-export\.spec\.ts/,
  use: { baseURL: BASE_URL },
});
