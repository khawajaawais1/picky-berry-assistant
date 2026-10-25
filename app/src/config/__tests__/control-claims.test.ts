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
    file: 'src/components/templates/screen.tsx',
    offers: { pressable: 1, role: 2 },
    why: 'The back control, drawn only when the route has somewhere to go back to, and the screen title, announced as a heading rather than painted as text (frontend review, 2026-10-25). The heading is a reading, not a control.',
  },
  {
    file: 'src/features/discover/components/active-visit-screen.tsx',
    offers: { button: 2, role: 2 },
    why: 'Pause and End visit act on the demo visit the screen discloses (demo row A5); the elapsed reading is `role="text"`, so it claims nothing it cannot count.',
  },
  {
    file: 'src/features/discover/components/map-list-toggle.tsx',
    offers: { pressable: 2, role: 2 },
    why: 'Map/list toggle and the sync-centre button; the second is drawn only when a caller supplies a destination, and the recentre control is absent entirely (ADR-044).',
  },
  {
    file: 'src/features/discover/components/post-visit-feedback-screen.tsx',
    offers: { button: 1, chips: 1, formField: 1, pressable: 1, role: 1, textAction: 1 },
    why: 'Save writes the report to this phone’s queue, Skip leaves it, the note field holds what is typed, the species chips and the yield radios are real local choices, and “Add a berry photo” is absent (demo-and-stand-ins §7).',
  },
  {
    file: 'src/features/discover/components/prototype/community-map-variants.tsx',
    offers: { pressable: 1, role: 1, textAction: 1 },
    why: 'The community-map readings under review, reachable only outside a production build.',
  },
  {
    file: 'src/features/discover/components/route-to-zone-screen.tsx',
    offers: { button: 1, textAction: 1 },
    why: 'Start walk opens the active-visit screen and Cancel returns; both act on this device.',
  },
  {
    file: 'src/features/discover/components/saved-spots-screen.tsx',
    offers: { textAction: 1 },
    why: 'The empty plan’s way to the map; the rows are `ZoneSourceRow`s, which the route gives a destination (the saved zone’s details), and the screen removes nothing at all.',
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
    file: 'src/features/discover/components/design-zone-card.tsx',
    offers: { pressable: 1, role: 1 },
    why: 'The design’s demo card, kept for the community-map prototype: it is a control only where the caller has somewhere to go, and without a handler it returns the drawing, with no role and no chevron.',
  },
  {
    file: 'src/features/discover/components/zone-card.tsx',
    offers: { pressable: 1, role: 1 },
    why: 'Frame 06’s card hands its zone and score layer to frame 07; it is a control only where the route supplies that destination, and without a handler it returns the drawing, with no role and no chevron.',
  },
  {
    file: 'src/features/discover/components/discover-screen.tsx',
    offers: { textAction: 1 },
    why: 'The list view’s retry after a failed read, wired to the same `useZones` refetch the map offers; every other control on the screen is a shared component with its own entry (frontend review, 2026-10-25).',
  },
  {
    file: 'src/features/discover/components/zone-map.tsx',
    offers: { textAction: 1 },
    why: 'The map’s retry after a failed read: it is drawn only when the screen supplies the read again, and the map stays a drawing without one (frontend review, 2026-10-25).',
  },
  {
    file: 'src/features/discover/components/zone-details-screen.tsx',
    offers: { button: 1, pressable: 2, role: 2 },
    why: 'Navigate and Save zone act on this device, the bookmark waits while the record is read, and “See all 11” opens the zone’s own report list (ADR-044).',
  },
  {
    file: 'src/features/discover/components/zone-search-field.tsx',
    offers: { textField: 1 },
    why: 'Frame 06’s search field: what is typed narrows the zone list on the spot.',
  },
  {
    file: 'src/features/discover/components/zone-row.tsx',
    offers: { pressable: 1, role: 1 },
    why: 'A list row that is a control only for a zone the app has a detail screen for, so it can never open the wrong zone’s numbers.',
  },
  {
    file: 'src/features/discover/components/zone-source-row.tsx',
    offers: { pressable: 1, role: 1 },
    why: 'Frame 06’s list row, and the saved plan’s row since ADR-060: it is a control only where the caller supplies a destination (the plan does for a resolved zone; the map’s list does not), and without one it returns the card with no role and no chevron.',
  },
  {
    file: 'src/features/discover/components/design-zone-map.tsx',
    offers: { role: 1 },
    why: 'The design’s drawing claims `image` — the text alternative it carries, not a control (known issue 35, corrected): it has no handler to lose and nothing on it acts, which is why the frame’s own recentre button is still not drawn. It remains the map on frames 08 and 09.',
  },
  {
    file: 'src/features/discover/components/zone-map-canvas.native.tsx',
    offers: { role: 1 },
    why: 'The MapLibre map claims `image` — the text alternative WCAG 1.1.1 asks of the screen’s primary presentation of the zones (known issue 35, corrected) — and nothing on it acts: every gesture is off, because the frame’s recentre button does not exist yet.',
  },
  {
    file: 'src/features/discover/components/zone-map-canvas.web.tsx',
    offers: { role: 1 },
    why: 'The web fallback draws the same rings as an SVG and claims `image` for the same reason: it is the node a browser exposes, and no part of it is a control.',
  },
  {
    file: 'src/features/field-test/components/field-test-screen.tsx',
    offers: { button: 3, textAction: 3 },
    why: 'The development-only instrument (ADR-063): start a watch run, start a control run and stop a running one all drive the real seam, “Open privacy settings” opens the route that holds the consent switch, and share and clear act on the summary this phone holds. No production build mounts it — the route redirects, which the production export checks.',
  },
  {
    file: 'src/features/marketplace/components/listing-card.tsx',
    offers: { pressable: 1, role: 1 },
    why: 'The same guard as the zone row: only the one listing the app has a screen for is a button, and that press opens it.',
  },
  {
    file: 'src/features/marketplace/components/market-browse-screen.tsx',
    offers: { textAction: 1 },
    why: 'Readings throughout: the filter chips are `Chip`s, the count action has no handler, and the listings are cards whose handler the screen supplies only for the demo listing.',
  },
  {
    file: 'src/features/marketplace/components/market-search-field.tsx',
    offers: { textField: 1 },
    why: 'Frame 15’s search field, the same component at the marketplace’s metrics, narrowing the two listings as it is typed; the frame’s sliders glyph is not drawn, because no filter sheet exists.',
  },
  {
    file: 'src/features/marketplace/components/market-chat-screen.tsx',
    offers: { button: 1 },
    why: 'The order summary opens the order screen; the composer is drawn and inert, claiming no input role (ADR-044).',
  },
  {
    file: 'src/features/marketplace/components/market-listing-screen.tsx',
    offers: { button: 2 },
    why: 'Contact the seller and Order open the demo’s chat and order screens, on a screen that states it is the provider test mode (ADR-026).',
  },
  {
    file: 'src/features/marketplace/components/market-order-screen.tsx',
    offers: { button: 1 },
    why: 'Message the seller opens the demo thread; “Confirm berries received” and “Open dispute” are absent from the catalogue entirely (ADR-044).',
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
    file: 'src/features/privacy/components/account-security-screen.tsx',
    offers: { textAction: 1 },
    why: 'The way back in is drawn when there is no session to carry on with; signing out is the shared `SignOutAction`, which confirms the deletion first (frontend review, 2026-10-25).',
  },
  {
    file: 'src/features/privacy/components/privacy-settings-screen.tsx',
    offers: { pressable: 1, role: 1, switch: 1 },
    why: 'The visit-tracking switch writes the consent record, the setting rows are controls only where their route supplies a destination, the language row drops the chevron (ADR-017), and signing out is the shared `SignOutAction`, which confirms the deletion first (frontend review, 2026-10-25).',
  },
  {
    file: 'src/features/privacy/components/terms-privacy-screen.tsx',
    offers: { textAction: 1 },
    why: 'The row opening the picker’s own copy; the records above it are readings.',
  },
  {
    file: 'src/features/privacy/components/your-data-screen.tsx',
    offers: { textAction: 1 },
    why: 'Share a copy opens the platform’s own sheet with the export document; the app sends nothing itself (ADR-040).',
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
        file: 'src/features/discover/components/alerts-screen.tsx',
        why: 'Frame 12: the push switch is a figure and its three settings are readings, so the screen carries no role at all (demo row A17, ADR-043).',
      },
      {
        file: 'src/features/offline/components/offline-sync-screen.tsx',
        why: 'Frame 13: “Retry sync” and “Manage downloads” are drawings of the design’s actions, because there is no transport to retry over (demo row A16, ADR-042, ADR-048 §4).',
      },
      {
        file: 'src/features/marketplace/components/market-browse-screen.tsx',
        why: 'Frame 15: its three filter chips would leave the app’s two listings unchanged, and its count action opens no index — both claim nothing (ADR-026).',
      },
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
        file: 'src/features/discover/components/zone-row.tsx',
        source: 'if (!openable) return row;',
      },
      {
        file: 'src/features/discover/components/design-zone-card.tsx',
        source: 'if (!onPress) return card;',
      },
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
