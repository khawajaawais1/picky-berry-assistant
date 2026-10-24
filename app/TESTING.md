# TESTING.md — Testing strategy

Last updated: 2026-10-24 (current state refreshed). Pairs with
[DEFINITION_OF_DONE.md](DEFINITION_OF_DONE.md) and [ADR-004](docs/adr/ADR-004-tdd-and-test-stack.md).

## 1. Test-driven workflow (required)

```
RED    → write the failing test that states the expected behaviour
GREEN  → implement the minimum code that makes it pass
REFACTOR → improve the design with the test still green
```

For each change: define the expected behaviour, list the edge cases, list the
security cases, write the tests, **watch them fail for the expected reason**,
implement, make them pass, refactor, then run the full suite plus `typecheck` and
`lint`.

Exceptions (must be stated in the task report): pure scaffolding with no
behaviour — a new folder layout, config files, documentation, dependency bumps.
Product behaviour, validation, domain rules and security logic have no exception.

## 2. Test layers and where they live

| Layer | What it covers | Location | Tooling |
| ----- | -------------- | -------- | ------- |
| Unit | `domain/` rules, pure helpers, config/validation, token mapping | `src/**/__tests__/<name>.test.ts` | Jest |
| Component | atoms, molecules, templates, feature UI with fixture props | `src/**/__tests__/<name>.test.tsx` | Jest + React Native Testing Library |
| Integration | a feature's public API end to end (domain + hook + UI wiring) | `src/features/<feature>/__tests__/` | Jest + RNTL, `renderHook` |
| Security | validation rejection, authorisation/ownership assumptions, no-leak assertions | alongside the unit/integration test it belongs to | Jest |
| Layout and built-artifact states | every built screen in both shipped languages and at the largest system text size: each string's line count from the design at the design's own size, page overflow and clipping at both; plus the consent controls' ARIA states and the stored consent record in the built export | `e2e/*.spec.ts` | Playwright — `npm run test:layout` (§12, ADR-018, ADR-019, ADR-020) |
| E2E | critical user journeys on a real build | **not set up yet** (planned: Maestro) | — |

Tests are **colocated** in `__tests__/` next to the code they cover. The bootstrap
specification suggested a top-level `tests/` folder; colocation is used instead so
a test is impossible to lose when its module moves. Recorded in ADR-004.

## 3. Naming and structure

- File: `<subject>.test.ts(x)`, inside `__tests__/`.
- Suite: `describe('<UnitName>')`; nested `describe` only for meaningful groups.
- Test name: a sentence that states observable behaviour —
  `'rejects URLs with embedded credentials'`, not `'works'`.
- One behaviour per test. Prefer table-driven `it.each` for input matrices.
- Arrange / Act / Assert, separated by blank lines.
- Use fixtures and factories inside the test file; do not share mutable state
  between tests.
- Do not assert on implementation details (private helpers, internal call counts
  of collaborators) — assert on observable behaviour.

## 4. Tooling (as installed)

| Tool | Version | Notes |
| ---- | ------- | ----- |
| Jest | 29.x | `jest-expo` 57 preset, `clearMocks: true` |
| React Native Testing Library | 14.x | `render`, `fireEvent` and `renderHook` are **async** — always `await` them |
| @types/jest | 29.5.x | pinned to match Jest (`tsconfig` sets `"types": ["jest"]`) |
| Playwright | 1.63.0 (**exact**) | Browser harness (§12). Its browser build is version-locked, so the version is exact rather than a range. One-time `npx playwright install chromium` |

`jest.config.js` mirrors the tsconfig `@/*` alias with `moduleNameMapper`; keep
the two in sync. `jest.setup.ts` mocks `react-native-safe-area-context` with the
library's own test mock and enables the RNTL matchers. Nothing else may be
globally mocked: hiding failures with broad mocks is forbidden.

### Tailwind in tests

`className` is resolved by NativeWind from compiled CSS, which normally only Metro
produces. Jest therefore compiles the same CSS itself: `jest.global-setup.js` runs the
Tailwind build once per run, and `jest.setup.ts` calls `setupAllComponents()` and
`registerCSS(...)` before any test renders. Two consequences worth knowing:

- Style assertions on a `className` are real assertions — `toHaveStyle` sees the
expected values, so a wrong utility fails the test (see the AppButton metrics tests).
- A `style` **function** (the usual Pressable pressed-state form) is opaque to the
  matcher. Put resolved values in a plain object — `AppButton` holds its pressed state
  in `useState` for exactly this reason — so the colour or size stays verifiable.

Commands (run from `app/` — the npm package lives there, not at the repository root):

```
npm test              # full suite
npm run test:watch    # watch mode
npm run test:coverage # coverage report
npm run verify        # format check + typecheck + lint + test (the gate CI enforces)
```

## 5. Interaction style

- `fireEvent.press(...)` for deterministic unit/component interaction, including
  disabled and busy states where the element must ignore the gesture.
- Prefer `userEvent` for flows that should resemble a real person (typing,
  multi-step gestures) — it is closer to production behaviour. Use it for new
  integration-level interaction tests.

## 6. Mocking strategy

- Mock at the boundary (network, storage, clock, permissions), not in the middle
  of domain logic.
- `domain/` code must be testable without mocks; if it needs one, the design is
  wrong.
- Mock timers (`jest.useFakeTimers()`) for retry/backoff and any time-based rule,
  and always restore them.
- Never assert against a mock's internal calls when a behavioural assertion is
  possible; never mock the unit under test.

## 7. What must be covered (business-critical)

Because these are the rules that must never silently regress:

- authentication, authorization, resource ownership, IDOR/BOLA rejection
- GPS zone entry/exit and visit lifecycle
- yield/quality score logic, trust score logic
- offline queueing, synchronisation, retry/backoff, duplicate suppression
- API request/response validation and error mapping
- notification decisions
- file validation (type, extension, size, metadata handling)
- privacy rules (what may be returned to whom)
- configuration validation (see `src/config/__tests__/env.test.ts` for the pattern)

For every such rule include the rejection case, not just the happy path.

The first authorisation rule exists before its server does, and it is written here so both sides
are held to one answer: **who may read a share**
(`src/features/sharing/domain/__tests__/share-access.test.ts`,
[ADR-032](docs/adr/ADR-032-the-first-backend-slice.md)). It asserts each refusal separately
(`not-found`, `not-holder`, `expired`, `revoked`, `unreadable`), the two instants around expiry,
the revoked grant that stays the sharer's own, and the list that must never return a share the
viewer is not on. A server implementation that does not satisfy those cases is wrong rather than
different, and the API's own tests owe the mapping the contract states — every one of those
refusals answered as a single `404` ([docs/api-contract.md](docs/api-contract.md)).

## 8. Coverage

Coverage is collected (`collectCoverageFrom` in `jest.config.js`) and **thresholds
are intentionally not enforced yet** — there is not enough product code for a
percentage to mean anything. A global threshold will be introduced with the first
product feature. Until then the contract is behavioural: every business-critical
rule listed in §7 has tests, and coverage never drops as a side effect of a change.
Route files (`src/app/**`) and barrel files (`index.ts`) are excluded: they are
thin adapters with no behaviour of their own. Throwaway prototype code
(`src/**/prototype/**`, the `prototype` skill's UI scaffolding) is excluded too: it
exists to answer one design question, and the variant that wins is rewritten with
tests here rather than promoted from the scratch version.

## 9. Definition of test completion

- New/changed behaviour has tests that fail without the change.
- The full suite passes (`npm test`), with no `.skip`, no `.only`, no assertion
  weakened to make it pass, and no snapshot blindly regenerated.
- `npm run format:check`, `npm run typecheck` and `npm run lint` pass — all three are
  inside `npm run verify`, which is what makes `verify` the whole gate and not most of it.
- Security-relevant paths have an explicit rejection test.
- Flaky tests are fixed or removed with an explanation — never retried into green.

## 10. CI

`../.github/workflows/mobile.yml` (at the repository root, `working-directory: app`) runs on
every push to `main` and every pull
request touching `app/**`: `npm ci` → `typecheck` → `lint` →
`format:check` → `test --ci` → `expo-doctor`. A red gate must be fixed, not
bypassed. A second job, **Layout in both languages and text sizes**, then installs a browser
and runs `npm run test:layout`, which builds and serves two static web exports one after the other
— the development one and a `EXPO_PUBLIC_APP_ENV=production` one (§12); it needs the first job
green, so a broken build does not pay for a browser download. Device E2E is still not part of CI:
when Maestro is added it will run on a build artifact rather than on every pull request.

## 11. Current state

118 suites, 1187 tests, all passing (2026-10-24), plus 200 browser checks in the development
export (211 when the harness's own 11 measurement probes are counted) and 4 in the production one
(`npm run test:layout`, §12, last measured 2026-10-24). Every app-drawn
screen the design never drew is measured there — the sign-in screen, frame 14's two destinations,
the copy those records are taken on and the saved plan the design's own row opens — each in both
languages and at the largest text size.

**The Firebase password-reset request (ADR-062) is covered at three levels:** the provider adapter
(`src/services/session/__tests__/firebase-password-reset.test.ts`: endpoint, body, refusals and the
no-key null), the availability rule (`src/services/session/__tests__/password-reset.test.ts`), and
the app-drawn screen (`src/features/onboarding/components/__tests__/forgot-password-screen.test.tsx`:
copy, stand-in notice, live confirmation and failure). The production export's disabled action is
checked by `e2e/production-export.spec.ts`.

**The watch budget's field instrument (ADR-063) is covered at two levels plus its gate:** the
accumulator and its summary (`src/features/field-test/domain/__tests__/field-measurement.test.ts`:
cadence arithmetic, stale and repeated fixes, the battery delta and its invalid states), the
screen (`src/features/field-test/components/__tests__/field-test-screen.test.tsx`: the real watch
mounted for a watch run and not for a control, the refusal on a charger or Low Power Mode, the
summary and its share), and the production redirect (`e2e/production-export.spec.ts`). What no test
here can supply is the measurement itself: the phone protocol, the values under test and the empty
result sheet are [docs/field-test.md](docs/field-test.md), and no run has been recorded yet.

The index below is the initialization
slice's suite list
(2026-10-09) and keeps the suites that carry a rule rather than a screen; every screen added
since names its own suites in [PROJECT.md](PROJECT.md)'s “Current work”:

| Suite | Path |
| ----- | ---- |
| Configuration validation | `src/config/__tests__/env.test.ts` |
| The ADR record (every citation resolves to a file; the index and PROJECT.md's decision list list every ADR and nothing else) | `src/config/__tests__/adr-integrity.test.ts` |
| The screen inventory (every frame the design file contains is decided about, every route a row names exists, and every page file under `src/app/` has a row in `docs/design-source.md`) | `src/config/__tests__/screen-inventory.test.ts` |
| Locale resolution (device tags → supported locale, fallback) | `src/services/i18n/__tests__/locale.test.ts` |
| Catalogue completeness (every locale translates every key, no stray keys, placeholders in step, the measured length budget for single-line copy, and no key the app never names) | `src/services/i18n/__tests__/catalogue.test.ts` |
| Translation lookup | `src/services/i18n/__tests__/translate.test.ts` |
| Design tokens (incl. the design-sourced palette/type block) | `src/constants/__tests__/theme.test.ts` |
| Colour contrast of every shipped pair, WCAG AA, both schemes | `src/constants/__tests__/contrast.test.ts` |
| AppText atom | `src/components/atoms/__tests__/app-text.test.tsx` |
| AppButton atom | `src/components/atoms/__tests__/app-button.test.tsx` |
| AppTextInput atom (frame 03's 54 px control) | `src/components/atoms/__tests__/app-text-input.test.tsx` |
| AppCheckbox atom (frame 03's consent glyph) | `src/components/atoms/__tests__/app-checkbox.test.tsx` |
| FormField molecule | `src/components/molecules/__tests__/form-field.test.tsx` |
| ChoiceChips molecule (frame 03's chip pair) | `src/components/molecules/__tests__/choice-chips.test.tsx` |
| Callout molecule (frame 03's status message) | `src/components/molecules/__tests__/callout.test.tsx` |
| Screen template | `src/components/templates/__tests__/screen.test.tsx` |
| Tailwind theme drift (utilities vs tokens) | `src/constants/__tests__/tailwind-theme.test.ts` |
| Onboarding welcome screen (frame 01) | `src/features/onboarding/components/__tests__/welcome-screen.test.tsx` |
| Onboarding create-account screen (frame 03) | `src/features/onboarding/components/__tests__/create-account-screen.test.tsx` |
| Create-account form rules (pure domain) | `src/features/onboarding/domain/__tests__/create-account-form.test.ts` |
| Onboarding screens on a Finnish device | `src/features/onboarding/components/__tests__/localized-copy.test.tsx` |
| Visit policy (defaults + server payload validation) | `src/features/visits/domain/__tests__/visit-policy.test.ts` |
| Zone containment (point-in-polygon, degenerates, overlaps, and the resolution rule a caller supplies when a point is in two zones) | `src/features/visits/domain/__tests__/zone-containment.test.ts` |
| Visit lifecycle (dwell, grace, segments, day span, replay) | `src/features/visits/domain/__tests__/visit-lifecycle.test.ts` |

Not covered by tests: the route layer, the native bundle build (verified manually
with `npx expo export --platform ios`), and runtime behaviour on a device. Layout is
measured in a browser rather than on a device (§12), so a platform font difference
remains a manual check.

## 12. Layout in every shipped language and at the largest system text size

The harness also holds the app shell (ADR-022): each of the nine routes it covers must draw the
core navigation with the destination its frame draws current, switching a destination must navigate
and leave the previous one behind, onboarding must have no bar at all, and the bar's four labels are
measured as copy of every shell screen — in both languages and at both text sizes, which is what
caught a label being cut off inside its quarter of the bar.

The design is authored in English and Finnish runs longer, so a translation can wrap
where the frame draws one line or clip inside its box. Jest cannot see either: it has no
layout engine. `npm run test:layout` (Playwright, ADR-018, ADR-019) therefore measures every
built screen in both languages at the frame's 390 px width, and twice over: at the design's
own text size and at the largest one a platform setting can ask for.

- **`e2e/layout.spec.ts` holds the manifest.** Per screen: its path, the copy that proves
the language applied, and each string with the number of lines its frame draws
(`maxLines`; read from frames `5:22710` and `5:22788` — a string gets 2 only where the
frame draws 2). It fails when a string takes more lines than its frame gives it, when a
string the design draws is missing from the screen, when the page scrolls sideways, or
when text is cut off inside a box that hides its overflow. A failure attaches a
screenshot of the screen.
- **The language is the browser's locale**, which reaches the app through
`useLocales()` → `navigator.languages`: the same path a Finnish phone takes. Nothing is
injected into the app to force a language, and the measurement waits for the locale's
first string to appear — so a broken locale path fails the run instead of silently
measuring English.
- **The largest system text size is emulated in the page**, because the web export has no
such setting: `react-native-web` renders px sizes literally and ignores `allowFontScaling`
and `maxFontSizeMultiplier`. `applyFontScale` multiplies the font size and line height of
every text element by the factor a device would apply — 2.0, which is Android's
accessibility maximum and WCAG 1.4.4's requirement (`LARGEST_FONT_SCALE`) — and records the
originals so applying it again repairs a re-render instead of doubling the type. At that
size the **frames' line counts are not asserted**: a paragraph must reflow. What is asserted
is that nothing is lost — every string still renders, no box overflows or hides its content,
and the page does not scroll sideways (ADR-019).
- **Icon glyphs are excluded from both the emulation and the overflow check.** They are the
one part of the interface whose behaviour at a large text size cannot be measured on this
target, since the props that control it are exactly the ones `react-native-web` ignores — and
a check that cannot be verified must not demand a fix. Absolutely positioned descendants are
excluded too: RN-web stretches one to its container's width where native sizes it to its
content, which is a wide empty box rather than copy being cut off.
- **`e2e/measure.spec.ts` tests the probes** against synthetic pages that must be
reported (a wrapped line, a clipped one, a scaled page, an icon glyph that must be left
alone, a container that must not be mistaken for its label) and a clean page that must not.
This is deliberate: a measurement that can only report “fine” would put the whole defect
class in CI's blind spot with a green tick on top.
- **`e2e/accessibility.spec.ts` checks the built controls' states, the journeys only the built app
can walk — the sign-up through the account row, the saved plan and sign out among them — and, since
2026-10-12, the accessibility tree of every built screen **and of the state each press in those
journeys leaves behind**, with a screen **while an action on it is working** read the same way since
2026-10-13 (below). It deliberately does not check the screens' layout.**
It exists because one defect class is created by the target and invisible to Jest:
`react-native-web` renders a Pressable with the checked state in `accessibilityState` and
writes no `aria-checked`, so the consent box's state reached a browser's accessibility tree
nowhere but the glyph's colour — while React Native folds `aria-*` into the native state
before a host element exists, which is why the unit tests could not see it. The spec drives
the export the app ships, asserts the states a screen reader needs (the consent box's
`aria-checked` on and off, the switch's role, name and checked state, the action's disabled
state), and checks the consent record through the interface a user has: the switch writes it
and the onboarding row reads it back ([ADR-020](docs/adr/ADR-020-record-consent-on-device.md)).
A native-only prop would pass here and fail on a device, so both halves stay: the unit tests
hold the native contract, this holds the web one.
- **That spec also walks the accessibility tree of every built screen** (`e2e/a11y-tree.ts`, in the
same run). The states above were each found by a person reading one screen — the consent box's
`aria-checked`, the chip rows', the yield rating's — and each later than it should have been, so
this reads the same rule systematically, in four questions: **every control a screen exposes has a
role, an accessible name, and the state the page declares for it**, and **every image the tree
exposes has a name** — an image is either named content or hidden decoration, and unnamed is neither
(the rule the app's own map was fixed under; known issue 35). Two things make it a walk rather than a snapshot of
one page. The **routes are the app's own**, read from `src/app` the way the screen inventory asserts
them, so a screen added tomorrow is walked tomorrow and the reach is asserted rather than assumed
(24 routes today). And the **states are read in both directions**: a declared `aria-checked` the tree
dropped is one defect, and a `[checked]`/`[selected]`/`[disabled]`/`[busy]`/`[expanded]`/`[pressed]`
flag the tree shows that nothing declared is another. It reads the page's controls and the browser's
computed tree (`ariaSnapshot`) and pairs them by role and name — the browser's tree, because React
Native folds `aria-*` into `accessibilityState` before a host element exists, which is why a Jest
render cannot see this class at all. A control that claims no role **because it cannot act** is not
flagged: the app draws those as readings (§11, AGENTS.md §11.2), and demanding a role there would be
asking for the opposite of the rule. A screen that exposed no control would pass vacuously, so every
walk asserts a floor of one control first, and `e2e/a11y-tree.spec.ts` tests the instrument against
synthetic pages — a planted violation of each rule must be reported, a clean page must produce
nothing — with a planted violation inside the walk on a real screen beside it. **Adding a screen adds
its walk by itself**; what no walk can read is written down in the module: a state the app keeps in
React state and declares nowhere, whether a name is a *good* name, whether a reading should have been
a control, and a name that reaches the tree but says nothing (the map's own labels are the case: the
platform reads them and Chromium ignores them, so the zones' *states* arrive as a flat run of text —
known issue 36).
- **The same reading is taken after the presses too, not only at rest** (`expectTreeReadable`). A
state a user spends the journey in is usually one a press produced: a consent box that is checked,
a chip that moved the field behind it, a visit that is paused, a bookmark that now says what the
next press would do, a settings screen that has an account row on it at all, a thread reached from
an order. None of those is open to the walk, which loads a fresh export holding no session and no
interaction, so every interaction in the journeys above is followed by one reading of the state it
left behind — through the same function, so the floor and the rules are the walk's own. A failure
names the route **and the press that got there** (“`/active-visit`, while the visit is paused”),
because the finding is about the state the interaction produced and not the screen's first frame.
**A screen is also read while an action on it is working** (`readInFlight`, `e2e/platform-storage.ts`,
2026-10-13). The reading after a press is taken once the press has finished, and the frame *inside*
an action is the one no settled reading can reach, because settling is what waits it out — while a
screen reader meets it on every save. So screen 10's “Save report offline” — the app's only action
with a `busy` state — is read between the press and the write landing, through the same
`findingsIn` rules and with a floor of its own: **exactly one control must be declared busy** before
anything else is asserted, or a reading that caught nothing would pass every rule vacuously. The
rules gain one the settled walk never needed — a control that says it is working has to say it
cannot be pressed — and the reading then asserts what the frame must still be: the action keeps its
role, its name and its unavailable state, the spinner it draws stays **out** of the tree (an exposed
drawing with no name is the defect known issue 35 recorded), the write lands and the flow moves on,
so what was read was in flight rather than a screen stalled with its spinner up.

The page has to be slowed before it can be read: `AsyncStorage`'s web implementation resolves
synchronously, so on this target the busy frame lasts a microtask and never reaches the DOM, while on
a device it lasts as long as the write does. `e2e/platform-storage.ts` defers the reaction of the
promises the app's storage layer creates — no product code, no screen, no store touched, the same
values in the same order one task later — and its header carries the measurement that demanded it.
**What the reading found on the shipped screen is why it was worth writing**: `react-native-web`
folds neither `accessibilityState` nor `disabled` into an `aria-busy`, so an action that was working
declared nothing at all in the built export, with an unnamed image as its only sign — a state the app
holds in React state and the target dropped, which is the class Jest cannot see (React Native folds
`aria-*` into `accessibilityState` before a host element exists, so a Jest render shows the native
half and never the web one). Both halves are fixed at the cause: `AppButton` states the busy state
for the web target beside the native one, and hides the progress drawing from the tree.
- **`e2e/production-export.spec.ts` runs against a second export, built the way a release is.**
It exists because one defect class is created by the *build* and invisible to everything else:
`EXPO_PUBLIC_*` values are substituted only for a literal `process.env.EXPO_PUBLIC_<NAME>` read,
so a name looked up through a variable leaves the read unset in every bundle — Node's real
`process.env` makes the unit tests pass regardless, and the source looks right. It was found
that way: `appEnvironment()` answered `development` in a production build, which accepted screen
04's stand-in code (ADR-027) and mounted the sign-in prototype. The spec builds with
`EXPO_PUBLIC_APP_ENV=production` and asserts what only that build can promise — the stand-in code
is refused and its action stays disabled, and `?variant=` mounts no prototype.
- **The two exports are two commands, each alone and each with `--clear`**
(`playwright.config.ts`, `playwright.production.config.ts`; `npm run test:layout` runs them in
order). Not a style choice: Metro's transform cache is keyed on the source rather than on the
inlined `EXPO_PUBLIC_*` values, so two exports of one working tree through one cache hand the
second the first's environment. Measured, not theorised — with both servers in one config the
production export baked in `.env`'s `development` and these two cases failed in exactly the
direction they exist to catch, so the harness reported the opposite of what it was checking.
- One command is the whole run: `npm run test:layout` builds **both** static web exports and
serves each one itself, sequentially. It needs a browser once —
`npx playwright install chromium`, which CI does with `--with-deps`.

It measures the web export, not a device: platform fonts remain a manual check (see
§11), icon glyphs at a large text size are a device check (ADR-019), and device journeys
stay Maestro's job. **The runner is held to Android's own typeface, and waits for a reading to
mount, since 2026-10-21** — both found by the first CI run. Without `fonts-roboto`, Chromium falls
back to a Liberation font whose glyphs are wider, and Finnish copy at 200 % was reported as clipped
on the runner while passing on a machine that had the font the design is measured with; the job now
installs it. And `page.goto` returns on the **static shell**, so a cold runner measured the six
prototype readings before React had drawn them — every one failing at the design's text size while
its 200 % case, one evaluation later, passed. The readings now wait for their own bar, which is the
same readiness `waitForLocale` gives the screens, not a retry: a reading that never mounts still
fails on the harness's own message. **Adding a screen means adding its copy to the manifest** — that is
where the design's line counts for it live — and it is then measured in both languages and
at both text sizes. A screen the design never drew (the list behind frame 14's “Saved spots”
row, ADR-030) has no line counts to take: it goes into the manifest with its path and its copy
and no `maxLines`, which holds it to “every string still renders at 200 %” — the copy's own
expectations live in its unit test.

**The review-only prototype surfaces are measured here too** (2026-10-12): the six readings of the
sign-in screen and the community map, in English only, because a prototype's copy is literal
English by design and a Finnish run would look for copy the reading does not have. Their URLs come
from the prototypes' own variant tables and the routes `src/app` renders them on
(`e2e/prototype-readings.ts`), so a reading added to a table is measured without anyone updating a
list — and a reading with nothing declared to measure is a failure, not a skip. Each reading's own
copy is declared verbatim, its line counts are not asserted (no frame draws these screens), and
what is asserted is what the harness asserts everywhere: every declared string renders, none is cut
off, and nothing spills out of the box the app gave it — at the design's text size and at 200 %.
On its first run that found a row of two text actions clipped at the largest text size, now fixed.
The accessibility walk reads the same six readings through the same table (§12's rules above), and
found there a tab stop that claimed no role, so neither its role nor its accessible name reached a
browser.

**Their wording is read too, since 2026-10-13** — by the *copy scan*, which used to be the one
instrument that could not see them (literal English is not a catalogue key, so there was nothing for
it to enumerate), and which now reads the readings' words **from source** with the TypeScript compiler:
JSX text and the props that carry copy, with comments, `report(…)` notes and interpolated strings
excluded, because only a parser tells them from copy. The same claim families apply, against a second
ledger that has to say which reading proposed the words and why it may
([docs/copy-claims-audit.md](docs/copy-claims-audit.md) row 16). On its first run it found that the
sign-in reading proposes **the two sentences the app itself shipped until 2026-10-12** — the delivery
claim ADR-048 removed — recorded rather than reworded, because a prototype's words are the design's
and the open questionnaire owns them. The half that still stays outside is the translation one, and by
design: a reading has no Finnish to review.

The measurement has already changed three components, which is what an instrument is for: the
screen header takes `min-h-header` instead of `h-header` (the design's 64 px is the floor, the
eyebrow and title may grow past it), `ChoiceChips` wraps its row, because at 200 % the Finnish
labels no longer fit the content column, and `AppTextInput` sets `min-width: 0`, because a
text input's intrinsic width is a character count and at 32 px it pushed the field off the
screen. At the design's own text size all three render exactly as the frames draw them
(ADR-019).
