import { expect, test, type Page } from '@playwright/test';

/**
 * The dark launch, read from the built export.
 *
 * A cold dark-mode load used to paint the server's light HTML and then keep it in the places that
 * never re-rendered — the core navigation above all (frontend review, 2026-10-25). The theme is now
 * resolved after the first paint for the whole tree, so every screen and the shell bar have to be
 * dark, not just the screen content.
 */
const DARK_BACKGROUND = 'rgb(14, 20, 24)'; // themes.dark.colors.background
const DARK_SURFACE = 'rgb(22, 30, 35)'; // themes.dark.colors.surface

const SHELL_ROUTES = [
  '/discover',
  '/zone-details',
  '/alerts',
  '/visits',
  '/privacy-settings',
  '/downloads',
  '/saved-spots',
  '/active-visit',
  '/your-data',
  '/terms-privacy',
  '/zone-reports',
  '/route-to-zone',
  '/post-visit-feedback',
  '/account-security',
];

const ONBOARDING_ROUTES = [
  '/',
  '/sign-in',
  '/create-account',
  '/forgot-password',
  '/location-consent',
];

const MARKETPLACE_ROUTES = [
  '/marketplace',
  '/marketplace-listing',
  '/marketplace-chat',
  '/marketplace-order',
];

test.use({ colorScheme: 'dark' });

async function hasBackground(page: Page, colour: string): Promise<boolean> {
  return page.evaluate(
    (value) =>
      [...document.querySelectorAll('div')].some(
        (element) => getComputedStyle(element).backgroundColor === value,
      ),
    colour,
  );
}

test.describe('every screen in the dark scheme', () => {
  for (const route of [...SHELL_ROUTES, ...ONBOARDING_ROUTES, ...MARKETPLACE_ROUTES]) {
    test(`${route} paints its page dark`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'networkidle' });

      await expect.poll(() => hasBackground(page, DARK_BACKGROUND)).toBe(true);
    });
  }
});

test.describe('the shell bar in the dark scheme', () => {
  for (const route of SHELL_ROUTES) {
    test(`${route} paints the core navigation dark`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'networkidle' });

      // This is the element that stayed light on every screen when only the route content
      // re-rendered after hydration.
      await expect
        .poll(() =>
          page
            .locator('[data-testid="core-navigation"]')
            .evaluate((element) => getComputedStyle(element).backgroundColor),
        )
        .toBe(DARK_SURFACE);
    });
  }
});
