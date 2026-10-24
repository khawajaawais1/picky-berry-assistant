import { expect, test } from '@playwright/test';

/**
 * What the app must **not** do once it is built for people rather than for us, checked in a real
 * production export rather than in the source that produces it.
 *
 * This file exists because of how `EXPO_PUBLIC_*` reaches the app: the value is substituted by
 * the build, and only for a literal `process.env.EXPO_PUBLIC_<NAME>` read. When
 * `src/config/env.ts` looked the name up through a variable instead, nothing was substituted,
 * the read came back unset in every bundle, and `appEnvironment()` therefore answered
 * `development` in a production build — which is how a production export came to accept the
 * sign-in stand-in and to mount the sign-in prototype. Jest cannot hold this: Node's
 * `process.env` is a real object with real values, so the unit tests pass either way. Only the
 * built bundle can fail, and that is what these cases hold to.
 *
 * Every rule below is the account seam's or a prototype's own promise, checked where a user would
 * meet the
 * break — and a prototype's promise is checked on **every route it borrows**, because the
 * community map's readings answer “which screen” as well as “which shape”.
 */
test.describe('the production export', () => {
  test('offers no account creation, sign-in or reset where nothing can answer', async ({
    page,
  }) => {
    // ADR-054 §8, ADR-059, ADR-062: a shipped build has no account service, so every action that
    // would reach it is drawn disabled. Typing a complete credential must not change that.
    await page.goto('/create-account');
    await page.getByLabel('Your name').fill('Aino Korhonen');
    await page.getByLabel('Email address').fill('aino@example.fi');
    await page.getByRole('textbox', { name: 'Password' }).fill('berries1234');
    await page.getByRole('checkbox', { name: /I agree to the Terms/ }).click();

    await expect(page.getByRole('button', { name: 'Create account' })).toBeDisabled();
    await expect(page).toHaveURL(/\/create-account$/);

    await page.goto('/sign-in');
    await page.getByRole('textbox', { name: 'Email address' }).fill('aino@example.fi');
    await page.getByRole('textbox', { name: 'Password' }).fill('berries1234');

    await expect(page.getByRole('button', { name: 'Sign in' })).toBeDisabled();
    await expect(page).toHaveURL(/\/sign-in$/);

    await page.goto('/forgot-password');
    await page.getByRole('textbox', { name: 'Email address' }).fill('aino@example.fi');

    await expect(page.getByRole('button', { name: 'Request reset link' })).toBeDisabled();
    await expect(page).toHaveURL(/\/forgot-password$/);
  });

  test('mounts no prototype on the route that carries one for review', async ({ page }) => {
    await page.goto('/create-account?variant=B');

    // The same URL that shows a variant in a development build shows screen 03 here.
    await expect(page.getByText('Create your account')).toBeVisible();
    await expect(page.getByText('PROTOTYPE')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Next variant' })).toHaveCount(0);
  });

  test('mounts no prototype on the three routes the community-map readings live on', async ({
    page,
  }) => {
    // A shipped build draws the app's own screen on each of them: the map with no layer over it,
    // the zone's own figures with no shared list, and the picker's own plan with no cards.
    await page.goto('/discover?variant=A');
    await expect(page.getByTestId('zone-map')).toBeVisible();
    await expect(page.getByText('PROTOTYPE')).toHaveCount(0);

    await page.goto('/zone-details?variant=B');
    await expect(page.getByTestId('zone-yield-score')).toHaveText('78');
    await expect(page.getByText('PROTOTYPE')).toHaveCount(0);

    await page.goto('/saved-spots?variant=C');
    await expect(page.getByTestId('saved-spots-browse')).toBeVisible();
    await expect(page.getByText('PROTOTYPE')).toHaveCount(0);

    await expect(page.getByRole('button', { name: 'Next variant' })).toHaveCount(0);
  });
});
