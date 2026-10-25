import { expect, test } from '@playwright/test';

/**
 * Hydration, held in the built export.
 *
 * The app is statically rendered on the web, and React reports a mismatch as a page error
 * (`#418`). Two real causes were found this way: the icon fonts (the server draws an empty box,
 * the client used to draw the glyph) and the active-visit arrival time (the build's clock versus
 * the phone's). This spec fails if either class comes back, on any route, in either scheme.
 */
const ROUTES = [
  '/',
  '/sign-in',
  '/create-account',
  '/forgot-password',
  '/location-consent',
  '/discover',
  '/zone-details',
  '/zone-reports',
  '/route-to-zone',
  '/active-visit',
  '/post-visit-feedback',
  '/alerts',
  '/visits',
  '/privacy-settings',
  '/account-security',
  '/downloads',
  '/saved-spots',
  '/your-data',
  '/terms-privacy',
  '/marketplace',
  '/marketplace-listing',
  '/marketplace-chat',
  '/marketplace-order',
];

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`the ${scheme} launch`, () => {
    test.use({ colorScheme: scheme });

    for (const route of ROUTES) {
      test(`${route} hydrates without a mismatch`, async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));

        await page.goto(route, { waitUntil: 'networkidle' });
        // The mismatch is reported during/after hydration; give React the frame it needs.
        await page.waitForTimeout(400);

        expect(errors).toEqual([]);
      });
    }
  });
}
