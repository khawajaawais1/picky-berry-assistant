# ADR-043 — Three parts of the frames that were waiting on a decision: frame 11's period chips filter, screen 03's terms link opens the notice, and frame 12's alert preferences are drawn as the design's own sample

- **Status:** Accepted (2026-10-11)
- **Deciders:** the project owner asked for the remaining screens and answered the three questions
  this repository put to them (2026-10-11); this repository drew each part, wrote the disclosure that
  goes with the preferences card and kept every figure in one place.
- **Related:** [ADR-039](ADR-039-frame-14s-two-remaining-rows-get-their-screens.md) (the notice
  screen 03's link now opens), [ADR-042](ADR-042-frame-13s-region-is-the-designs-sample.md) (the same
  answer for frame 13: draw the frame's block and say it is the design's sample),
  [ADR-020](ADR-020-record-consent-on-device.md) (the consent sentence the terms link sits under),
  [ADR-031](ADR-031-a-real-basemap-osm-derived-tiles-we-host.md) and known issue 30 (what a real
  basemap still needs), and the disclosure vocabulary of the other demo screens
  (`docs/demo-and-stand-ins.md`).

## Context

Three parts of the design file's frames had been left as drawings rather than as working parts,
each because a decision was missing rather than because the code was. They were recorded as such in
PROJECT.md and `docs/design-source.md`, and the owner has now answered all three:

1. **Frame 11's two period chips** (`5:23349`, `5:23354`) were drawn in the frame's states and claimed
   no role, on the rule that a control that cannot act must not claim one. The reason was real: there
   is no analytics service, the frame's only other figures are the design's sample month, and its own
   first chip reads “August 2026” while a picker's visits are dated by the device that saved them.
2. **Screen 03's terms link** (`5:22812`) was drawn as a label, because no terms document exists.
   Between the two there was nothing: the link looked like a link and could not be pressed, and the
   one screen that answers what a consent line should be able to answer — the device notice
   (`/terms-privacy`, ADR-039) — had no way in from the screen that collects the consent.
3. **Frame 12's alert-preferences card** (`5:23480`–`5:23504`) was left undrawn: a push switch for
   notifications nothing delivers and no permission asks for, a search radius and quiet hours nothing
   filters on, a species list nothing subscribes to. What is at stake is a claim about a phone: “Ripe-berry
   push alerts” switched on is a statement about *this* device, exactly as frame 13's storage meter was.

Each of the three could be left as it was. Each was decided the other way for the same reason: the
design names a capability the product is aiming at, and this repository's answer for the frames that
name one has been to **draw what the design draws, with the screen saying what is true** (frames 07,
08, 09, 10, 12, 13) — never to print a figure nothing measures or a control that cannot act.

## Decision

**All three parts are built, each in the way its own kind of truth allows.**

1. **Frame 11's period chips are a real single choice, and they filter the visit history.** The rules
   live in `features/discover/domain/season-insights.ts`: a visit's month is read in **UTC** — the same
   reading every date this app prints uses, so one stored visit belongs to one month on every phone —
   and `historyFor`/`outsidePeriodCount` say what each period keeps. The first chip is the frame's own
   “August 2026”: the month the design's three sample visits are in (`DEMO_HISTORY_MONTH`). The second
   is “All visits”: everything the phone is holding. **The screen opens on “All visits”** rather than on
   the chip the frame draws selected, because screen 10 saves a report and lands here: the default has
   to be the period that holds the visit the picker has just made, and the design's own month — with the
   summary above it — stays one press away.
2. **What the chips are showing is stated on the screen, in two lines under the history's heading**:
   the period and how many visits it holds ({count} and the period are values in the sentence), and —
   drawn only when there are any, which is only possible under the month chip — how many visits the
   period leaves out. A visit may be filtered off the list; it may not disappear without a trace.
   `ChoiceChips` draws them, so the choice has the radio semantics, the accessible group name and the
   frame's own 36 px metrics that screen 03's identifier chips already have.
3. **Screen 03's terms link opens the device notice** (`/terms-privacy`). No terms document exists and
   none is invented; what the app can honestly put behind a consent line is the notice: what this phone
   is holding, record by record, and the rights over each. The link is wired in the route, so
   `TextAction` gives it the button role and an accessible name — the same contract every action in the
   app has, and the reason it was a label before: a link that lands nowhere may not claim to be one.
4. **Frame 12's alert-preferences card is drawn as the design's own sample, and the card says so.** Its
   four settings are the frame's own (`DEMO_ALERT_PREFERENCES` in `features/discover/domain/alert.ts`,
   with the frame's node ids), its radius is printed by `formatRadius` — whole kilometres, the way the
   frame sets it, where the same screen's headline prints a measured distance with a decimal — and the
   closing line on the card is the disclosure that keeps the four figures from reading as this phone's
   settings.
5. **Nothing on that card can act.** The switch is a **figure**: a view with the frame's own 46x28 track
   and 22 px thumb and no role, because nothing delivers an alert and no permission is asked for. The
   three rows below it are readings, not controls, and **they drop the chevron the frame draws** for the
   same reason frame 13's rows drop theirs (ADR-042): a row that will never open anything may not draw
   the sign that says it will (AGENTS.md §11.2).
6. **Frame 12's “View Zone 18” action stays absent**, and this decision does not touch it: the app's demo
   map has no Zone 18, and an action that would open nothing still may not claim a role. It remains
   recorded in PROJECT.md as absent.
7. **Nothing in this decision builds a service.** No notification transport, no permission request, no
   search filter, no quiet-hours scheduler, no species subscription, no analytics over a picker's own
   season. What exists is the frame's drawing, the rules that make the chips honest, and the disclosures
   that say which figures are the design's.

## Alternatives considered

- **Leave the chips as labels** (the status quo). Safe, and it keeps a promise the app could not keep
  either way: the frame draws a selector and the screen shows a list, so the alternative was a list
  nobody could narrow — including the picker who wanted to look at last month's visits.
- **Make the first chip “this month”, generalising the design's “August 2026”.** Tempting, and it hides
  the design's own rows: frame 11's three sample visits are the story screens 07–10 tell, and the
  layout harness measures their copy in both languages. It also needs a month-name formatter in two
  languages that nothing else in the app asks for.
- **Open on the design's own month chip.** The design draws it selected, and it would hide the visit
  screen 10 has just saved — the flow the screen sits at the end of — and make the frame's own note
  (“Includes your queued visit”) false whenever the picker's visit is not an August one.
- **Filter silently, with no count lines.** The frame draws no such line, and it would drop a picker's
  own report off the screen with nothing saying so, which is the defect this repository spends the most
  words avoiding.
- **Leave the terms link as a label.** It was the honest reading while the link had nowhere to go. Once
  the notice existed, the same honesty required the opposite: a link that cannot open the one screen the
  app has about the user's own records is a dead end on the screen that asks for consent.
- **Draw the preferences card with the values as real settings** (a working switch, tappable rows). Every
  one of them would claim a capability nothing has, and the push switch would be the worst of the four:
  it promises the app can reach this phone's notification centre, which it cannot.
- **Keep the preferences card omitted.** Then frame 12 stays half-drawn for no gain: the card says what
  the product intends to ask, and the disclosure is what keeps it from being read as this phone's state.
- **Extract a shared settings-row component now.** Frame 14's screen and frame 13's card each have a
  local row of this shape, and this adds a third. It is a real candidate for extraction and a separate
  change: it would touch two features' screens, and this decision's evidence is the three parts above.

## Consequences

- Frame 11 is complete as a drawing *and* as a part: every row the app holds is reachable, the period
  it is showing is named with its count, and a filtered-off visit is counted. The frame's own three
  sample rows remain in the list, in both languages, at both text sizes, which is what the layout
  harness measures.
- Screen 03's consent line now leads somewhere real: the notice, which is also where a picker can see
  the consent record itself (ADR-020's record, read back).
- Frame 12 is complete as a drawing: every part of the frame is on the screen, and the four settings
  that nothing backs are named on the card as the design's sample. Known issue 20's list of unbuilt
  parts becomes a list of *sample* parts.
- The app's control rule is unchanged and now holds in a new place: the switch is a figure, the three
  rows are readings, no chevron is drawn on a row that opens nothing, and “View Zone 18” is still not
  drawn at all.
- Costs: one domain module for the frame's four settings, two rules added to another (month, period and
  the two count lines), five catalogue keys in each language, and the two cards' heights in the layout
  harness at both text sizes and in both languages. The accessibility suite holds the chips' state on
  the web target, and the terms link's destination is proven in the built export.
- What this decision does **not** settle: what a real analytics period is (the chips filter a list, they
  do not aggregate anything), what a real terms document says, and what a real alert preference does.
  When any of the three arrives, the `DEMO_` module for the card is deleted and the screen reads the
  setting it actually holds.

## References

- `src/features/discover/domain/season-insights.ts` and its test;
  `src/features/discover/components/season-insights-screen.tsx` and its test (the filter, the two lines
  and their Finnish wrapping); `e2e/layout.spec.ts` (frame 11's count line as the copy the page opens
  with); `e2e/accessibility.spec.ts` (the chips' `aria-checked` state, and what the choice does to the
  list in a real browser).
- `src/features/discover/domain/alert.ts` (`DEMO_ALERT_PREFERENCES`, `formatRadius`),
  `src/features/discover/components/alerts-screen.tsx` (`SwitchFigure`, `PreferenceRow`) and their tests;
  `src/constants/theme.ts` (`layout.switchWidth`, `switchHeight`, `switchThumb`) and its test.
- `src/app/create-account.tsx` (the wired link) and `e2e/accessibility.spec.ts` (the link's destination
  in the built export); `src/components/molecules/text-action.tsx` (the role an action claims only while
  it can act).
- The frames' nodes: `5:23343` (frame 11, its chips at `5:23349`/`5:23354`), `5:22788` (screen 03, its
  consent row and link), `5:23439` (frame 12, its card at `5:23480`, the switch at `5:23485`, the rows'
  values at `5:23492`, `5:23498` and `5:23504`).
- PROJECT.md issues 19 and 20; `docs/design-source.md`'s status table and the three screens' sections;
  `docs/demo-and-stand-ins.md` rows A8, A10 and A17.
- `docs/demo-and-stand-ins.md`'s disclosure vocabulary (`· SEASON DEMO` / `· KAUSIDEMO`) and ADR-042.
