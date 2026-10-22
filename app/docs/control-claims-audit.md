# The control-claims audit

A read of **every control the app ships** — every pressable, switch, chip and input in both the
shared components and the screens — for actions the app cannot perform. Done 2026-10-12, against
the working tree as it stood that day, by reading each control's site against the handler behind it
and the route that wires it.

It is the companion of [copy-claims-audit.md](copy-claims-audit.md): that one asks what the app
*says*, this one asks what it *offers*. Both are **indexes of where each claim is recorded**, not a
second place to record it. The demo rows are [demo-and-stand-ins.md](demo-and-stand-ins.md)'s, the
issues are PROJECT.md's “Known issues”, the decisions are the ADRs. What this file adds is the two
things those cannot say on their own: **which controls make a claim at all**, and **which of them
had no record yet**. The standing check is `src/config/__tests__/control-claims.test.ts`, whose
ledger is the inventory this read was made from.

## How the read was made, and what it cannot see

The method, in code terms: `AppButton`, `TextAction`, `ChoiceChips`, `AppCheckbox`, `Switch`,
`Pressable`, `TextInput` and the field components the forms are built from (`AppTextInput`,
`FormField`, `CodeField`) were counted across `src/`, together with every `accessibilityRole` and
the route layer's own `<Link>`, and every site was read against **the handler it was given**, **the
role it claims** and **the route that supplies both** — a control whose handler prop is optional is
honest only where its absence removes the control, and a control drawn with a role is honest only
where the press does what the role and the label say. Forty files carry a control site; each is on
the ledger in the standing check with what its controls do.

What it **cannot** see, and where that evidence lives instead:

- **A handler that exists and does nothing.** An inline `onPress={() => setSomething(true)}` whose
  state nothing reads looks exactly like a working control to a source scan. Reading the screen is
  what catches it, which is what this pass did — and the screens' own tests are what hold it.
- **Whether a prop arrived as `undefined` at runtime.** The primitives' guards make that a
  non-question (below), but the scan reads source text, not values.
- **What a screen reader actually hears, and what a press does in the built app.** That is
  `e2e/accessibility.spec.ts` (roles, names, states, the flows that walk them) and the production
  export, which proves the review-only surfaces do not mount.
- **A control that *looks* operable without claiming a role.** The app draws several (a chip, a
  switch figure, a composer). That is the deliberate honesty this audit records rather than an
  oversight — but a reader who does not use assistive technology still sees something pressable,
  and nothing here measures their expectation.

## The claims, and where each one is recorded

`Kept` means the control acts and its role, name and state say what it does; `Drawn` means the
design's control is on screen as a reading, claiming no role; `Absent` means it is not drawn at all;
`Recorded` means a known issue or finding carries it.

| # | Family | Where it is | What the app can actually do | Verdict | Where it is recorded |
| - | ------ | ----------- | ---------------------------- | ------- | -------------------- |
| 1 | **A control that acts, and says what it does** | the forms' submits and consent rows, the four shell tabs, the back control, the species and period chips, the yield radios, the bookmark, Navigate, Save report, Skip, Share a copy, Sign out, the way back into the app, the code field, every text field, and the way home from a route that does not exist | Each press does the local thing its label names — records, filters, queues, navigates, or writes the consent — and its role, accessible name and disabled/busy state are exposed | **Kept** | The ledger in `control-claims.test.ts`; each screen's own test; `e2e/accessibility.spec.ts` for the built app |
| 2 | **A control drawn as a reading, because nothing backs it** | frame 12's push switch (`SwitchFigure`) and its three settings; frame 13's “Retry sync” and “Manage downloads”; frame 15's three filter chips and its listings count; the shared `Chip` everywhere it appears; frame 04's resend row; the language row; sign-out while it is working; a card or row whose caller has nowhere to go | Nothing: no alert is delivered, no transport to retry over, no listing index, no second account role, no code that can be sent, no picker to open | **Drawn** | AGENTS.md §11.2; demo rows A12, A16, A17; ADR-017, ADR-026, ADR-042, ADR-043, ADR-044, ADR-048 §4 |
| 3 | **A control the frames draw and the app does not** | the map's recentre control (frames 06, 09); frame 12's “View Zone 18”; frame 10's “Add a berry photo”; frame 18's “Confirm berries received” and “Open dispute”; frame 14's “Default spot visibility” chips; frame 04's resend row | Nothing behind any of them: no position on a geographic map, no zone 18, no picker, no payment provider, no sharing model, no transport | **Absent** | [demo-and-stand-ins.md](demo-and-stand-ins.md) §7, each with what has to exist first |
| 4 | **A control that acts on the local record while its label names a service** | “Save report” (writes this phone's queue), “Save zone” (this device), “Share a copy” (the platform's own sheet), “Order” and “Contact the seller” (the demo's own screens), “Pause” and “End visit” (the disclosed demo visit) | Each press acts for real, but on something local: a queued report is not submitted, a saved zone is not synced, the share is the platform's, the marketplace and the visit are the design's samples | **Recorded** | Demo rows A5, A12, A16; ADR-026, ADR-040, ADR-042; the screen copy says so (“Saved on this phone. Nothing has been sent yet.”) |
| 5 | **A control whose handler is optional, and whose absence removes it** | the back control; every `TextAction` without a handler; the four `SettingRow`s; `ZoneRow`, `ZoneCard` and `ListingCard`; the sync-centre button; the sign-in-again action; the resend row | Nothing, and that is the point: with no handler the primitive returns the plain drawing — no role, no accessible name, no chevron — so assistive technology is never offered an action that does nothing | **Kept** | Asserted in `control-claims.test.ts`; AGENTS.md §11.2; ADR-048 §4 |
| 6 | **A control that states it is unavailable** | the verify action in a shipped build, the bookmark while the record is read, the consent switch while the consent is read, sign-out while it is working, the sign-in action with no identifier, “Save report offline” while the write runs | Nothing until the state allows it — and the state is exposed as `disabled`/`busy`, so the control is not offered as available | **Kept — one half was missing until 2026-10-13** | ADR-027 (a shipped build refuses the stand-in code), ADR-041, the screens' own tests, and the **in-flight** browser reading (`e2e/accessibility.spec.ts`) for the busy half. What it found: `react-native-web` folds neither `accessibilityState` nor `disabled` into an `aria-busy`, so the one control with a `busy` state *declared nothing at all* in the built export, and the spinner it draws was an unnamed image — a state the source reads as declared and the target dropped. Fixed at the cause in `AppButton` (the busy state stated for the web target beside the native one, the progress drawing hidden from the tree) |
| 7 | **Controls on the review-only surfaces** | the prototype switcher; the sign-in readings, including variants with a password, biometrics, a forgotten password and a password field; the community-map readings | The variants' presses work *as drawings* inside the review surface: no password, biometric or recovery flow exists in the app, and the production export proves none of it mounts outside a development build | **Read, with one gap left** | Demo-and-stand-ins class E; ADR-034's readings; `e2e/production-export.spec.ts` (they ship nowhere). **Read since 2026-10-12**: the accessibility walk and the layout harness both open every reading, from the prototypes' own variant tables (`e2e/prototype-readings.ts`) — which found an unnamed tab stop and a row that clipped at 200 %. **The gap left until 2026-10-13, and now closed**: the copy scan could not see their *words*, because a prototype's copy is literal English rather than catalogue keys — it reads them from source now, with the TypeScript compiler, and holds them to the same claim families against its own ledger ([docs/copy-claims-audit.md](copy-claims-audit.md) row 16). It found the sign-in reading proposing **the two sentences ADR-048 removed from the app** (a delivery nothing makes), recorded rather than reworded because a prototype's words are the design's. What stays outside is the *translation* half alone, by design: a reading has no Finnish to review |
| 8 | **The continue action on screen 05 named a settings step the app never takes** | **was** `onboarding.location.action` “Continue to location settings” / “Jatka sijaintiasetuksiin”; the key is unchanged and now reads “Continue to the map” / “Jatka kartalle” | The press records the consent and opens the app's map, exactly as “Skip without tracking” does; the platform's own permission is asked *in* the app when a screen first reads a position (ADR-045), and no location-settings screen exists | **Fixed** (2026-10-13) | [ADR-050](adr/ADR-050-screen-05s-continue-action-says-what-the-press-does.md) — the action says what the press does, no settings surface is built for it to open, and the frame's own words are kept as the label for the journey that really does lead there. The claim is held by the **copy** scan's family `a-settings-step-the-app-never-takes` (empty, asserted empty, with the shipped defect among its planted originals); **PROJECT.md known issue 33, closed** |
| 9 | **`AppButton` used to be the one primitive that claimed a role with no handler** | `src/components/atoms/app-button.tsx` | Its role and accessible name were unconditional, so a caller that passed no `onPress` would have shipped an inert button; every other primitive drops the role, the name and the chevron instead (`TextAction`, `SettingRow`, `ZoneRow`, `ZoneCard`, `ListingCard`, the sync-centre button) | **Kept — corrected 2026-10-12** | Follows `TextAction`'s rule now (no handler ⇒ no role, no name, no state, no tab stop; a handler ⇒ all of them plus the disabled/busy state); the primitive's own test holds both halves and the guard invariant in `control-claims.test.ts` asserts the site. **PROJECT.md known issue 34, closed** |

## What the audit changed

- **Nothing in code.** This pass records two known issues and indexes the exceptions; the one
  control it would have found on its own was already fixed a turn earlier, which is why family 2
  exists at all: frame 04's **resend row** claimed a code the app cannot send, and now renders only
  for a caller that can (ADR-048 §4, demo-and-stand-ins §7).
- **Two findings had no record anywhere**, and became **known issues 33 and 34**: the continue
  action whose label names a settings step (family 8 — a *label* claim, the copy side of the same
  ledger), and `AppButton`'s unconditional role (family 9 — no shipped screen did it, which is why
  it was recorded rather than fixed in the audit pass).
- **Family 8 is closed** (2026-10-13): the label was the frame's own words and the choice was the
  owner's, which is why the audit recorded it rather than rewriting it. The owner has since decided
  it ([ADR-050](adr/ADR-050-screen-05s-continue-action-says-what-the-press-does.md)): the action
  names the map the press opens, no settings surface is built for it to open, and the frame's words
  wait for the journey that really does lead to one. The vocabulary moved to the scan that can hold
  it — a family of the **copy** check, empty and asserted empty — because this is a label claim, and
  this ledger holds controls.
- **Family 9 is closed** (2026-10-12): `AppButton` now drops its role, name, state and tab stop when
  it has no handler, the way `TextAction` does, and keeps all four when it has one — a `disabled`
  action is still an action. The primitive's test holds both halves and the guard invariant asserts
  the site; the sweep that made it safe to change read all 14 shipped `AppButton` sites and found a
  handler at every one.
- **The prototype surfaces used to be outside every guard** (family 7), and are no longer: since
  2026-10-12 the accessibility walk and the layout harness both open all six readings, with the
  URLs read from the prototypes' own variant tables and the routes `src/app` renders them on, so a
  reading added to a table is read without anyone updating a list. On its first run that found two
  defects — a tab stop that claimed no role, so neither a role nor a name reached a browser (the
  eye glyph that reveals the password), and a row of two text actions that clipped at the largest
  system text size — and both are fixed at the cause. **The last instrument followed on
  2026-10-13**: the copy scan reads the readings' words too, from source, with the same claim
  families and a ledger of its own — and found on its first run that the sign-in reading proposes
  the delivery sentence (and the action label) ADR-048 had just removed from the app, recorded with
  its reason because the wording is the design's ([docs/copy-claims-audit.md](copy-claims-audit.md)
  row 16). The translation half still stays out, and by design: a reading has no Finnish.
- **Family 6 lost its blind half** (2026-10-13). The audit read every control's *declared* state from
  source, and the browser walk read the states a settled page shows — so the one state that exists
  only between a press and its write was never read anywhere on a shipped screen, and the target was
  dropping it: the save action on screen 10 announced “unavailable” in the DOM's native form and
  nothing in the form a browser reads, with an unnamed image as the only sign that it was working.
  Reading a control **in flight** is now part of the walk (TESTING.md §12), which is what turned the
  claim into a fact and sent the repair to the primitive rather than to the screen.
- **A third of the app's controls claim nothing on purpose** (families 2, 3 and 5). That is the
  frames' own drawings being honest rather than broken, and the reason both this document and the
  standing check spend most of their length on controls that *work*.

## Keeping it from drifting

`src/config/__tests__/control-claims.test.ts` holds five invariants:

1. **Every control site is on the ledger**, with the primitives it offers, so an added, moved or
   removed control fails the gate until its reason is updated.
2. **No ledger entry outlives its controls**, so a fixed or deleted control cannot leave a record
   claiming it is fine.
3. **The files whose controls are drawings claim no role at all** — frame 12's alerts screen, frame
   13's sync centre, frame 15's marketplace browse and the shared `Chip`.
4. **The guarded primitives keep their guard** — the four early returns, `TextAction`'s conditional
   role and `AppButton`'s (family 9). What it cannot hold is a hand-written `Pressable`, whose role
   is a literal and whose handler is not readable from source: that is the screen's own test and the
   browser's accessibility-tree walk (`e2e/a11y-tree.ts`).
5. **Frame 04's resend row is drawn only where a caller can send a code** (ADR-048 §4).

What a source scan cannot hold is the other half: whether a handler still does what its label says.
That is what the screens' tests are for, and what this document is for on the day a screen changes
without one.
