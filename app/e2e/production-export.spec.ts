import { expect, test } from '@playwright/test';

/**
 * What the app must **not** do once it is built for people rather than for us, checked in a real
 * production export rather than in the source that produces it.
 *
 * This file exists because of how `EXPO_PUBLIC_*` reaches the app: the value is substituted by
 * the build, and only for a literal `process.env.EXPO_PUBLIC_<NAME>` read. When
 * `src/config/env.ts` looked the name up through a variable instead, nothing was substituted,
 * the read came back unset in every bundle, and `appEnvironment()` therefore answered
 * `development` in a production build — which is how a production export came to accept screen
 * 04's stand-in code and to mount the sign-in prototype. Jest cannot hold this: Node's
 * `process.env` is a real object with real values, so the unit tests pass either way. Only the
 * built bundle can fail, and that is what these cases hold to.
 *
 * Every rule below is ADR-027's or a prototype's own promise, checked where a user would meet the
 * break — and a prototype's promise is checked on **every route it borrows**, because the
 * community map's readings answer “which screen” as well as “which shape”.
 */
test.describe('the production export', () => {
  test('refuses screen 04’s stand-in code and offers no action that could accept one', async ({
    page,
  }) => {
    await page.goto('/verify-email');

    // ADR-027: in a production build the action is drawn disabled, because nothing there can
    // check a code — and typing the stand-in this repository documents must not change that.
    const action = page.getByRole('button', { name: 'Verify & continue' });
    await expect(action).toBeDisabled();

    await page.getByRole('textbox', { name: 'Verification code' }).fill('000000');

    await expect(action).toBeDisabled();
    await expect(page).toHaveURL(/\/verify-email$/);
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
