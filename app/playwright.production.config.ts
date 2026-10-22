import { defineConfig } from '@playwright/test';

/**
 * The second half of `npm run test:layout`: the app **as it ships**, exported with
 * `EXPO_PUBLIC_APP_ENV=production`, serving `e2e/production-export.spec.ts`.
 *
 * It is a separate config, run as a separate command, because of how the build's own
 * environment reaches the app. `EXPO_PUBLIC_*` values are substituted into the bundle at build
 * time (literal `process.env` reads only — ARCHITECTURE.md §3.5), and **Metro's transform cache
 * is keyed on the source, not on those values**. Two exports of one working tree that share a
 * cache therefore hand the second the first's environment: with both servers in one config, the
 * production export silently baked in `.env`'s `development`, so the harness measured an app that
 * still accepted the stand-in code and still mounted the sign-in prototype while claiming to
 * check the opposite (found 2026-10-10, by the tests below failing in exactly that direction).
 *
 * So each export runs **alone** and with `--clear`, which is what makes the inlined value the one
 * this config asks for. It costs a full transform per run; it is not optional. The same hazard is
 * worth knowing about outside the harness: a release build must not reuse a cache filled by a
 * development one.
 */
const PORT = 8092;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  testMatch: /production-export\.spec\.ts/,
  use: { baseURL: BASE_URL },
  webServer: {
    command: `EXPO_PUBLIC_APP_ENV=production npx expo export --platform web --output-dir dist-production --clear && npx expo serve --port ${PORT} dist-production`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 300_000,
    env: { EXPO_NO_TELEMETRY: '1' },
  },
});
