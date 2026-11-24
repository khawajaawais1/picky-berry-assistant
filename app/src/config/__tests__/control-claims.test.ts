import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * “Does the app still offer a control that cannot act?”
 *
 * The copy-claims scan asks that question about words (`copy-claims.test.ts`); this one asks it about
 * **controls** — every pressable, switch and chip that claims an action. The read behind it is
 * [docs/control-claims-audit.md](../../../docs/control-claims-audit.md), and its rule is the one
 * AGENTS.md §11.2 states and the frames were drawn under: **an action that cannot act claims no
 * role**, and a row that will never open anything draws no chevron.
 *
 * The invariants here are the app's own, not a style preference:
 *
 * 1. **Every control site is on the ledger.** The scan walks `src/` for the interactive primitives
 *    and their roles; a site that appears, moves or disappears without the ledger moving with it
 *    fails, so a new control cannot be added without someone reading it. Counts are what the
 *    scan sees, comments included, and each entry says what the file's controls do.
 * 2. **A file recorded as claiming nothing claims nothing.** The screens and components whose
 *    controls are drawings — the alerts screen's preferences card, the sync centre's two actions,
 *    the shared chip, the marketplace's readings — are asserted to carry no role at all.
 * 3. **The guarded primitives keep their guard.** A card or a row that drops its role when a caller
 *    supplies no handler is the pattern the app uses; the six that do it are asserted here,
 *    `AppButton` among them since known issue 34 was corrected. What a source scan still cannot
 *    check is a **hand-written `Pressable`**: its role is a literal in the JSX, so its handler
 *    cannot be read from here — those sites are the screen's own test and the browser's
 *    accessibility-tree walk (`e2e/a11y-tree.ts`).
 * 4. **Screen 04 is gone, and its controls with it**: the code field, the resend row and the
 *    verification screen left the ledger when the screen retired (ADR-059). A new control site
 *    fails this file until someone records what it does.
 *
 * What it is **not**: a runtime check. It reads source text, so it cannot see whether a handler
 * prop arrived as `undefined`, whether an inline handler does anything, or what a press looks like
 * to a screen reader. Those are the screens' own tests, the accessibility suite in the browser
 * (`e2e/accessibility.spec.ts`) and the audits this file points at.
 */

const SRC = join(__dirname, '..', '..');

/**
 * The primitives a control is built from, as the scan counts them. `switch` excludes
 * `<SwitchFigure …>`, which is a drawing rather than a control (ADR-043).
 */
const PRIMITIVES = {
  button: /<AppButton/g,
  chips: /<ChoiceChips/g,
  checkbox: /<AppCheckbox/g,
  formField: /<FormField(?![A-Za-z])/g,
  link: /<Link(?![A-Za-z])/g,
  pressable: /<Pressable/g,
  role: /accessibilityRole="/g,
  switch: /<Switch[^F]/g,
  textAction: /<TextAction/g,
  textField: /<AppTextInput(?![A-Za-z])/g,
  textInput: /<TextInput/g,
} as const;

type Primitive = keyof typeof PRIMITIVES;

type LedgerEntry = {
  /** Path from the repository root, as the scan reports it. */
  file: string;
  /** What the scan sees in that file, exactly. */
  offers: Partial<Record<Primitive, number>>;
  /** What its controls do, and where that is recorded. */
  why: string;
};

/**
 * Every file with a control site, and what each one offers. A count is a **change detector**, not a
 * claim about behaviour: it makes an added, moved or removed control show up in the diff of this
 * test, where the reader can decide whether the ledger's reason still holds.
 */
const LEDGER: readonly LedgerEntry[] = [
  {
    file: 'src/components/atoms/app-button.tsx',
    offers: { pressable: 2 },
    why: 'The design’s primary action: `button` role, an accessible name and its disabled/busy state while it has a handler (the `role` count is zero because the role is conditional, not literal) — with no handler it is the frame’s drawing of an action and claims none of the three (known issue 34, corrected).',
  },
  {
    file: 'src/components/atoms/app-checkbox.tsx',
    offers: { pressable: 1, role: 1 },
    why: 'The consent checkbox: presses toggle the value the caller passed, and `disabled` is exposed as a state.',
  },
  {
    file: 'src/app/+not-found.tsx',
    offers: { link: 1 },
    why: 'The way home from a route that does not exist — the one control the route layer itself draws, and it really opens the app’s root.',
  },
  {
    file: 'src/components/atoms/app-text-input.tsx',
    offers: { textInput: 1 },
    why: 'A text field: it holds what is typed, which is the thing it claims.',
  },
  {
    file: 'src/components/molecules/field-action.tsx',
    offers: { pressable: 1, role: 1 },
    why: 'The reveal control inside a password field: it acts on the field the caller passed, and its 44 px box is the target rather than the 20 px glyph (frontend review, 2026-10-25).',
  },
  {
    file: 'src/components/molecules/sign-out-action.tsx',
    offers: { button: 1, textAction: 2 },
    why: 'Signing out: the control opens a confirmation that names the saved spots, the unsynced reports and the consent before it deletes them; “Keep me signed in” cancels, and the confirm action is busy and unavailable while the service runs. Shared by the profile and the account screen so the two cannot disagree about what a press costs (frontend review, 2026-10-25).',
  },
  {
    file: 'src/components/molecules/form-field.tsx',
    offers: { textField: 1 },
    why: 'The labelled field the forms are built from: the label, the field it wraps and the value the caller holds.',
  },
  {
    file: 'src/components/molecules/choice-chips.tsx',
    offers: { pressable: 1, role: 2 },
    why: 'The radio group a *real* choice is drawn with (frame 11’s period chips), where a chip that cannot change anything is `Chip` and claims nothing.',
  },
  {
    file: 'src/components/organisms/core-navigation.tsx',
    offers: { pressable: 1, role: 2 },
    why: 'The four destinations of the app shell, each a `tab` with its selected state, wired to `router.navigate`.',
  },
  {
    file: 'src/components/molecules/text-action.tsx',
    offers: { pressable: 1 },
    why: 'The primitive behind every secondary action: with no handler it drops both its role and its name, which is why the resend row and the sign-out-while-working states can be drawn as copy.',
  },
  {
    file: 'src/components/prototype/prototype-switcher.tsx',
    offers: { pressable: 2, role: 2 },
    why: 'The review tool that pages through the design readings; it is mounted only outside a production build (the production export proves it is absent).',
  },
  {
    file: 'src/components/templates/error-screen.tsx',
    offers: { button: 1, role: 1, textAction: 1 },
    why: 'The route error fallback: “Try again” runs the router’s reset, “Go back” opens the shell’s home, and the title is the screen’s heading. It prints no error text (frontend review, 2026-10-25).',
  },
  {
    file: 'src/components/templates/screen.tsx',
    offers: { pressable: 1, role: 2 },
    why: 'The back control, drawn only when the route has somewhere to go back to, and the screen title, announced as a heading rather than painted as text (frontend review, 2026-10-25). The heading is a reading, not a control.',
  },
  {
    file: 'src/features/discover/components/alert-preferences-screen.tsx',
    offers: { chips: 1 },
    why: 'The radius chips save `alert_radius_km` with `PATCH /me` and the species chips are the shared `SpeciesChips`; both are drawn only once the account’s profile has been read, and a save the service did not keep is said (ADR-067).',
  },
  {
    file: 'src/features/discover/components/live-alert-preferences.tsx',
    offers: { pressable: 1, role: 1, switch: 1, textAction: 1 },
    why: 'Frame 12’s push switch is the platform’s permission: on asks for it and registers this phone, off opens the phone’s settings, and its hint says so; the phone-settings action is drawn only when the permission was refused. The radius and species rows open the Alert preferences screen only when the route supplies it; quiet hours is a reading, because the contract has no field for it (ADR-067).',
  },
  {
    file: 'src/features/discover/components/active-visit-screen.tsx',
    offers: { button: 1, role: 1 },
    why: 'End visit finalizes the tracked visit through the route’s store; it is drawn only while a visit is running. The elapsed reading is `role="text"`, so it claims nothing it cannot count, and the design’s Pause action is not drawn because the tracker cannot pause a visit it is judging from presence.',
  },
  {
    file: 'src/features/discover/components/map-list-toggle.tsx',
    offers: { pressable: 4, role: 4 },
    why: 'Map/list toggle and the sync-centre button; the second is drawn only when a caller supplies a destination. On the map they are compact named icon controls; list view keeps the explanatory text row (ADR-070).',
  },
  {
    file: 'src/features/discover/components/post-visit-feedback-screen.tsx',
    offers: { button: 1, chips: 1, formField: 1, pressable: 1, role: 1, textAction: 1 },
    why: 'Save writes the report to this phone’s queue, Skip leaves it, the note field holds what is typed, the species chips and the yield radios are real local choices, and “Add a berry photo” is absent (demo-and-stand-ins §7).',
  },
  {
    file: 'src/features/discover/components/route-to-zone-screen.tsx',
    offers: { button: 2, textAction: 2 },
    why: '“Directions in Maps” opens the platform maps app for walking directions to the zone’s middle, Start walking opens the active visit, and Cancel returns (drawn in both the loading and the ready state).',
  },
  {
    file: 'src/features/discover/components/saved-spots-screen.tsx',
    offers: { button: 1, role: 1 },
    why: 'The empty plan’s “Browse zones” action, under a heading and a sentence that say how a spot gets here; the rows are `ZoneSourceRow`s, which the route gives a destination (the saved zone’s details), and the screen removes nothing at all (frontend review, 2026-10-25).',
  },
  {
    file: 'src/features/discover/components/season-insights-screen.tsx',
    offers: { chips: 1 },
    why: 'Frame 11’s two period chips, which filter the visit history for real (ADR-043).',
  },
  {
    file: 'src/features/discover/components/species-chips.tsx',
    offers: { pressable: 1, role: 1 },
    why: 'The picker’s species filter on screens 06 and 10: each chip is a checkbox over the list shown.',
  },
  {
    file: 'src/features/discover/components/yield-rating.tsx',
    offers: { pressable: 1, role: 2 },
    why: 'Frame 10’s yield radios, a real choice stored with the report it describes.',
  },
  {
    file: 'src/features/discover/components/zone-card.tsx',
    offers: { pressable: 1, role: 1 },
    why: 'Frame 06’s card hands its zone and score layer to frame 07; it is a control only where the route supplies that destination, and without a handler it returns the drawing, with no role and no chevron.',
  },
  {
    file: 'src/features/discover/components/discover-screen.tsx',
    offers: { pressable: 1, role: 1, textAction: 1 },
    why: 'The optional floating back control exists only when the caller supplies a destination, and list view’s retry is wired to the same `useZones` refetch the map offers; every other control is a shared component with its own entry (ADR-070).',
  },
  {
    file: 'src/features/discover/components/zone-map.tsx',
    offers: { textAction: 1 },
    why: 'The map’s retry after a failed read: it is drawn only when the screen supplies the read again, and the map stays a drawing without one (frontend review, 2026-10-25).',
  },
  {
    file: 'src/features/discover/components/zone-details-screen.tsx',
    offers: { button: 1, pressable: 2, role: 2 },
    why: 'Navigate opens the route to this zone, Save zone acts on this device and waits while the record is read, and “See all reports” opens the zone’s report list from the API (ADR-044).',
  },
  {
    file: 'src/features/discover/components/zone-search-field.tsx',
    offers: { textField: 1 },
    why: 'Frame 06’s search field: what is typed narrows the zone list on the spot.',
  },
  {
    file: 'src/features/discover/components/alerts-screen.tsx',
    offers: { pressable: 1, role: 1 },
    why: 'Each alert card opens its zone on the zone screen, for the berry the alert is about; it is a control only when the route supplies that destination.',
  },
  {
    file: 'src/features/discover/components/zone-map-svg.tsx',
    offers: { role: 1 },
    why: 'The SVG drawing of the zone rings (web, and Expo Go without MapLibre) claims `image`: it is the text alternative for the zones, and no part of it is a control.',
  },
  {
    file: 'src/features/marketplace/components/market-browse-screen.tsx',
    offers: { textAction: 1 },
    why: 'Retry after the listings could not be read, wired to the same query.',
  },
  {
    file: 'src/features/discover/components/zone-source-row.tsx',
    offers: { pressable: 1, role: 1 },
    why: 'Frame 06’s list row, and the saved plan’s row since ADR-060: it is a control only where the caller supplies a destination (the plan does for a resolved zone; the map’s list does not), and without one it returns the card with no role and no chevron.',
  },
  {
    file: 'src/features/discover/components/zone-map-canvas.native.tsx',
    offers: { pressable: 2, role: 3 },
    why: 'The MapLibre map is a named image and keeps two named 44 px controls beside it: foreground location/follow when a fix or settings destination exists, and fit-zones when rings exist. Manual panning exits follow mode (ADR-070).',
  },
  {
    file: 'src/features/field-test/components/field-test-screen.tsx',
    offers: { button: 3, textAction: 3 },
    why: 'The development-only instrument (ADR-063): start a watch run, start a control run and stop a running one all drive the real seam, “Open privacy settings” opens the route that holds the consent switch, and share and clear act on the summary this phone holds. No production build mounts it — the route redirects, which the production export checks.',
  },
  {
    file: 'src/features/marketplace/components/listing-card.tsx',
    offers: { pressable: 1, role: 1 },
    why: 'A listing card opens its listing when the route supplies the destination; without one it is the drawing, with no role and no chevron.',
  },
  {
    file: 'src/features/marketplace/components/market-search-field.tsx',
    offers: { textField: 1 },
    why: 'Frame 15’s search field, the same component at the marketplace’s metrics, narrowing the two listings as it is typed; the frame’s sliders glyph is not drawn, because no filter sheet exists.',
  },
  {
    file: 'src/features/marketplace/components/market-chat-screen.tsx',
    offers: { button: 1, pressable: 1, role: 1, textField: 1 },
    why: 'The composer sends the typed message to the seller (`POST /market/listings/:id/messages`), the send glyph is its button and waits while the field is empty or a send is in flight, and “Order berries” opens the order form for an active listing.',
  },
  {
    file: 'src/features/marketplace/components/market-listing-screen.tsx',
    offers: { button: 2 },
    why: 'Contact opens the thread with this listing’s seller, and Order opens the order form; Order is drawn only while the listing has stock.',
  },
  {
    file: 'src/features/marketplace/components/market-order-screen.tsx',
    offers: { button: 2, formField: 2 },
    why: 'The form takes kilograms and a pickup time, checked against the stock, and “Reserve berries” places the order (`POST /market/orders`); the summary’s “Message” opens the seller thread.',
  },
  {
    file: 'src/features/onboarding/components/create-account-screen.tsx',
    offers: {
      button: 1,
      checkbox: 1,
      formField: 3,
      textAction: 2,
    },
    why: 'The name, address and password fields, the submit (gated by its own rules and the account seam), the consent checkbox, the terms link and the way to sign in — all of them local. The frame’s email/phone chips are gone with the phone flow (ADR-059); the show-password control is the shared `FieldAction` now, so this file draws no pressable of its own.',
  },
  {
    file: 'src/features/onboarding/components/location-consent-screen.tsx',
    offers: { button: 1, checkbox: 1, textAction: 1 },
    why: 'The consent is recorded on this device and both ways on leave for the app; the continue action’s label names a settings step the app does not take (known issue 33).',
  },
  {
    file: 'src/features/onboarding/components/prototype/sign-in-variants.tsx',
    offers: { button: 4, chips: 1, formField: 4, pressable: 1, role: 1, textAction: 6 },
    why: 'The sign-in readings, including variants with a password, biometrics and a forgotten password — controls that exist nowhere in the app, mounted only outside a production build. The one hand-written `Pressable` is the eye glyph that reveals the password: it claims `button` because it acts, which is what the accessibility walk of the readings required of it (`e2e/accessibility.spec.ts`, §7 of the audit). Their copy is still outside the copy scan, deliberately.',
  },
  {
    file: 'src/features/onboarding/components/forgot-password-screen.tsx',
    offers: { button: 1, formField: 1, textAction: 3 },
    why: 'The address is handed to the account seam’s reset request, “Start over” returns to the form, and the way to sign in is drawn in both states (one at a time, counted twice in source); the action goes inert where nothing can answer it, and the confirmation says no email was sent outside production (ADR-062).',
  },
  {
    file: 'src/features/onboarding/components/reset-password-screen.tsx',
    offers: { button: 3, formField: 2, textAction: 2 },
    why: 'The new password and its confirmation are handed to the session seam’s completion, which spends the emailed link’s token; the success state opens sign-in, the invalid state requests another link, and the form’s sign-in action is available in both editable states (ADR-062, ADR-065).',
  },
  {
    file: 'src/features/onboarding/components/sign-in-screen.tsx',
    offers: { button: 1, formField: 2, textAction: 2 },
    why: 'The email and password are handed to the account seam, the show-password control is the shared `FieldAction`, “Forgot password?” opens the reset request (ADR-062), and the way to create an account opens screen 03; the action goes inert where nothing can answer it (ADR-054, ADR-059).',
  },
  {
    file: 'src/features/onboarding/components/welcome-screen.tsx',
    offers: { button: 1, textAction: 1 },
    why: 'The two ways into the flow, both real routes.',
  },
  {
    file: 'src/features/offline/components/offline-sync-screen.tsx',
    offers: { textAction: 2 },
    why: '“Send now” sends the queued reports to the API (`POST /reports`) and re-reads the queue; the snapshot action downloads the pilot area (`GET /zones/snapshot`) into the cache the map reads offline. Both are drawn only when the route supplies the service.',
  },
  {
    file: 'src/features/privacy/components/account-security-screen.tsx',
    offers: { button: 2, formField: 2, textAction: 1 },
    why: 'The way back in is drawn when there is no session to carry on with; signing out is the shared `SignOutAction`, which confirms the deletion first (frontend review, 2026-10-25). Deleting the account is a password field and a button, drawn only for a signed-in account when the route can delete it: the password is the confirmation, the button stays disabled until one is typed, and the server checks it (ADR-065). The name field and its Save button are drawn only once the account service has answered the profile, check the contract’s 1–30 characters before sending, and say the outcome either way (ADR-067).',
  },
  {
    file: 'src/features/privacy/components/language-screen.tsx',
    offers: { chips: 1 },
    why: 'The two languages are one radio group, each named in its own words, drawn only for a signed-in account whose profile has been read; the app speaks the choice only once the account has kept it (ADR-067).',
  },
  {
    file: 'src/features/privacy/components/privacy-settings-screen.tsx',
    offers: { chips: 2, pressable: 1, role: 1, switch: 1 },
    why: 'The visit-tracking switch writes the consent record, the setting rows are controls only where their route supplies a destination (the language row opens the Language screen, ADR-067), and signing out is the shared `SignOutAction`, which confirms the deletion first (frontend review, 2026-10-25). The spot visibility chips save `privacy_level` and are drawn only once the account’s level has been read; their note says nothing is shared yet (ADR-067).',
  },
  {
    file: 'src/features/privacy/components/terms-privacy-screen.tsx',
    offers: { textAction: 1 },
    why: 'The row opening the picker’s own copy; the records above it are readings.',
  },
  {
    file: 'src/features/privacy/components/your-data-screen.tsx',
    offers: { textAction: 2 },
    why: 'Share a copy opens the platform’s own sheet with the export document; the app sends nothing itself (ADR-040). The second asks the account service for its own copy (`POST /me/export`, ADR-065) and hands it to the same sheet, drawn only when the route supplies the service.',
  },
];

/** Every file under `src/` that is scanned: source, never a test. */
function scannedFiles(directory: string): string[] {
  const found: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === '__tests__') {
      continue;
    }

    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      found.push(...scannedFiles(path));
    } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      found.push(path);
    }
  }

  return found;
}

/** What the scan counts in one file, by primitive. */
function offersOf(path: string): Partial<Record<Primitive, number>> {
  const source = readFileSync(path, 'utf8');
  const offers: Partial<Record<Primitive, number>> = {};

  for (const [primitive, pattern] of Object.entries(PRIMITIVES) as [Primitive, RegExp][]) {
    const count = source.match(pattern)?.length ?? 0;

    if (count > 0) {
      offers[primitive] = count;
    }
  }

  return offers;
}

/** The scan, as the ledger is written against it. */
function scan(): Map<string, Partial<Record<Primitive, number>>> {
  const found = new Map<string, Partial<Record<Primitive, number>>>();

  for (const path of scannedFiles(SRC)) {
    const offers = offersOf(path);

    if (Object.keys(offers).length > 0) {
      found.set(relative(join(SRC, '..'), path), offers);
    }
  }

  return found;
}

describe('the controls the app offers', () => {
  it('records every control site, with what it offers', () => {
    const found = scan();
    const unrecorded: string[] = [];

    for (const [file, offers] of found) {
      const entry = LEDGER.find((candidate) => candidate.file === file);

      if (entry === undefined) {
        unrecorded.push(`${file}: not on the ledger at all (${JSON.stringify(offers)})`);
        continue;
      }

      for (const [primitive, count] of Object.entries(offers) as [Primitive, number][]) {
        if (entry.offers[primitive] !== count) {
          unrecorded.push(
            `${file}: ${primitive} is offered ${count} time(s) where the ledger records ${entry.offers[primitive] ?? 0} — read the site, then update its reason`,
          );
        }
      }
    }

    expect(unrecorded).toEqual([]);
  });

  it('keeps no ledger entry whose controls are gone, so the record cannot outlive the code', () => {
    const found = scan();
    const stale: string[] = [];

    for (const entry of LEDGER) {
      const offers = found.get(entry.file);

      if (offers === undefined) {
        stale.push(`${entry.file}: on the ledger, but it offers no control any more`);
        continue;
      }

      for (const [primitive, count] of Object.entries(entry.offers) as [Primitive, number][]) {
        if (offers[primitive] !== count) {
          stale.push(
            `${entry.file}: the ledger records ${primitive} ${count} time(s), the file offers ${offers[primitive] ?? 0}`,
          );
        }
      }
    }

    expect(stale).toEqual([]);
  });

  it('claims no role in the files whose controls are drawings', () => {
    // The other half of the rule: these screens and components present the design's own controls as
    // readings. Each is a claim the app can keep — nothing here can act — and each is recorded in
    // the audit (§2) and in docs/demo-and-stand-ins.md.
    const readings: readonly { file: string; why: string }[] = [
      {
        file: 'src/components/molecules/chip.tsx',
        why: 'A chip is a reading of a state, never a control: a chip that can act is `ChoiceChips` (ADR-026, ADR-043).',
      },
    ];

    const claimed = readings
      .filter(({ file }) => (offersOf(join(SRC, '..', file)).role ?? 0) > 0)
      .map(({ file, why }) => `${file}: claims a role, but ${why}`);

    expect(claimed).toEqual([]);
  });

  it('keeps the guard that drops a control a caller gave no handler for', () => {
    // The pattern the app uses where a drawing doubles as a control: with nowhere to go, each of
    // these drops the claim. Most return the drawing itself — no `Pressable`, no role, no chevron —
    // while `TextAction` and `AppButton` keep the box they drew and drop the role, the name and the
    // tab stop instead, which is the same rule where the action's own metrics are the drawing.
    const guards: readonly { file: string; source: string }[] = [
      {
        file: 'src/features/marketplace/components/listing-card.tsx',
        source: 'if (!onPress) return card;',
      },
      {
        file: 'src/features/privacy/components/privacy-settings-screen.tsx',
        source: 'if (!onPress) {',
      },
      { file: 'src/components/molecules/text-action.tsx', source: 'accessibilityRole={onPress ? ' },
      {
        file: 'src/components/atoms/app-button.tsx',
        source: 'accessibilityRole={canAct ? ',
      },
    ];

    for (const { file, source } of guards) {
      const text = readFileSync(join(SRC, '..', file), 'utf8');

      expect([file, text.includes(source)]).toEqual([file, true]);
    }
  });
});
