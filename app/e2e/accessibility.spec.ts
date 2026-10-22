import { expect, test, type Page } from '@playwright/test';

import { controlsOn, readInFlight, readPage, routesOfTheApp } from './a11y-tree';
import { makePlatformStorageAsynchronous } from './platform-storage';
import {
  PROTOTYPE_READINGS,
  readingsOffTheirPrototype,
  undescribedReadings,
} from './prototype-readings';

/**
 * The states of the two consent controls, checked in the **built** web export rather than in
 * a Jest render.
 *
 * That is where this belongs, because the defect these tests exist for is created by the
 * target and not by the component: `react-native-web` renders a Pressable with the checked
 * state in `accessibilityState` and writes **no** `aria-checked`, so a browser's accessibility
 * tree had the state nowhere but the glyph's colour — a colour alone is never a state
 * (AGENTS.md §11.2). Jest cannot see it (React Native folds `aria-*` into its accessibility
 * state before the host element exists), a browser can, and the containers here are the same
 * code the app ships. The unit tests still hold the native contract — role, name, state —
 * so adding a case here is the web half of it, not a replacement.
 *
 * The record is checked at the same time, through the interface a user has: the switch writes
 * it, and the onboarding row reads it back (ADR-020).
 */

const CONSENT =
  'I consent to visit tracking while the app is open. I can turn it off in Privacy settings.';
const CONSENT_KEY = 'picky.privacy-consent.v2';
/**
 * The device's report queue, as `AsyncStorage` holds it on the web target: the spec writes it
 * where it needs a visit the app did not make in this run (frame 11's period filter), and reads it
 * back where it needs the proof that a save really landed (the visit flow).
 */
const QUEUE_KEY = 'picky.report-queue.v1';

test.describe('the consent controls in the built web app', () => {
  test('the onboarding checklist exposes its checked state, which nothing else there carries', async ({
    page,
  }) => {
    await page.goto('/location-consent');
    const consent = page.getByRole('checkbox', { name: CONSENT });
    await expect(consent).toBeVisible();
    await expect(consent).toHaveAttribute('aria-checked', 'false');

    await consent.click();

    // The screen still starts unchecked, and one press is the affirmative action that
    // changes the state a screen reader announces.
    await expect(consent).toHaveAttribute('aria-checked', 'true');

    // The state that press produced: the checkbox a screen reader is now told is checked, and the
    // action it just enabled, read as a tree rather than as one attribute.
    await expectTreeReadable(page, '/location-consent, after consenting');
  });

  test('the privacy switch shows the record, and writes what the user chooses', async ({
    page,
  }) => {
    await page.goto('/location-consent');
    await page.getByRole('checkbox', { name: CONSENT }).click();
    await expect(page.getByRole('checkbox', { name: CONSENT })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(
      JSON.parse((await page.evaluate((key) => localStorage.getItem(key), CONSENT_KEY)) ?? '{}'),
    ).toMatchObject({ visitTracking: true });

    // The screen the consent sentence promises, reached the way the app reaches it.
    await page.goto('/privacy-settings');
    const tracking = page.getByRole('switch', { name: 'Visit tracking while the app is open' });
    await expect(tracking).toBeVisible();
    await expect(tracking).toBeChecked();

    // Withdrawal: the same one press, and the onboarding row reads the record back.
    await tracking.click();
    await expect(tracking).not.toBeChecked();
    expect(
      JSON.parse((await page.evaluate((key) => localStorage.getItem(key), CONSENT_KEY)) ?? '{}'),
    ).toMatchObject({ visitTracking: false });

    // Withdrawn: the switch the user just turned off, read as the tree they meet afterwards.
    await expectTreeReadable(page, '/privacy-settings, after withdrawing consent');

    await page.goto('/location-consent');
    await expect(page.getByRole('checkbox', { name: CONSENT })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    await expect(page.getByRole('button', { name: 'Continue to the map' })).toBeDisabled();
  });
});

/**
 * The chip rows: screen 03's identifier pair and frame 10's picker answers, checked in the built
 * web export for the reason the consent controls above are.
 *
 * `ChoiceChips` carried `accessibilityState` alone, which is the spelling iOS and Android read;
 * on this target that left a chosen chip with nothing but its fill colour saying so. It was found
 * through the sign-in prototype's variant B, which is the same component, and the fix is the
 * second spelling the checkbox already used. Jest cannot hold this case: React Native folds
 * `aria-checked` into `accessibilityState` before the host element exists, so the attribute is
 * only ever there in a browser.
 */
test.describe('the chip rows in the built web app', () => {
  test('states which identifier is chosen, and the field the choice moves', async ({ page }) => {
    await page.goto('/create-account');

    const email = page.getByRole('radio', { name: 'Email' });
    const phone = page.getByRole('radio', { name: 'Phone number' });
    await expect(email).toHaveAttribute('aria-checked', 'true');
    await expect(phone).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByRole('textbox', { name: 'Email address' })).toBeVisible();

    await phone.click();

    // The state moves with the selection rather than being set once, and the screen really is
    // in the mode the chip claims: the field behind it is the phone one.
    await expect(email).toHaveAttribute('aria-checked', 'false');
    await expect(phone).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('textbox', { name: 'Phone number' })).toBeVisible();

    // The chosen chip and the field the choice swapped in, read together afterwards: a radio group
    // whose selection reaches the tree and a field whose name reaches it are two different promises.
    await expectTreeReadable(page, '/create-account, with the phone number chosen');
  });

  test('states which answer is chosen in the picker’s rating rows', async ({ page }) => {
    await page.goto('/post-visit-feedback');

    const bilberry = page.getByRole('radio', { name: 'Bilberry' });
    await expect(bilberry).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByRole('radio', { name: 'Lingonberry' })).toHaveAttribute(
      'aria-checked',
      'true',
    );

    await bilberry.click();

    await expect(bilberry).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('radio', { name: 'Lingonberry' })).toHaveAttribute(
      'aria-checked',
      'false',
    );

    // The frame's five-cell yield rating is the same radio group and was the one this half was
    // missing: its chosen cell carried `accessibilityState` alone, so on this target the answer
    // was the cell's fill colour and nothing a screen reader was told. Found by the walk over
    // every screen below; kept as a named case because a person should be able to read the defect
    // rather than infer it from a count.
    const good = page.getByRole('radio', { name: 'Good' });
    await expect(good).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('radio', { name: 'Lots' })).toHaveAttribute(
      'aria-checked',
      'false',
    );

    await page.getByRole('radio', { name: 'Lots' }).click();

    await expect(page.getByRole('radio', { name: 'Lots' })).toHaveAttribute('aria-checked', 'true');
    await expect(good).toHaveAttribute('aria-checked', 'false');

    // Both rows answered, which is the state the screen is actually filled in when the picker saves
    // it — and the state whose group states a screen reader has to be able to read back.
    await expectTreeReadable(page, '/post-visit-feedback, with both answers chosen');
  });

  test('states the visit history’s period, and what the choice does to the list', async ({
    page,
  }) => {
    // Frame 11's period chips, over a visit the app did not make in this run: a September report,
    // written the way the device's store holds one, while the design's own chip is its August 2026.
    await page.goto('/visits');
    await page.evaluate(
      (key) =>
        localStorage.setItem(
          key,
          JSON.stringify([
            {
              amountText: '2.4 kg',
              minutes: 41,
              recordedAt: '2026-09-14T09:20:00.000Z',
              speciesId: 'bilberry',
              yieldRating: 5,
              zoneId: 'Z21',
            },
          ]),
        ),
      QUEUE_KEY,
    );
    await page.reload();

    const month = page.getByRole('radio', { name: 'August 2026' });
    const all = page.getByRole('radio', { name: 'All visits' });

    // The screen opens on every visit the phone holds — the period that holds the visit screen 10
    // has just saved — and says so on one line under the heading.
    await expect(all).toHaveAttribute('aria-checked', 'true');
    await expect(month).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByTestId('season-history-count')).toHaveText('All visits · 4 visits');
    await expect(page.getByTestId('season-history-0')).toContainText('Zone 21 · Bilberry');

    await month.click();

    // The design's own month: its three sample visits, the picker's September one filtered off the
    // list, and the line that says so — the row the archetype would otherwise hide in silence.
    await expect(month).toHaveAttribute('aria-checked', 'true');
    await expect(all).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByTestId('season-history-count')).toHaveText('August 2026 · 3 visits');
    await expect(page.getByTestId('season-history-outside')).toHaveText(
      '1 visit outside this period',
    );
    await expect(page.getByTestId('season-history-0')).toContainText('Zone 14 · Lingonberry');

    // The filtered list and its “1 visit outside this period” row, read as a tree: the choice just
    // made is the screen's whole state, and the row is what says so for whoever cannot see the list.
    await expectTreeReadable(page, '/visits, after switching to the design’s month');
  });
});

/**
 * Screen 03's terms link, which the frame draws beside its consent row and the app had nowhere to
 * send: it was an inert label until the device notice existed (ADR-039), and the route now wires
 * the two together (ADR-043). This is the half a Jest render cannot hold — that the link the screen
 * draws really lands on the notice — and it is checked through the interface a user has.
 */
test.describe('the onboarding links in the built web app', () => {
  test('opens the device notice from screen 03’s terms link', async ({ page }) => {
    await page.goto('/create-account');

    await page.getByRole('button', { name: 'Read terms & privacy' }).click();

    await expect(page).toHaveURL(/\/terms-privacy$/);
    // The notice: what this phone is holding, record by record, and what the user can do about each.
    // It is the destination the consent line's link needed, and the reason that link is no longer
    // drawn as a label nothing can press.
    await expect(page.getByTestId('terms-privacy-held-card')).toBeVisible();

    // The notice as one arrives at it from screen 03's link, rather than as the walk finds it: the
    // same screen, read on the way a person gets there.
    await expectTreeReadable(page, '/terms-privacy, reached from screen 03’s terms link');
  });
});

/**
 * Screen 04's **phone state**, in the built app: the state the frame does not draw.
 *
 * It belongs in a browser because the branch is the route's decision rather than the screen's — the
 * screen is handed the kind of destination the flow is holding (ADR-049 §3), and only a real walk
 * through screen 03 can say that the number a picker typed arrives on the code screen under the
 * number's own words. The unit test holds the screen's two states; this holds the wiring that
 * chooses between them, and reads the tree of the state that only exists after the press.
 */
test.describe('screen 04 on a phone destination in the built web app', () => {
  test('carries a number from screen 03 into the number’s own words', async ({ page }) => {
    await page.goto('/create-account');

    await page.getByRole('radio', { name: 'Phone number' }).click();
    await page.getByLabel('Your name').fill('Aino Korhonen');
    await page.getByRole('textbox', { name: 'Phone number' }).fill('+358 40 123 4567');
    // By role rather than by label, for the reason the account journey gives: the field's own
    // “Show password” control carries the word in its accessible name too.
    await page.getByRole('textbox', { name: 'Password' }).fill('berries1234');
    await page.getByRole('checkbox', { name: /I agree to the Terms/ }).click();
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page).toHaveURL(/\/verify-email$/);

    // The number, not the frame's address: the title and the only way back to the field follow the
    // identifier the flow is holding (ADR-049 §3.1–§3.2, assumed by the repository on 2026-10-13).
    await expect(page.getByText('Verify your number', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Change phone number' })).toBeVisible();
    await expect(page.getByText('Verify your email', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Change email address', { exact: true })).toHaveCount(0);
    // The frame's foot card asks whether the reader signed up by phone *instead* — the email
    // journey's question, so this state does not draw it (ADR-049 §3.3).
    await expect(page.getByTestId('verification-phone-note')).toHaveCount(0);
    // And the destination is named where the frame names it, as the picker typed it.
    await expect(page.getByText('Enter the 6-digit code for +358 40 123 4567.')).toBeVisible();

    await expectTreeReadable(page, '/verify-email, reached from screen 03 as a phone sign-up');
  });
});

/**
 * The app shell: the core navigation the design draws on frames 06–14, and the routing it does.
 *
 * This belongs in a browser because the bar's states are written by the target — `role="tablist"`
 * of `role="tab"`s with `aria-selected` on the current one — and because a tab is only a tab if
 * pressing it really goes somewhere. The unit tests hold the bar's own contract (four tabs, one
 * selected, the press reported); this is the half that says which screen belongs to which
 * destination and that the four destinations are the routes the design drew them as.
 */
test.describe('the app shell in the built web app', () => {
  /** Every route in the shell, and the destination its frame draws as current. */
  const SCREEN_TAB: readonly { path: string; tab: string }[] = [
    { path: '/discover', tab: 'Discover' },
    { path: '/zone-details', tab: 'Discover' },
    { path: '/zone-reports', tab: 'Discover' },
    { path: '/route-to-zone', tab: 'Discover' },
    { path: '/active-visit', tab: 'Visits' },
    { path: '/post-visit-feedback', tab: 'Visits' },
    { path: '/visits', tab: 'Visits' },
    { path: '/alerts', tab: 'Alerts' },
    { path: '/downloads', tab: 'Profile' },
    { path: '/privacy-settings', tab: 'Profile' },
    { path: '/account-security', tab: 'Profile' },
    { path: '/terms-privacy', tab: 'Profile' },
    { path: '/your-data', tab: 'Profile' },
  ];

  const TABS = ['Discover', 'Visits', 'Alerts', 'Profile'];

  for (const { path, tab } of SCREEN_TAB) {
    test(`${path} is drawn under the ${tab} destination, and only that one`, async ({ page }) => {
      await page.goto(path);

      await expect(page.getByRole('tablist', { name: 'Main navigation' })).toBeVisible();

      for (const name of TABS) {
        const destination = page.getByRole('tab', { name });
        await expect(destination).toBeVisible();
        await expect(destination).toHaveAttribute('aria-selected', String(name === tab));
      }
    });
  }

  test('moves between destinations from the bar, and back the way it came', async ({ page }) => {
    await page.goto('/discover');

    await page.getByRole('tab', { name: 'Visits' }).click();
    await expect(page).toHaveURL(/\/visits$/);
    await expect(page.getByRole('tab', { name: 'Visits' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await expectTreeReadable(page, '/visits, reached from the bar');

    await page.getByRole('tab', { name: 'Alerts' }).click();
    await expect(page).toHaveURL(/\/alerts$/);
    await expect(page.getByRole('tab', { name: 'Alerts' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await expectTreeReadable(page, '/alerts, reached from the bar');

    // The destination the user came from is still back there: the shell keeps the app's history
    // rather than swallowing it, so the platform back gesture has somewhere to go.
    await page.goBack();
    await expect(page).toHaveURL(/\/visits$/);
  });

  test('keeps the settings out of every header, where only the profile page holds them', async ({
    page,
  }) => {
    // A gear sat at the header's top right on the three destinations whose header row is their own
    // (2026-10-22). The owner took it out the same day: the top bar carries the frame's heading and
    // nothing else, and the settings are reached from the Profile tab, which opens the page holding
    // them. This is the browser's half of that — the header is drawn by the screen template, which
    // a Jest render can see, but only the built app proves no route grew the control back.
    for (const path of ['/discover', '/visits', '/alerts', '/privacy-settings']) {
      await page.goto(path);

      await expect(page.getByRole('button', { name: 'Settings' })).toHaveCount(0);
    }
  });

  test('is absent on onboarding, which the design draws without a bar', async ({ page }) => {
    await page.goto('/location-consent');

    await expect(page.getByRole('tablist')).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Discover' })).toHaveCount(0);
  });
});

/**
 * The route wiring frame 06's card does, checked where the wiring actually lives.
 *
 * The card's press is reported by the feature and the route decides where it leads (the
 * feature imports no router), so the unit tests cannot see the destination at all: they
 * assert the press is reported and nothing more. This is the half that proves the promise the
 * card's own accessible name makes — that pressing it opens the zone screen — and that the
 * frame's back control comes back.
 */
test.describe('the zone card’s destination in the built web app', () => {
  test('opens the zone screen its accessible name names, and comes back from it', async ({
    page,
  }) => {
    await page.goto('/discover');
    const card = page.getByRole('button', { name: 'Open zone 14 details' });
    await expect(card).toBeVisible();

    await card.click();

    // The same zone, the same score: screen 07 describes the zone the card was about.
    await expect(page).toHaveURL(/\/zone-details$/);
    await expect(page.getByText('Zone 14 · Laajavuori')).toBeVisible();
    // By its own handle rather than by its text: the router keeps the screen it left in the
    // DOM, so “78” is also the badge and the chip on frame 06.
    await expect(page.getByTestId('zone-yield-score')).toHaveText('78');

    // The screen the card just opened, with the bar's Discover destination now current — the state
    // no at-rest walk reaches, because a freshly loaded export has no history behind the screen.
    await expectTreeReadable(page, '/zone-details, opened from the map card');

    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page).toHaveURL(/\/discover$/);
  });

  test('carries the walk on to the route screen, and cancels back to the zone', async ({
    page,
  }) => {
    await page.goto('/discover');
    await page.getByRole('button', { name: 'Open zone 14 details' }).click();
    await expect(page).toHaveURL(/\/zone-details$/);

    // The zone screen's action names the walk; the screen it opens prints the same figure
    // (frame 07's “Navigate · 1.4 km” leads to frame 08's card).
    await page.getByRole('button', { name: 'Navigate · 1.4 km' }).click();

    await expect(page).toHaveURL(/\/route-to-zone$/);
    await expect(page.getByText('To Zone 14')).toBeVisible();
    await expect(page.getByTestId('route-distance')).toHaveText('1.4 km');
    await expect(page.getByTestId('zone-map-route')).toBeVisible();

    await expectTreeReadable(page, '/route-to-zone, reached from the zone’s own action');

    // The frame's own way out, which the route has to supply for both an in-app and a deep
    // entry: here it is the history entry the click just made.
    await page.getByRole('button', { name: 'Cancel route' }).click();
    await expect(page).toHaveURL(/\/zone-details$/);

    await expectTreeReadable(page, '/zone-details, returned from the route');
  });
});

/**
 * The list behind frame 07's own “See all 11” — **the app-drawn screen the design never drew**
 * (ADR-044).
 *
 * It belongs in a browser because the press, the destination and what the destination says are
 * three different files: the row is a control only when the route gives it the list to open, the
 * route decides where that press leads, and the screen it lands on states the design's sample week
 * and the phone's own record as two different things. A Jest render holds the strings; only the
 * built page holds the route between them.
 */
test.describe('the zone’s report list in the built web app', () => {
  test('opens from the zone screen’s link, and states what it can and cannot show', async ({
    page,
  }) => {
    await page.goto('/zone-details');

    // The frame's own words stay the visible label, and the accessible name says where the press
    // leads — because the frame's eleven and this phone's own list are not the same thing.
    await page.getByRole('button', { name: /See all 11 reports/ }).click();

    await expect(page).toHaveURL(/\/zone-reports$/);
    // The design's own week, said as the sample it is and read from the zone's own figures.
    await expect(page.getByTestId('zone-reports-sample')).toHaveText(/11 reports/);
    // This build's phone holds nothing for the zone, and the screen says so rather than standing the
    // design's eleven in for the picker's own record.
    await expect(page.getByTestId('zone-reports-empty')).toBeVisible();
    // And the half nothing can return yet is named rather than faked.
    await expect(page.getByTestId('zone-reports-missing')).toBeVisible();

    await expectTreeReadable(page, '/zone-reports, opened from the zone screen');

    // The frame draws a back control on the screen that opens it, so the way back is the history
    // entry the press just made.
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page).toHaveURL(/\/zone-details$/);

    await expectTreeReadable(page, '/zone-details, returned from the report list');
  });
});

/**
 * The planned marketplace, end to end in the built app: the browse screen's search really narrows
 * the list, the card it leaves opens the listing, the listing reaches the seller's thread, and the
 * thread reaches the order it is about (frames 15–18).
 *
 * It is also where two of the marketplace's own rules are checked on a real page: the four screens
 * are **outside the app shell** (their frames draw no navigation bar), and the thread's composer
 * and the order's provider actions are drawn without claiming a role — nothing sends a message and
 * nothing holds a payment, so nothing may announce a control that cannot act.
 */
test.describe('the marketplace in the built web app', () => {
  test('searches, opens the listing, and carries it through the thread to the order', async ({
    page,
  }) => {
    await page.goto('/marketplace');

    await expect(page.getByText('The local harvest')).toBeVisible();
    await expect(page.getByText('Fresh blueberries')).toBeVisible();
    await expect(page.getByText('Wild lingonberries')).toBeVisible();

    // The search is the one control on this screen that acts, so it is the one that is checked
    // here: the list narrows to what was typed and the count says so.
    await page.getByLabel('Berries near Jyväskylä').fill('lingon');
    await expect(page.getByText('Fresh blueberries')).toHaveCount(0);
    await expect(page.getByText('Wild lingonberries')).toBeVisible();
    await expect(page.getByText('Browse 1 local listing')).toBeVisible();

    // The narrowed list, read as a tree: the search's own field, the count it produced and the one
    // card left standing are what a screen reader has to be given after a keystroke.
    await expectTreeReadable(page, '/marketplace, with the search narrowed');

    await page.getByLabel('Berries near Jyväskylä').fill('');

    // The one card with a screen behind it opens it, and the other one is not an action at all.
    await expect(page.getByRole('button', { name: 'Open Wild lingonberries' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Open Fresh blueberries' }).click();

    await expect(page).toHaveURL(/\/marketplace-listing$/);
    await expect(page.getByText('Forest to your table.')).toBeVisible();
    await expect(page.getByText('Bilberry · 20 kg available')).toBeVisible();

    await expectTreeReadable(page, '/marketplace-listing, opened from the card');

    await page.getByRole('button', { name: 'Contact Matti Laine' }).click();

    await expect(page).toHaveURL(/\/marketplace-chat$/);
    await expect(
      page.getByText('Hi Matti! Could I get 5 kg of blueberries this evening?'),
    ).toBeVisible();

    // The composer is drawn and is not a field: no transport exists, so a textbox here would be a
    // promise the app cannot keep.
    await expect(page.getByTestId('market-chat-composer')).toBeVisible();
    await expect(page.getByRole('textbox')).toHaveCount(0);

    await expectTreeReadable(page, '/marketplace-chat, opened from the listing');

    await page.getByRole('button', { name: 'View order summary · €40' }).click();

    await expect(page).toHaveURL(/\/marketplace-order$/);
    await expect(page.getByText('Total held')).toBeVisible();

    await expectTreeReadable(page, '/marketplace-order, opened from the thread');

    // Confirming receipt releases a payment and a dispute freezes one; neither exists here.
    await expect(page.getByRole('button', { name: 'Confirm berries received' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Open dispute' })).toHaveCount(0);

    // The order's one real action is the thread it came from, and it comes back there.
    await page.getByRole('button', { name: 'Message Matti Laine' }).click();
    await expect(page).toHaveURL(/\/marketplace-chat$/);

    await expectTreeReadable(page, '/marketplace-chat, returned from the order');
  });

  test('draws no core navigation, which the marketplace frames do not draw', async ({ page }) => {
    await page.goto('/marketplace');

    await expect(page.getByRole('tablist')).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Discover' })).toHaveCount(0);
  });
});

/**
 * The visit and its report, end to end in the built app: the walk opens the visit, the timer
 * runs and holds, the visit ends in the quick report, and the report is really written to the
 * device's queue — which is the one thing frame 10's own copy promises (“Your visit and report
 * stay on this phone”).
 *
 * The reading is checked through its accessible name rather than its pixels: it is one reading
 * for assistive technology even though it is painted in parts, and that contract is only visible
 * in a real accessibility tree. On the web target the queue is `localStorage`, which is where
 * `AsyncStorage` puts a device's store — the same place the consent record is asserted above.
 */
test.describe('the visit flow in the built web app', () => {
  test('opens the visit from the walk, holds its clock, and saves the report it ends in', async ({
    page,
  }) => {
    await page.goto('/route-to-zone');
    await page.getByRole('button', { name: 'Start walking' }).click();

    await expect(page).toHaveURL(/\/active-visit$/);
    await expect(page.getByText('Picking in Zone 14')).toBeVisible();

    const reading = page.getByTestId('visit-timer');
    await expect(reading).toHaveAttribute('aria-label', /^\d{2}:\d{2}:\d{2}$/);

    // The visit as the walk's own route does not draw it: running, with the timer live and the
    // screen's one action offering to hold it.
    await expectTreeReadable(page, '/active-visit, opened from the walk');

    // Pausing holds the reading: the same label after two seconds of a stopped clock.
    await page.getByRole('button', { name: 'Pause visit' }).click();
    const held = await reading.getAttribute('aria-label');
    await page.waitForTimeout(2_000);
    await expect(reading).toHaveAttribute('aria-label', held ?? '');
    await expect(page.getByRole('button', { name: 'Resume visit' })).toBeVisible();

    // Paused is a different screen to a screen reader than running is — the action swapped its name
    // and the clock stopped — so it is read as its own state.
    await expectTreeReadable(page, '/active-visit, while the visit is paused');

    await page.getByRole('button', { name: 'End visit' }).click();
    await expect(page).toHaveURL(/\/post-visit-feedback$/);
    await expect(page.getByText('How was the picking?')).toBeVisible();

    await expectTreeReadable(page, '/post-visit-feedback, reached by ending the visit');

    // The picker's own answers, then the frame's save action.
    await page.getByRole('radio', { name: 'Bilberry' }).click();
    await page.getByRole('radio', { name: 'Lots' }).click();
    await page.getByRole('button', { name: 'Save report offline' }).click();

    await expect(page).toHaveURL(/\/visits$/);
    const queued: unknown = JSON.parse(
      (await page.evaluate((key) => localStorage.getItem(key), QUEUE_KEY)) ?? '[]',
    );

    expect(queued).toHaveLength(1);
    expect(queued).toMatchObject([
      { minutes: 52, speciesId: 'bilberry', yieldRating: 5, zoneId: 'Z14' },
    ]);

    // The half that makes the queue a record rather than a promise: the screen the save leads
    // to is the picker's own history, and the report they just made is the top of it. This is
    // the copy AGENTS.md §11.1 asks every stored field to be able to answer for.
    const newest = page.getByTestId('season-history-0');
    await expect(newest).toContainText('Zone 14 · Bilberry');
    // The visit's own 52 minutes, and no harvest: the amount field was left empty, and a row
    // does not invent one.
    await expect(newest).toContainText(/\d+ \w+ · 52 min/);
    await expect(newest).toContainText('Queued');

    // The history with the report the user just made in it — the one state of this screen that no
    // freshly loaded export has, and the one the save action leads to.
    await expectTreeReadable(page, '/visits, after saving the report');
  });

  test('shows the same report waiting in the sync centre, reached the way the app reaches it', async ({
    page,
  }) => {
    // The report is made the way the app makes one, so the screen below reads a real queue.
    await page.goto('/post-visit-feedback');
    await page.getByRole('button', { name: 'Save report offline' }).click();
    await expect(page).toHaveURL(/\/visits$/);

    // In through the app's own door: frame 14's “Offline maps & sync” row, whose value is the
    // queue's own count.
    await page.goto('/privacy-settings');
    await expect(page.getByTestId('privacy-sync-row')).toContainText('1 queued');
    await page.getByRole('button', { name: 'Offline maps & sync' }).click();
    await expect(page).toHaveURL(/\/downloads$/);

    await expectTreeReadable(page, '/downloads, reached from the settings row');

    // Frame 13's heading counts what is waiting, and the row is the frame's own line with the
    // picker's own values — including the rating, on the design's 1–5 scale.
    await expect(page.getByText('Waiting to sync · 1 report')).toBeVisible();
    const row = page.getByTestId('offline-report-0');
    await expect(row).toContainText('Zone 14 · Lingonberry');
    await expect(row).toContainText('52 min · Yield 4 / 5');
    await expect(row).toContainText('Queued · visit + report');

    // What the frame promises here is a retry (“will retry automatically”), and nothing has been
    // sent at all: the screen says what is true (ADR-005).
    await expect(
      page.getByText(
        'Saved on this phone. Nothing has been sent yet — syncing arrives with the server.',
      ),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry sync' })).toHaveCount(0);
  });

  test('writes nothing when the picker skips the report', async ({ page }) => {
    await page.goto('/post-visit-feedback');
    await page.getByRole('button', { name: 'Skip report for now' }).click();

    await expect(page).toHaveURL(/\/discover$/);
    expect(await page.evaluate((key) => localStorage.getItem(key), QUEUE_KEY)).toBeNull();

    // Skipping is a press too, and where it lands is the screen the app opens on: read here rather
    // than assumed to be the walk's own /discover.
    await expectTreeReadable(page, '/discover, after skipping the report');
  });
});

/**
 * The account and the picker's own plan, end to end in the built app: the sign-up the app really
 * performs (screen 03's form, screen 04's stand-in code, the session that comes out of it), the
 * settings screen reading that session back as **whose settings these are** (ADR-029), the
 * **saved plan** frame 14's row opens (ADR-030), and **sign out** deleting what this device holds
 * (`src/services/sign-out.ts`).
 *
 * It is one journey on purpose: a session lives in the process rather than on the device
 * (ADR-028), so a reload cannot stand in for a step — every step below is a click on something
 * the app itself draws, which is also why this is the only place the account row can be asserted
 * at all (the layout harness opens a freshly loaded export, which holds no session).
 */
/**
 * The journey the design never drew (ADR-034): frame 01's own sign-in link, one identifier, the
 * code screen the sign-up already walks, and then **into the app** rather than on to screen 05 —
 * a returning user is not signing up. Nothing else can hold this: the destination after the code
 * is the route's decision, and the account row's fallback for a nameless session is a sentence
 * about what the app knows, so both are asserted where a person would meet them.
 */
test.describe('signing in, in the built web app', () => {
  test('leaves frame 01 through its own link and lands in the app with no name invented', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Already have an account? Sign in' }).click();
    await expect(page).toHaveURL(/\/sign-in$/);

    // Reading A's one field (ADR-034), and the code screen the app already has (ADR-027's
    // stand-in accepts `000000` outside a shipped build).
    await page.getByRole('textbox', { name: 'Email or phone' }).fill('aino@example.fi');
    await page.getByRole('button', { name: 'Continue with a code' }).click();
    await expect(page).toHaveURL(/\/verify-email$/);
    await page.getByLabel('Verification code').fill('000000');
    await page.getByRole('button', { name: 'Verify & continue' }).click();

    // Into the app, not on to screen 05: nothing here asked whether the user was signing up.
    await expect(page).toHaveURL(/\/discover$/);
    await expect(page.getByRole('tablist')).toBeVisible();

    // The app as a signed-in visitor meets it, which is the state the walk cannot open at all.
    await expectTreeReadable(page, '/discover, after signing in');

    // The account row names the account by the identifier the code belongs to, because the app has
    // no name for a returning account and must not invent one (ADR-038).
    await page.getByRole('tab', { name: 'Profile' }).click();
    await expect(page).toHaveURL(/\/privacy-settings$/);
    const account = page.getByTestId('privacy-account-row');
    await expect(account).toContainText('aino@example.fi');
    await expect(account).toContainText('Email verified');
    await expect(account).not.toContainText('Aino Korhonen');

    // The account row only exists because of the sign-in, so this is the only reading of it there
    // can be: reached through the bar, on a session this run acquired.
    await expectTreeReadable(page, '/privacy-settings, with the signed-in account');
  });
});

test.describe('the account and the plan in the built web app', () => {
  test('signs up, draws the account it holds, lists the plan, and signs out for real', async ({
    page,
  }) => {
    // Screen 03, filled the way its own rules ask (a name, an identifier, eight characters with a
    // number, and the consent row as the affirmative action it is).
    await page.goto('/create-account');
    await page.getByLabel('Your name').fill('Aino Korhonen');
    await page.getByLabel('Email address').fill('aino@example.fi');
    // By role rather than by label: the field's own “Show password” control carries the word in
    // its accessible name too, so a bare label lookup matches two elements (the run reports it
    // as Playwright's strict-mode violation, which is exactly the ambiguity to fix here).
    await page.getByRole('textbox', { name: 'Password' }).fill('berries1234');
    await page.getByRole('checkbox', { name: /I agree to the Terms/ }).click();
    await page.getByRole('button', { name: 'Create account' }).click();

    // Screen 04 with the stand-in code (ADR-027), and the session the port issues for it.
    await expect(page).toHaveURL(/\/verify-email$/);
    await page.getByLabel('Verification code').fill('000000');
    await page.getByRole('button', { name: 'Verify & continue' }).click();
    await expect(page).toHaveURL(/\/location-consent$/);

    // Screen 05's consent, and the way on into the app: the flow's own route, so the session
    // acquired a moment ago is still the one being held.
    await page.getByRole('checkbox', { name: /I consent to visit tracking/ }).click();
    await page.getByRole('button', { name: 'Continue to the map' }).click();
    await expect(page).toHaveURL(/\/discover$/);

    // A report waiting on the phone, written the way the device's store holds it: the deletion
    // below is measured against something, and the sync row has a count to print.
    await page.evaluate(
      (key) =>
        localStorage.setItem(
          key,
          JSON.stringify([
            {
              amountText: '',
              minutes: 52,
              recordedAt: '2026-08-28T10:55:00.000Z',
              speciesId: 'lingonberry',
              yieldRating: 4,
              zoneId: 'Z14',
            },
          ]),
        ),
      QUEUE_KEY,
    );

    // Frame 06's card opens the zone's own screen, whose bookmark writes the plan.
    await page.getByRole('button', { name: 'Open zone 14 details' }).click();
    await expect(page).toHaveURL(/\/zone-details$/);
    await page.getByRole('button', { name: 'Save zone' }).click();
    await expect(page.getByRole('button', { name: 'Remove zone from saved zones' })).toBeVisible();

    // The screen after the press: the same bookmark, now saying what the next press would do.
    await expectTreeReadable(page, '/zone-details, after saving the zone');

    // The plan is reached the way the app reaches it: the Profile destination, frame 14's settings
    // screen, and its own row.
    await page.getByRole('tab', { name: 'Profile' }).click();
    await expect(page).toHaveURL(/\/privacy-settings$/);

    // The account row: the session the sign-up produced, drawn back. Nothing here reads a name
    // the screen invented — it is what screen 03 collected and the port kept (ADR-029).
    const account = page.getByTestId('privacy-account-row');
    await expect(account).toContainText('Aino Korhonen');
    await expect(account).toContainText('AK');
    await expect(account).toContainText('aino@example.fi · Email verified');

    // The plan: the row counts what the device holds, and opens the list behind it.
    await expect(page.getByTestId('privacy-saved-spots-row')).toContainText('1');
    await expect(page.getByTestId('privacy-sync-row')).toContainText('1 queued');

    // The settings screen with an account, a plan and a queue on it — the only state of it that has
    // anything in its rows, and the one a user is in for the whole of this journey.
    await expectTreeReadable(page, '/privacy-settings, holding an account and a plan');

    await page.getByRole('button', { name: 'Saved spots' }).click();
    await expect(page).toHaveURL(/\/saved-spots$/);
    await expect(page.getByTestId('saved-spot-row-Z14')).toContainText('Zone 14 · Lingonberry');

    await expectTreeReadable(page, '/saved-spots, opened from the settings row');

    // Back to the settings screen through the bar (these screens are the Profile destination), and
    // then into the two remaining rows frame 14 draws and no frame draws screens for (ADR-039).
    await page.getByRole('tab', { name: 'Profile' }).click();
    await expect(page).toHaveURL(/\/privacy-settings$/);

    // The account surface: the account row drawn from the same session, and the session's own
    // facts — where it is kept, how long it lasts, what ends it.
    await page.getByRole('button', { name: 'Account & security' }).click();
    await expect(page).toHaveURL(/\/account-security$/);
    await expect(page.getByTestId('account-security-row')).toContainText('Aino Korhonen');
    await expect(page.getByText('An hour from the moment the code was accepted.')).toBeVisible();
    await expect(
      page.getByText('No password is stored, so there is none to change, reset or leak.', {
        exact: false,
      }),
    ).toBeVisible();

    await expectTreeReadable(page, '/account-security, opened from the settings row');

    // The notice: what this phone is holding, named record by record — the account the app is
    // holding a session for, the plan it saved on the zone's own screen, and the report it queued.
    await page.getByRole('tab', { name: 'Profile' }).click();
    await expect(page).toHaveURL(/\/privacy-settings$/);
    await page.getByRole('button', { name: 'Terms & privacy' }).click();
    await expect(page).toHaveURL(/\/terms-privacy$/);
    // Scoped to the card that holds the records: “Your account” also appears inside screen 03's
    // “Create your account” action, which a plain text query would match too.
    const held = page.getByTestId('terms-privacy-held-card');
    await expect(held.getByText('Your account')).toBeVisible();
    await expect(held.getByText('Saved spots')).toBeVisible();
    await expect(held.getByText('Visits waiting to sync')).toBeVisible();

    await expectTreeReadable(page, '/terms-privacy, opened from the settings row');

    // The copy (ADR-040), reached from the notice's own row: the screen names what it would hand
    // over, record by record, from the same store the notice just read.
    //
    // Its share action is asserted as *present* and deliberately not pressed: pressing it opens the
    // platform's share sheet, which is a state of the machine rather than of the app (a browser
    // without `navigator.share` answers “could not be handed over”, one with it opens a dialog), and
    // the harness has no business asserting either. The three outcomes are the unit test's.
    await page.getByRole('button', { name: 'Your data' }).click();
    await expect(page).toHaveURL(/\/your-data$/);
    // Named by record rather than by text: the plan and the queue both count one here, so a bare
    // “1” would match both. Each row carries its record's own testID for exactly that reason.
    await expect(page.getByTestId('your-data-record-account')).toContainText('aino@example.fi');
    await expect(page.getByTestId('your-data-record-consent')).toContainText('Visit tracking on');
    await expect(page.getByTestId('your-data-record-plan')).toContainText('Saved spots');
    await expect(page.getByTestId('your-data-record-plan')).toContainText('1');
    await expect(page.getByTestId('your-data-record-queue')).toContainText(
      'Visits waiting to sync',
    );
    await expect(page.getByTestId('your-data-record-queue')).toContainText('1');
    await expect(page.getByRole('button', { name: 'Share a copy' })).toBeVisible();

    await expectTreeReadable(page, '/your-data, opened from the notice');

    // Back to the settings screen, and then out: the one control in the app that deletes anything.
    await page.getByRole('tab', { name: 'Profile' }).click();
    await expect(page).toHaveURL(/\/privacy-settings$/);
    await page.getByRole('button', { name: 'Sign out' }).click();

    // The app's front door: signing out lands on the welcome screen, whose own link is the way
    // back in (ADR-034 — the sign-in screen the design never drew).
    await expect(page.getByRole('button', { name: 'Get started' })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Already have an account? Sign in' }),
    ).toBeVisible();

    await expectTreeReadable(page, '/, after signing out');

    // And nothing of the picker's is left on the device — the plan, the waiting report and the
    // consent are gone, which is what the control promised and what its failure state denies.
    const left = await page.evaluate(() => ({
      consent: localStorage.getItem('picky.privacy-consent.v2'),
      plan: localStorage.getItem('picky.saved-zones.v1'),
      queue: localStorage.getItem('picky.report-queue.v1'),
    }));

    expect(left).toEqual({ consent: null, plan: null, queue: null });
  });
});

/**
 * Every built screen's accessibility tree, walked in the built app.
 *
 * The cases above are the defects this project found by hand, one screen at a time: a consent
 * checkbox whose checked state the target dropped, chip rows whose selection lived in a fill
 * colour, a disabled action that had to say so. Each was found by a person reading a screen, and
 * each was found *later than it should have been* — so this is the same rule read
 * systematically, over every screen the app has, rather than per screen by hand:
 *
 * **every control a screen exposes has a role, an accessible name, and the state the page declares
 * for it** (AGENTS.md §11.2, SECURITY.md §11).
 *
 * Three things make it a walk rather than a snapshot of one page. The **routes are the app's own**
 * — read from `src/app`, the same way the screen inventory asserts them
 * (`src/config/__tests__/screen-inventory.test.ts`) — so a screen added tomorrow is walked
 * tomorrow, and the reach is asserted rather than assumed. The **tree is the browser's**, through
 * `ariaSnapshot`, because React Native folds `aria-*` into `accessibilityState` before a host
 * element exists: a Jest render can hold what the app intends and never what a screen reader is
 * given. And the **states are read in both directions** — a state the page declares and the tree
 * does not show is the dropped-`aria-checked` defect, and a flag the tree shows that nothing
 * declared is a reading the app never meant to give.
 *
 * What it deliberately does not flag: a control that *claims no role* because it cannot act. The
 * app draws those as readings (frame 15's filter chips, frame 17's composer, frame 12's switch
 * figure — AGENTS.md §11.2), and a walk that demanded a role there would be asking for the
 * opposite of the rule. What it cannot see is recorded in `e2e/a11y-tree.ts`: a state the app
 * keeps in React state and declares nowhere in the DOM, whether a name is a *good* name, and
 * whether a screen that draws a reading should have drawn a control.
 */
test.describe('the discover map in the built web app', () => {
  /**
   * Known issue 35, decided: the map is the screen's **content**, not decoration — it is how
   * Discover presents its zones — so its drawing carries a text alternative rather than being
   * hidden (WCAG 1.1.1), and the drawing is where that name belongs, because it is the node a
   * browser exposes. Measured: the container's own label reaches *nothing* here (a role-less `div`
   * computes to `generic`, where Chromium ignores `aria-label`), and before the fix these three
   * routes each read as a bare `- img` — no name, nothing for a screen reader but the word
   * “image”. The rule that holds it in general is the walk's (`e2e/a11y-tree.ts`): an image in the
   * tree with no accessible name is a finding.
   */
  for (const route of ['/discover', '/route-to-zone', '/active-visit']) {
    test(`${route} draws the map as a named image, with its own words beside it`, async ({
      page,
    }) => {
      await page.goto(route);

      await expect(page.locator('[data-testid="zone-map-drawing"]')).toBeVisible();

      // Asked for only once the tree says something: Chromium can answer with an **empty**
      // accessibility tree for a drawing that has just been painted, and an empty snapshot reads
      // exactly like a map with no name — the one thing this case exists to judge (found on a
      // cold CI runner, 2026-10-21, where two of these three routes came back empty while the
      // same routes passed on a warm one). Bounded, and the tree of this element alone: a map that
      // never names itself stays empty and fails the assertions below.
      let snapshot = '';
      await expect
        .poll(async () => (snapshot = await page.getByTestId('zone-map').ariaSnapshot()))
        .not.toBe('');

      expect(snapshot).toContain('- img "Map of nearby berry zones"');
      // The name is a text alternative, not a replacement: the places and zones the frame draws
      // are still the screen's own text, and nothing about them was hidden to make room for it.
      expect(snapshot).toContain('Laajavuori');
      expect(snapshot).not.toContain('- img\n');
    });
  }
});

test.describe('the review-only prototype surfaces in the built web app', () => {
  /**
   * The prototypes are **review paper**: hard-coded English by design (a prototype's wording is not
   * a translation anyone should review), mounted only in a development build, and deleted once the
   * design question is answered. That is exactly why nothing was reading them: the copy scan skips
   * literal copy, the layout harness measures catalogue keys, and the walk follows the app's own
   * routes — so a designer flipping between readings was looking at a surface no check touched.
   *
   * These cases read the same contract a shipped screen is held to (role, name, state, and a named
   * image), through the readings' own tables: the URLs come from the prototypes' variant tables and
   * the routes `src/app` renders them on (`./prototype-readings`), so a reading added there is read
   * here without anyone updating a list.
   */
  test('reads the prototypes’ own tables, so a reading cannot be left out', () => {
    // The reach, asserted: the prototypes are here, and every declared reading is one this harness
    // can actually open. A variant with nothing declared to measure is a failure, not a skip.
    expect([...new Set(PROTOTYPE_READINGS.map((reading) => reading.prototype))].sort()).toEqual([
      'community-map',
      'sign-in',
    ]);
    expect(PROTOTYPE_READINGS.length).toBeGreaterThanOrEqual(6);
    expect(undescribedReadings()).toEqual([]);
    expect(readingsOffTheirPrototype()).toEqual([]);
  });

  for (const reading of PROTOTYPE_READINGS) {
    test(`${reading.bar} exposes a role, a name and its state on every control`, async ({
      page,
    }) => {
      await page.goto(reading.url);

      // Through the same reading the walk uses, floor included: a variant that rendered the app's
      // own screen, or nothing at all, must not pass the rules vacuously.
      await expectTreeReadable(page, reading.url);
    });
  }

  test('the bar steps through a prototype’s readings, by press and by arrow key', async ({
    page,
  }) => {
    await page.goto('/create-account?variant=A');
    await expect(page.getByText('PROTOTYPE · A · Code first')).toBeVisible();

    await page.getByRole('button', { name: 'Next variant' }).click();
    await expect(page).toHaveURL(/variant=B/);
    await expect(page.getByText('PROTOTYPE · B · Dense form')).toBeVisible();

    await page.getByRole('button', { name: 'Previous variant' }).click();
    await expect(page).toHaveURL(/variant=A/);

    // The arrow keys are the affordance the designer reviews with on the web export — the bar's own
    // reason for existing — so a bar that only answers to a mouse is a prototype nobody can flip.
    await page.keyboard.press('ArrowRight');
    await expect(page).toHaveURL(/variant=B/);

    await page.keyboard.press('ArrowLeft');
    await expect(page).toHaveURL(/variant=A/);
  });

  test('the bar carries the community map between the screens its readings live on', async ({
    page,
  }) => {
    // This prototype's readings answer “which screen” as much as “which shape”, so the arrows
    // navigate rather than swap a parameter: nothing else checks that, and a reading that stopped
    // being reachable would leave the designer with two thirds of the question.
    await page.goto('/discover?variant=A');
    await expect(page.getByText('PROTOTYPE · A · Map layer')).toBeVisible();

    await page.getByRole('button', { name: 'Next variant' }).click();
    await expect(page).toHaveURL(/\/zone-details\?variant=B$/);
    await expect(page.getByText('PROTOTYPE · B · Under the zone')).toBeVisible();

    await page.keyboard.press('ArrowRight');
    await expect(page).toHaveURL(/\/saved-spots\?variant=C$/);
    await expect(page.getByText('PROTOTYPE · C · Place cards')).toBeVisible();
  });
});

test.describe('the accessibility tree of every built screen', () => {
  const ROUTES = routesOfTheApp();

  test('walks the app’s own routes, so a screen cannot be left out', () => {
    // The floor, named: a wrong root would walk nothing and pass every walk below it.
    expect(ROUTES).toContain('/');
    expect(ROUTES).toContain('/discover');
    expect(ROUTES.length).toBeGreaterThanOrEqual(20);
  });

  for (const route of ROUTES) {
    test(`${route} exposes a role, a name and its state on every control`, async ({ page }) => {
      await page.goto(route);

      await expectTreeReadable(page, route);
    });
  }

  test('reports a planted violation, so the walk cannot pass vacuously', async ({ page }) => {
    // The screen is one this walk already passes, so what follows is the walk's reading of the
    // page and not the page's own state.
    await page.goto('/discover');
    expect(await readPage(page, '/discover')).toEqual([]);

    await page.evaluate(() => {
      const plant = (element: HTMLElement) => document.body.append(element);
      // An action the tree cannot name; a checkable control whose state is nowhere; and something
      // that acts and never says what it is.
      const unnamed = document.createElement('button');
      unnamed.setAttribute('aria-label', '');
      unnamed.textContent = '';
      plant(unnamed);

      const stateless = document.createElement('div');
      stateless.setAttribute('aria-label', 'Planted choice');
      stateless.setAttribute('role', 'checkbox');
      stateless.setAttribute('tabindex', '0');
      plant(stateless);

      const roleless = document.createElement('div');
      roleless.setAttribute('aria-label', 'Planted action');
      roleless.setAttribute('tabindex', '0');
      plant(roleless);

      // A drawing with no text alternative — the defect this screen's own map had (known issue
      // 35), planted here so the rule that replaced it can never stop biting.
      const drawing = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      drawing.setAttribute('height', '40');
      drawing.setAttribute('width', '40');
      plant(drawing as unknown as HTMLElement);
    });

    const findings = await readPage(page, '/discover');

    expect(findings.join('\n')).toContain('no accessible name');
    expect(findings.join('\n')).toContain('declares no aria-checked');
    expect(findings.join('\n')).toContain('claims no role that acts');
    expect(findings.join('\n')).toContain('image with no accessible name');
  });
});

/**
 * A screen read **while an action on it is working** — the half of the contract that a settled
 * reading cannot reach, because settling is exactly what waits it out.
 *
 * Screen 10's “Save report offline” is the app's only action with a busy state (`AppButton`'s
 * `busy`): while the write runs, the label is replaced by a spinner, the action declares itself
 * unavailable, and the flow moves on once the report is on the phone. Reading that frame is what
 * `readInFlight` exists for.
 *
 * Why the work has to be slowed first: on the web target `AsyncStorage` resolves its promise
 * synchronously, so the in-flight state lasts a microtask and never reaches the DOM at all — while
 * on a device it lasts as long as the write does. `platform-storage.ts` gives the page the timing
 * a device has, and its header carries the measurement behind that sentence.
 */
test.describe('a screen read while an action is working', () => {
  test('still exposes the action, its name and its state, and then finishes the work', async ({
    page,
  }) => {
    await makePlatformStorageAsynchronous(page);
    await page.goto('/post-visit-feedback');

    const action = page.getByTestId('report-save');
    await action.waitFor();
    await action.click();

    // Seen before it is read: a reading is a point in time, and this one has to be taken inside the
    // window the press opens. `aria-busy` is the declaration the page makes while it works — the
    // one flag no snapshot carries, which is why the walk reads it from the page.
    await expect(action).toHaveAttribute('aria-busy', 'true');

    const reading = await readInFlight(page, '/post-visit-feedback');

    // The floor, first: a reading that caught nothing would pass every rule below it.
    expect(reading.controls.filter((control) => control.declares['aria-busy'] === true)).toEqual([
      expect.objectContaining({ name: 'Save report offline', role: 'button' }),
    ]);

    // Nothing is wrong with the frame the press left behind: the action keeps its role, its name
    // and its unavailable state, and the spinner it draws while working stays **out of the tree** —
    // it is decoration, and an exposed drawing with no name is the defect known issue 35 recorded.
    expect(reading.findings).toEqual([]);
    expect(reading.nodes).toContainEqual({
      flags: ['disabled'],
      name: 'Save report offline',
      role: 'button',
    });
    expect(
      reading.nodes.filter((node) => node.role === 'progressbar' || node.role === 'img'),
    ).toEqual([]);

    // And the work finishes — the report is on the phone's queue and the flow moved on — so what was
    // read above was an in-flight state and not a screen that stalled with its spinner up.
    await expect(page).toHaveURL(/\/visits$/);
    expect(await page.locator('[aria-busy="true"]').count()).toBe(0);
    expect(
      JSON.parse((await page.evaluate((key) => localStorage.getItem(key), QUEUE_KEY)) ?? '[]'),
    ).toMatchObject([{ zoneId: 'Z14' }]);
  });
});

/**
 * One whole reading of a page: the floor first, then the rules.
 *
 * The floor is asserted before anything else, in both directions of this file: a screen that exposed
 * no control at all would pass every rule vacuously, which is the one failure mode a reading must
 * not have. Then the rules themselves (AGENTS.md §11.2, SECURITY.md §11) — role, accessible name,
 * the state the page declares against the state the tree shows.
 *
 * The walk reads a screen **at rest** with it, and the cases above read a screen **after an
 * interaction**. `step` names the route and, where a press got there, the press: a finding is about
 * the state the interaction produced and not the screen's first frame — and the same route is read
 * both ways (`/active-visit` running and `/active-visit` paused are not the same screen to a screen
 * reader).
 *
 * Why the second kind is needed at all: every earlier case in this file was written by a person
 * pressing something and reading what came back, and each one stopped where the press led. The
 * states in between — a visit that is paused, a plan that now says “Remove zone from saved zones”,
 * the settings screen that has an account row only because a sign-up just happened, a consent box
 * that is checked — were read by nobody, and no at-rest reading can reach them: the walk opens a
 * freshly loaded export, which holds no session and no interaction at all.
 */
async function expectTreeReadable(page: Page, step: string): Promise<void> {
  expect((await controlsOn(page)).length).toBeGreaterThan(0);
  expect(await readPage(page, step)).toEqual([]);
}
