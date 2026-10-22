# Design source

The UI design lives in Figma; this file records what it contains, what was extracted
from it, and how. **Values that reach code live in `src/constants/theme.ts`** — this
document records provenance and the gaps, never a second copy of the numbers.

- **File:** “Picky” — `https://www.figma.com/design/SFDhkQO0SDmWshHxpF6O7o/Picky`
  (file key `SFDhkQO0SDmWshHxpF6O7o`). Recorded without the share token, so opening it
  follows that file's Figma permissions; ask the owner for access.
- **Extracted:** 2026-10-08 via `GET /v1/files/:key` with a read-only personal access
  token (kept in `.secrets/figma.token`, git-ignored). 1,472 nodes.
- **First read visually** (anonymous view) on the same day; the frame figures below are
  from the file itself and supersede that reading, which misread screens 13 and 17.

**The frames still decide what a screen looks like, beside the team's plan.** The project team's MVP
planning documents, transcribed in [plans/team-mvp-plan.md](plans/team-mvp-plan.md), name a smaller
screen list in their own words (login/register, map, zone detail, active visit, feedback, alerts,
my stats, profile & privacy) and MapLibre in place of the drawn map. Adopting them
([ADR-051](adr/ADR-051-the-team-mvp-plan-becomes-the-apps-target.md), Proposed) leaves this file's
authority where it was: the plan says what a screen is *for*, the Figma frames say what it looks
like, and a screen the plan names that no frame draws is app-drawn and recorded as such.

**The file is authored in English only.** It contains no Finnish copy, although screen 01's
footer reads “Made for Finland's berry season · EN / FI” and the app ships in Finnish
and English (ADR-017). The Finnish strings therefore come from this repository, not from
the design, and they need a native review — they are recorded in PROJECT.md's open
questions rather than here, and they live in `src/services/i18n/locales/fi.ts`.

## What the file contains

Nineteen top-level frames: an onboarding flow, the core picker flow, account and
offline settings, a marketplace marked as a planned extra, and a foundations frame.

| #   | Frame name                                             | What it holds                                                          |
| --- | ------------------------------------------------------ | ---------------------------------------------------------------------- |
| 01  | Onboarding · Welcome                                   | Hero, “Find. Pick. Share. Sustain.”                                    |
| 02  | Onboarding · Choose role                               | “Your way to Picky” — two paths, see the assumption in PROJECT.md      |
| 03  | Onboarding · Create account                            | “A little introduction.” — name, email, password                        |
| 04  | Onboarding · Verification                              | Six-digit code, the heading naming what the step does (“Confirm it’s you.” — the frame’s “Check your inbox.” is the branch that earns it, ADR-048) |
| 05  | Onboarding · Location consent                          | “Find your bearings” — zone-map preview, two benefits, a consent row    |
| 06  | Core picker · Discover map                             | Season demo 28 Aug, search, zones on a map, species tags — its map, search field and species chips are built; its recentre control is not (see below) |
| 07  | Core picker · Zone details                             | “Zone 14 · Laajavuori”, species, score, season window                  |
| 08  | Core picker · Route to zone                            | 1.4 km · 22 min, “Follow the forest trail”, map cached offline          |
| 09  | Core picker · Active visit                             | “Picking in Zone 14”, arrival detected, timer running in the background |
| 10  | Core picker · Post-visit feedback                      | “How was the picking?”, exit detected, duration, quantity, photo        |
| 11  | Core picker · Visits and analytics                     | “Your season so far”, harvest bars, visit history                       |
| 12  | Core picker · Alerts and forecast                      | “A heads-up from the forest”, ripeness reasoning, severity             |
| 13  | Account and offline · Downloads                        | “Ready beyond the signal” — offline sync centre, queued reports         |
| 14  | Account and offline · Profile and privacy              | “Private by nature”, profile, privacy toggles, sign out — built to the end of what the app can be true about (see below) |
| 15  | Planned marketplace · Browse                           | “The local harvest”, “Buyer mode · Preview”                            |
| 16  | Planned marketplace · Listing detail                   | Product, producer, price per kg                                        |
| 17  | Planned marketplace · Seller chat                      | Messages with a verified seller                                        |
| 18  | Planned marketplace · Checkout and order status        | Reservation confirmation, totals                                       |
| —   | Picky · Shared visual foundations                      | The design system: palette names, type, radii, component states         |

Screen 13 is an **offline sync centre**, which corroborates ADR-005's offline-first
capture; screens 15–18 label themselves “planned extra” and “outside core”, matching
the marketplace being planned rather than v1 scope. Those four are nevertheless **built**,
as the frames' own disclosed demo behind their own routes, with no listings service, chat
transport or payment provider behind them ([ADR-026](adr/ADR-026-marketplace-screens-as-a-disclosed-demo.md)).

## Screen status

Built one screen at a time, tests first; the route that renders it is noted because a
screen without a reachable route is not implemented.

| #   | Screen            | State          | Node     | Rendered by                     |
| --- | ----------------- | -------------- | -------- | ------------------------------- |
| 01  | Onboarding · Welcome | **implemented** | `5:22710` | `src/app/index.tsx` → `features/onboarding` |
| 02  | Onboarding · Choose role | out of v1 scope (design exploration only) | — | — (see PROJECT.md assumption 1) |
| 03  | Onboarding · Create account | **implemented** | `5:22788` | `src/app/create-account.tsx` → `features/onboarding` |
| 04  | Onboarding · Verification | **implemented** — including the phone state the frame does not draw, whose two headings, two change actions and foot card follow the destination the code was sent to (assumed 2026-10-13, [ADR-049](adr/ADR-049-screen-04s-phone-states-and-the-words-that-follow-them.md)) | `5:22840` | `src/app/verify-email.tsx` → `features/onboarding` |
| 05  | Onboarding · Location consent | **implemented** | `5:22885` | `src/app/location-consent.tsx` → `features/onboarding` |
| 06  | Core picker · Discover map | **partial** — the header, the frame's search field and species chips (which really filter: the map draws only the zones they leave, and a line says how many), the app's own drawing of that filtered map, the zone-state legend, the zone card (which opens screen 07), the frame's map/list toggle with the zone list behind it, and its download glyph (which opens screen 13); its recentre control is not built, because the map does not move, nothing asks the device for a position, and — found by reading the code on 2026-10-12 — the drawing's paths are the frame's own coordinates rather than latitude and longitude, so a real fix would have no place on it (the seam that could read one exists as of 2026-10-12, [ADR-045](adr/ADR-045-a-position-behind-a-port-and-nothing-kept.md), and no screen asks it for a fix): what the control waits on is a map with geographic coordinates, the real basemap ([ADR-031](adr/ADR-031-a-real-basemap-osm-derived-tiles-we-host.md)), beside a position source ([ADR-044](adr/ADR-044-the-partial-frames-remaining-parts.md)); its core navigation is the app shell (ADR-022) | `5:22942` | `src/app/(app)/discover.tsx` → `features/discover` |
| 07  | Core picker · Zone details | **partial** — the header, the season photograph, the species row the zone is reported for, the yield card, the outlook, the freshest report, the frame's own **bookmark**, which writes and removes the picker's saved-zone record on this device (ADR-024), the “Navigate” action that opens screen 08, and **“See all 11”**, which opens the report list this phone holds for the zone (app-drawn, [ADR-044](adr/ADR-044-the-partial-frames-remaining-parts.md) — see the app-drawn inventory below); its species row's third chip (“More”) is not drawn, because a single zone's screen has no species to narrow, and the zone's reports from *other* pickers are not on the list the link opens: nothing returns one, and the screen says so | `5:23032` | `src/app/(app)/zone-details.tsx` → `features/discover` |
| 08  | Core picker · Route to zone | **implemented** — the header, the offline note, the frame's own map with its walking route, the distance and arrival card, the next turn, “Start walking” (which opens screen 09) and “Cancel route”; its core navigation is the app shell (ADR-022), and the offline note is the frame's claim about a tile cache this app does not have | `5:23106` | `src/app/(app)/route-to-zone.tsx` → `features/discover` |
| 09  | Core picker · Active visit | **partial** — the header, the arrival note, the same map at 210 px, the live timer with its pause, the frame's privacy line, “End visit” (which opens screen 10) and the supporting line; the frame's recentre control is not drawn, for the reason frame 06's is not — position source and a map that carries geography ([ADR-044](adr/ADR-044-the-partial-frames-remaining-parts.md), [ADR-031](adr/ADR-031-a-real-basemap-osm-derived-tiles-we-host.md)); its core navigation is the app shell (ADR-022) | `5:23185` | `src/app/(app)/active-visit.tsx` → `features/discover` |
| 10  | Core picker · Post-visit feedback | **partial** — the header, the exit summary, the heading, the two species chips the frame names, its third chip (“More”), which reveals the rest of the app's species vocabulary, the five-cell yield rating, the harvest field, the offline note, “Save report offline” (which writes the device's report queue) and “Skip report for now”; the frame's “Add a berry photo” row is not built (the owner deferred evidence media) | `5:23259` | `src/app/(app)/post-visit-feedback.tsx` → `features/discover` |
| 11  | Core picker · Visits and analytics | **partial** — the header (with the design's own words plus a “SEASON DEMO” disclosure), the two period chips as one real choice filtering the visit history, the lines under the heading that state the period and its count, the month's summary card, the harvest chart and the history itself, whose rows are the picker's own queued reports above the design's three sample visits; the summary and chart are still the design's sample month, and its core navigation is the app shell (ADR-022) | `5:23343` | `src/app/(app)/visits.tsx` → `features/discover` |
| 12  | Core picker · Alerts and forecast | **partial** — the header, the alert with its score and confidence chips, the three reasons it gives, the alert-preferences card drawn as the design's own sample (its switch a figure, its rows readings) and the frame's own note about what a forecast is; its “View Zone 18” action is not built, because the app's demo composition has no Zone 18 — the action needs a zone source, or a zone the design never drew ([ADR-044](adr/ADR-044-the-partial-frames-remaining-parts.md)) | `5:23439` | `src/app/(app)/alerts.tsx` → `features/discover` |
| 13  | Account and offline · Downloads | **complete as a drawing** — the header (with the frame's own words plus the season-demo disclosure its sample region now needs); the frame's **offline status message**, drawn only when the device reports no reachable connection (ADR-025); the card that lists what is still waiting on the phone, which is the report queue screen 10 writes read back in the frame's own words; and the frame's **downloaded region, cached tiles and forecast, storage meter, “Retry sync”, “Manage downloaded regions” and last-sync line**, drawn as the **design's own sample and labelled as such** (the eyebrow's disclosure and a sentence above the block, ADR-042): nothing is downloaded, so the figures live in one `DEMO_*` module, the meter's fill is computed from the two figures it prints, and neither action claims a role. What is not *real* is recorded as such: no tile cache, no forecast download and no storage measurement exist (ADR-031, PROJECT.md known issue 30) | `5:23530` | `src/app/(app)/downloads.tsx` → `features/offline` |
| 14  | Account and offline · Privacy settings | **partial** — the header; the **account row** (the monogram, the name the sign-up collected and the identifier the code belongs to — ADR-029); the “Use Picky as” card with both chips as readings; the settings card holding the **“Saved spots” row** (the design's own subtitle counting the plan, and the row opens the list the design never drew — ADR-030); the “GPS trails are never public” status message; the frame's group of rows — **Visit tracking while the app is open** (the frame's “Background visit tracking”, renamed to what the app does — ADR-047), **Offline maps & sync** (which counts the queue and opens frame 13), **“Account & security”** (node `5:23677`), **Language** and **“Terms & privacy”** (node `5:23688`), the last two each opening the screen the design never drew, because the frame draws the way in and nothing draws the destination (ADR-039) — drawn where the frame draws them, outside a card at the content column's full width and 5 px apart (node `5:23663`); and **Sign out** (node `5:23691`), which deletes what this device holds of the picker's and drops the session (`src/services/sign-out.ts`). The account surface behind “Account & security” states the session's own facts **and its own hour**, including what happens when it runs out (ADR-041); the notice behind “Terms & privacy” names each record the phone holds and leads to the copy of them (ADR-040). Not drawn: the “Default spot visibility” block, whose Private/Shared/Public chips describe how *other people* see a spot (a sharing model the app does not have). What the account row's claim of verification still owes is PROJECT.md, known issue 27 | `5:23613` | `src/app/(app)/privacy-settings.tsx` → `features/privacy` |
| 15  | Planned marketplace · Browse | **partial** — the header (with the frame's own “Planned extra” disclosure and “Buyer mode · Preview”), the search field, which really narrows the app's two demo listings and says how many are left, the two listing cards (the first opens screen 16 and draws its chevron; the second is the frame's drawing of a marketplace with more in it than this app has), and the frame's own count line; its **three filter chips** are drawn in the frame's chosen and unchosen states and claim no role, and its sliders glyph is not built (no filter sheet): every one of the frame's three filters leaves both of the app's two listings, and two of them would have to claim metadata the app does not hold — a real filter needs a listings service ([ADR-044](adr/ADR-044-the-partial-frames-remaining-parts.md)). It is **outside the app shell**: the frame draws no core navigation (ADR-022) | `5:23780` | `src/app/marketplace.tsx` → `features/marketplace` |
| 16  | Planned marketplace · Listing detail | **partial** — the header, the listing's photograph, the headline against its price, the stock line, the description, the harvest/pickup/delivery card, the seller with the badge's claim and its figures, the frame's two actions (**both lead somewhere real**: the thread and the order) and its escrow note, which the app repeats as a plan rather than a fact. Its contact action keeps the design's own word and names the seller it reaches in the **accessible name**, because the frame's 104 px label holds “Contact Matti” and the app's name for the seller is longer (ADR-026) | `5:23832` | `src/app/marketplace-listing.tsx` → `features/marketplace` |
| 17  | Planned marketplace · Seller chat | **partial** — the header, the verified-seller badge, the listing the thread is about, the day stamped over it, the frame's four messages with their times and the receipt, and the action that opens the order. Its **composer is drawn and inert**: no transport exists, so it claims no input role and holds no value, which is the frame's own drawing with its own placeholder | `5:23883` | `src/app/marketplace-chat.tsx` → `features/marketplace` |
| 18  | Planned marketplace · Checkout and order status | **partial** — the header (with the frame's “Provider test mode” chip), the “Test order confirmed” status message, the order card with the frame's own lines and totals (arithmetic on whole cents, printed through one language-aware formatter), the pickup row, the two status lines and the frame's note about what a confirmation releases. Two of its three actions are **not drawn**: “Confirm berries received” releases a payment and “Open dispute” freezes one, no provider holds either, and their strings stay out of the catalogue ([ADR-044](adr/ADR-044-the-partial-frames-remaining-parts.md)); “Message Matti” opens screen 17, which exists. The frame's “Today” is not printed, because the demo's day is the design's 28 August 2026 and a screen may not claim a date is the day the picker is holding the phone | `5:23935` | `src/app/marketplace-order.tsx` → `features/marketplace` |

### Core navigation, as extracted

Frames 06–14 each draw the same bar at node `5:23012` (frame 06's id; each frame has its own
copy). Measured and now tokens in `src/constants/theme.ts`:

- the bar itself 390x78, padding 10 top / 8 bottom / 16 sides, a 1 px `#DDE5E5` hairline along
the top and the surface fill (`navHeight`, `colors.border`, `colors.surface`);
- four items of 89.5x51, 4 px apart inside each (`navItemHeight`);
- each item's leading pill 60x32 at the pill radius, filled `#EAECFA` when current and left
  unpainted otherwise (`navIndicatorWidth`, `navIndicatorHeight`, `colors.accentMuted`) — the frame
  fills the others white on a white bar, which the app draws as nothing;
- a 22 px glyph in the current item's accent and the others' `textMuted` (`navIcon`), and a 12/15
  label at weight 600 when current and 400 otherwise (`typography.navLabel`);
- below the bar, the frame's own “Home area” (node `5:23029`), which the app does not draw — the
device owns it, and the bar's bottom inset is what keeps the two from overlapping.

The destination each frame marks current: 06, 07 and 08 Discover; 09, 10 and 11 Visits; 12 Alerts;
13 and 14 Profile. The glyphs are Lucide's `map`, `bar-chart-3`, `bell` and `user-round`; the app
uses the nearest `@expo/vector-icons` glyph, which is its standing deviation, and `bar-chart-2`
stands in for the third bar chart Feather does not have.

Two departures from the frame, both measured in the built export rather than assumed (ADR-019,
ADR-022): the bar's height and each item's are floors, and an item keeps a quarter of the bar as
its **minimum** while taking its own label's width above that, so at 200 % the bar wraps to a second
row instead of cutting a destination's name off — at the design's text size the minimum decides and
the four items are 90x51 in one row, exactly as drawn.

### Screen 01, as extracted

Values measured on node `5:22710` that are now tokens in `src/constants/theme.ts`:
the eyebrow/chip at 10/14 semibold, supporting copy at 14/20, the promise at 30/42,
the wordmark at 42/51 bold, the content column's 18 px gap, the 64 px header row, the
action at 54 px tall with a 10 px radius, and the berry mark's deeper shade `#303A84`
(`berryDeep`). The hero photograph was exported from that frame (342×294, @2x) to
`assets/images/welcome-berries.png`.

Two deliberate deviations, both recorded in PROJECT.md: the design draws its icons as
vectors, so the header's leaf and the action's arrow use the nearest glyphs from
`@expo/vector-icons` until a vector renderer is added, and the frame's OS status bar
and home indicator are not drawn — the device owns those.

Wired: the primary action leads to screen 03 and the sign-in action leads to the sign-in
screen the design never drew (`/sign-in`, ADR-034 — see the app-drawn inventory below). The
screen only claims a button role when a handler is present, so it never announces an action
it cannot perform.

### Screen 03, as extracted

Values measured on node `5:22788` that are now tokens in `src/constants/theme.ts`:
the field/status inset at 14 px (`spacing.field`), the 7 px gap between a field's
label and its input (`spacing.label`), the 3 px gap inside a two-line text stack
(`spacing.tight`), the 36 px choice chip (`layout.chipHeight`) and the 44 px back
control that established `layout.minTouchTarget`. Its components became
`AppTextInput`, `AppCheckbox`, `FormField`, `ChoiceChips` and `Callout`, each
measured against the frame rather than approximated, and the screen's own values were
re-checked in a browser at the frame's 390 px width.

Four deliberate deviations, recorded in PROJECT.md: the consent control ships
**unchecked**, although the frame draws it ticked, because a pre-ticked box is not a
valid affirmative action; the frame's example values (`Aino Korhonen`,
`aino@example.fi`) are rendered as placeholders rather than as a pre-filled form; the
frame's icons (back arrow, mail, eye, lock, square-check) use the nearest glyphs from
`@expo/vector-icons`; and its OS status bar and home indicator are not drawn.

Wired: submitting the form leads to screen 04 with the address the code goes to, the
sign-in action leads to `/sign-in` (ADR-034), and **the terms link opens the device notice**
(`/terms-privacy`) since 2026-10-11 — the app has no terms document, and the notice is what it can
honestly put behind a consent line: what this phone is holding, record by record, and the rights
over each ([ADR-043](adr/ADR-043-three-waiting-frame-parts-get-their-answers.md)). While that link
had nowhere to go it was drawn as a label; a link that lands somewhere real is an action, so it now
carries the role every other action in the app carries. The phone state of the identifier field
shows the chip's own copy and no example, because the frame only draws the email state.

### Screen 04, as extracted

Values measured on node `5:22840` that are now tokens in `src/constants/theme.ts`: the
62 px code cell (`layout.codeCellHeight`), the 76 px symbol tile (`layout.symbolTile`)
and the 25/30 semibold digit inside a cell (`typography.digit`). Its components became
`CodeField` — six cells over the frame's 8 px gap at the control radius, each stroked in
the accent colour 2 px wide while the field has the focus, which is the state the frame
itself draws — and the shared `TextAction`, which screens 01 and 03 had each written for
themselves until this frame drew three of them.

Six deliberate deviations, recorded in PROJECT.md and
[ADR-048](adr/ADR-048-the-verification-copy-claims-no-delivery.md): the copy stops claiming a
delivery — nothing in the app sends a code, so the heading says what the step is for and the
supporting line names the destination the code belongs to, with the frame's own words recorded as
the branch that earns them — and the frame's **resend row is not drawn** for the same reason, since
asking for another code is the row's whole meaning and no caller can send one; the resend wait's
**length** is the app's choice, because the frame catches one in progress (`available in 00:28`) and
never says how long it runs; the frame's icons (`mail-check`, `smartphone`, back arrow) use the
nearest glyphs from `@expo/vector-icons`; and its OS status bar and home indicator are not
drawn, because the device owns those. The sixth (2026-10-13, built at the owner's
instruction — [ADR-049](adr/ADR-049-screen-04s-phone-states-and-the-words-that-follow-them.md))
is the **phone state the frame never draws**: the frame draws the email state only, so the
title and the change action follow the destination the code belongs to — “Verify your
number” and “Change phone number” when it is a number, the frame's own “Verify your email”
and “Change email address” when it is an address — and the frame's foot card, which asks
whether the reader signed up by phone *instead*, is drawn on the email journey only. The
answers are this repository's **assumed** ones, marked as assumptions in PROJECT.md (open
question 20) and owed by the design owner and the owner, who replace them slot by slot; the
screen's copy is quoted in full there rather than duplicated here.

Two things the screen has that the frame does not draw, both written app-side: a failure
line under the action when the app has to **refuse** the code (the design has no error
state — open question 11), and the rule behind the action, which accepts one stand-in code
outside production builds while the account service does not exist
([ADR-027](adr/ADR-027-a-stand-in-verification-code.md)). The failure line is measured with
the screen's other copy, in both languages at both text sizes.

### Screen 04, and copy that carries a value

Screen 04's supporting line names the destination the code belongs to, which is the first copy
in the app with a runtime value in it: the catalogue holds the sentence with a
`{destination}` placeholder and `interpolate` fills it. The harness measures the filled
sentence, not the placeholder — its manifest gives the rule the same value the route
falls back to — because a screen that names the destination it is asking about is not a
screen with a missing string in it.

### Screen 05, as extracted

The first read of this frame (above) recorded “Never / While using / Always”, which the
frame does **not** contain — it holds a zone-map preview, two benefit rows, one consent
row for background tracking, a reassurance line, an action reading “Continue to location
settings” and a way past the screen. The figures below come from the node itself and
supersede that reading, as they did for screens 13 and 17.

Values measured on node `5:22885` that are now tokens in `src/constants/theme.ts`: the
15/21 semibold title of a row inside a card (`typography.cardTitle`) and the 10 px gap
between a card's rows (`spacing.cardGap`). Its zone-map preview (342x192, 18 px radius)
was exported from that node as an asset (342x192 @2x → `assets/images/zone-map-preview.png`),
the same treatment screen 01's hero photograph gets, and it is presented as the design's
illustration rather than as a control: it holds the design's demo zones, not this user's,
and nothing on it is an affordance — the two benefit rows state the same thing in words,
which is also what a screen reader gets.

**The illustration's own labels are English and stay English.** “Laajavuori”, “Z09”,
“Z14”, “200 m · Season demo” are painted into the exported asset, so they are not in the
catalogue and the layout harness cannot measure them. That is acceptable only because the
map is a preview of the product and not the product: when screens 06–07 render real zones,
those labels become components with catalogue copy, and the asset goes away. Until then it
is a recorded gap, not a translation anyone forgot.

Four deliberate deviations, all recorded in PROJECT.md: the consent row ships
**unchecked** although the frame draws it ticked, because consent must be an affirmative
action; the action does not ask the operating system for location — it reports the
user's decision, because the permission is a decision the owner has not taken yet
(PROJECT.md, open questions 15 and 21); **the action's label names where the press leads**
(“Continue to the map” / “Jatka kartalle”) rather than the frame's settings step, because no
location-settings screen exists and nothing sends the reader to the platform's own settings —
the frame's “Continue to location settings” is kept as the label for the journey that really
does lead there ([ADR-050](adr/ADR-050-screen-05s-continue-action-says-what-the-press-does.md),
closing known issue 33); and the row and the benefit above it say visit
tracking runs **while the app is open**, where the frame's consent row and its second
benefit promise timing “even with the screen locked”. The app reads a position in the
foreground only ([ADR-045](docs/adr/ADR-045-a-position-behind-a-port-and-nothing-kept.md)),
so the heavier promise is withdrawn from the copy and put to the owner as a decision
([ADR-047](docs/adr/ADR-047-the-consent-says-what-the-app-does.md)). The frame's icons (`map-pin`, `timer-outline`,
back arrow) use the nearest glyphs from `@expo/vector-icons`, and its OS status bar and
home indicator are the device's.

Measuring this screen also found a defect in a shared component rather than in the screen:
at 200 % text the frame's own action label wrapped inside `AppButton`'s fixed 54 px box and
was cut off ([ADR-019](docs/adr/ADR-019-measure-at-the-largest-system-text-size.md)). The
action now carries the design's 54 px as a floor, which is what the theme's `minHeight`
scale was put there for.

### Screen 06, as extracted

Frame 06 (node `5:22942`) is where onboarding hands over, and its centre is a map. The app
draws that map itself, from this file's own geometry, with `react-native-svg` — the renderer
decision, its alternatives and its consequences are [ADR-021](docs/adr/ADR-021-draw-the-map-from-the-designs-geometry.md).
The shapes live in `src/features/discover/domain/zone-map-geometry.ts`, which is **generated**:
seven paths (woodlands, lake shore, the trail casing, the trail centrelines, and one polygon per
zone state) plus the anchors the frame places its labels at, all in the map frame's own 342×300
coordinates, rounded to a tenth of a pixel. It is regenerated, never edited — the geometry tests
fail on a shape that lands outside the frame, on a zone that does not contain the label the
frame draws inside it, or on a set of layers that no longer covers what the app paints.

Values measured on node `5:22966` that are now tokens in `src/constants/theme.ts`: the map's
342×300 box at the card radius, its own base fill (`mapBase` `#E6EEDD` — the ground the
woodland leaves uncovered, and over a third of the map's pixels), the woodland `#CCDDBE`, the
water `#BFDCE0`, the trail casing `#FAFCF5` at 6 px and its centreline `#A6B399` at 1 px, the
three zone fills, the legend's 8 px swatch at a 2 px corner, `layout.mapHeight` 300 and
`spacing.setting`'s 6 px inside the score badge. Type: the place name and the zone identifiers at
12/15 (`typography.mapLabel`, the name at 500 and an identifier at 600), the lake name, the
scale line and the legend's states at 10/12 (`mapAnnotation`), the card's heading at 19/27
(`cardHeading`) and its status line in the existing 12/17 metadata slot.

**The three zone fills are the frame's 50 % tints composited onto the woodland.** The frame
draws each polygon as a translucent tint (`#91BCAF`, `#AFB6CD`, `#EACD91` at 50 % opacity), and
the app paints the same result opaquely — `#AFCDB7`, `#BECAC6`, `#DBD5A8` — because nothing
translucent sits under them and a blend mode is one more thing that can differ per platform.
Sampled against the exported frame, the frame's own pixels are `#DBD5A8` inside its ripening
zone, which is the composite to the bit.

**Four of the frame's annotation colours are darkened, and every one of them is measured.**
The frame's own values do not clear WCAG AA on the fill they are painted over, so they could not
ship as drawn; the palette instead carries the nearest darker value and the contrast test asserts
each pair in both schemes:

| Where                       | The frame draws | Reaches | Ships as   | Reaches |
| --------------------------- | --------------- | ------- | ---------- | ------- |
| the lake's name on the water | `#456D78`      | 3.91:1  | `#35596A`  | 5.21:1  |
| `Z09` on its picked zone     | `#53627F`      | 3.64:1  | `#44506B`  | 4.78:1  |
| `Z21` on its ripening zone   | `#855C25`      | 3.97:1  | `#6B4A1E`  | 5.37:1  |
| the scale line on the map    | `#596C70`      | 3.85:1  | `#4A5B5E`  | 4.97:1  |
| the picked zone's 2 px outline | `#7683A6`    | 2.24:1 (non-text, needs 3:1) | `#55648F` | 3.45:1 |

The outline is the legend's own swatch colour — the mark that names the state — which is why a
2.24:1 boundary is a defect rather than a taste: the reader is told which colour means “picked
recently” and then cannot see it. The lake's name is also set one pixel larger than the frame
draws it (10 px against 9 px), because the app keeps one token for the map's three small sizes.

**The zone polygons were wrong first time, and the tests did not see it.** The first generator
subtracted each node's `relativeTransform` from its bounding-box offset instead of using the
transform as the placement, so every polygon landed at the map's top-left corner and the drawing
looked like three hexagons stacked. It was caught by rendering the screen in a browser, not by a
test; the fix came with the test that would have caught it — each zone's own label (and the
picker's marker) must lie *inside* that zone's polygon.

**The frame's two controls are built as filters, and they change what the map draws.** The search
field (node `5:22955`: 342x50, control radius, the surface behind the border, 14 px inset, the
15/21 promise) searches a **place or a zone** — the frame's own words — and the species chips
(node `5:22959`: the 36 px pill of every screen, the chosen one filled with the accent) keep the
zones reported for any of the species chosen. The frame draws three chips; the app renders the
pilot's fourth berry, crowberry, after them (2026-10-22), so the row is one chip wider than the
design. `domain/zone-filter.ts` answers both questions
as a pure function; the screen holds what was typed and which chips are on. What the result is
visible as: the map draws one polygon, one label and one badge **per zone still in play** (a
filtered-out zone leaves nothing behind, because a label left on the map is a zone the app claims
to have found), the list behind the toggle holds the same zones, and a line under the two controls
says how many are left — or that none is, which the frame does not draw and a filter still needs.

Three departures belong to this screen, all recorded in PROJECT.md. The frame paints its first
chip as chosen while drawing every zone on its map; the app opens with **no chip chosen**, because
a chip painted chosen while nothing has been filtered away would claim a filter that is not in
effect. The frame's **recentre control is not drawn** — the map does not pan or follow the device,
so there is nothing to recentre — and its **sliders glyph inside the field is not drawn**, because
the filter it would open is the chip row sitting directly beneath the field. The species the demo
composition assigns are the frame's for zone 14 alone (its card reads “Zone 14 · Lingonberry”);
zones 09 and 21 are given bilberry and cloudberry so that two of the frame's three chips are not
dead, which is demo data like the zones themselves. Its OS status bar and home indicator belong to
the device, and its **core navigation** is the app shell (ADR-022).

The frame's icons (`search`, `sliders-horizontal`, `map`, `bell`, `user-round`, `list`,
`download`, `locate-fixed`, `leaf`, `chevron-right`) use the nearest `@expo/vector-icons`
glyphs, as on every screen so far.

### Screen 07, as extracted

Frame 07 (node `5:23032`) is what the picker sees before walking out of the door: the same demo
zone frame 06's card is about — “Zone 14 · Laajavuori”, the unpicked one the map badges with
`78` — with the yield score behind that number, the confidence in it, the week's reports, today's
conditions and the freshest report from the field. It is reached from that card, which draws the
chevron the frame draws on it.

Values measured on node `5:23032` that are now tokens in `src/constants/theme.ts`: the season
photograph (342×154 at the card radius, exported to `assets/images/zone-season.png`), the yield
card's 18 px padding and 10 px row gap (the card metrics frame 06 established), and two type
slots — the score at 50/61 (`typography.metric`) and a section heading at 18/25
(`typography.sectionHeading`). The two chips are the same 36 px pill frame 06's card draws, and
both are the success tint: the frame paints “Unpicked” and “Ripe now” in one colour, so the state
chip reads in the map legend's own word and the ripeness chip says the other thing about the same
zone.

**The design's sample numbers are one story told twice, and the tests hold the two together.**
The score `78`, the state `unpicked` and the report's `38 min ago` are the same values frame 06's
map badge, legend and card carry, so `DEMO_ZONE_DETAILS` is tied to frame 06's zone by test
rather than by a copied literal: a drift would have the app tell the user two different numbers
about one zone. Nothing returns any of it — there is no zone service, no weather source and no
report stream — and the frame itself says so in the line that could otherwise be read as a
promise (“A forecast of conditions, not a guaranteed harvest.”), which the screen keeps.

**One type departure, recorded in PROJECT.md.** The frame sets “Fresh from pickers” at 17/23.8 and
“Today's outlook” at 18/25; the app keeps the one section-heading slot for both, which is the
smallest departure that leaves a section heading looking like one.

**The frame's species row is drawn as data, not as a filter** (node `5:23047`): the berries this
zone is reported for, the first in the accent fill the frame gives its first chip, and no role on
any of them — a single zone's screen has nothing for a species to filter, and the filter lives on
frame 06. The frame's third chip **“More”** opens a species index the app does not have, so it is
not drawn, and zone 14's own two species are the frame's two names (its card reads “Lingonberry”
because that is the first of them).

**What the frame draws and this screen does not.** **“Save zone”** would write a personal record
about the picker's own plans to this device, so it waits on the owner's lawful-basis and purpose
decision rather than being invented here (AGENTS.md §11, and the same gate the report queue went
through on 2026-10-09). **“Navigate · 1.4 km”** opens frame 08, which exists and is what the route
passes in. **“See all 11”** needs the report list it names — a stream of other pickers' reports
that nothing returns yet — so it is rendered as the design's own words rather than as a control,
which is how its copy is still measured in both languages without the screen announcing an action
it cannot perform (the treatment frame 13's two sample actions get). The **core navigation** is
present: it is the app shell (ADR-022).

The frame's own assets and sample values were read the same way frame 06's were: its texts,
boxes and fills from the node response, and its photograph exported at @2x.

Rendered in a browser at the frame's 390 px width, the screen's own numbers come out as the frame
draws them: the photograph measures 342×154, the content column's 24 px inset holds, the card's
rows stack 10 px apart inside its 18 px padding, the sections sit 18 px apart with the outlook's
rows 8 px and the report's four rows 6 px (nodes 5:23067 and 5:23073), and the score is 50/61 in
the accent colour with its value read from the same demo zone frame 06 draws.

### Screen 08, as extracted

Frame 08 (node `5:23106`) is the walk between the picker and the zone: the same map frame 06
draws — **stretched** to 342x322 — with the frame's own walking route drawn over it, the
offline note the design leads with, a card carrying the distance and the arrival, the next
turn on the trail, and the frame's way out (“Cancel route”). It is what screen 07's “Navigate”
action opens, and the distance on both is one value (`DEMO_ROUTE`), asserted rather than
assumed.

**The three frames draw one map at three heights.** Frames 06, 08 and 09 draw the same
woodlands, lake, trails, zone polygons, labels and marker at 300, 322 and 210 px high; their
node boxes say the drawing is stretched rather than redrawn — every shape and label inside it
moves by the same factor (322/300 = 1.0733 and 210/300 = 0.7, to the tenth of a pixel). The app
follows the frame: `ZoneMap` takes the height its screen gives it, scales the drawing's
vertical axis and the label anchors with it, and leaves the horizontal axis to the container's
width. That is why the design needs one drawing and the app one component, and the test asserts
it the way the design states it (frame 08's place name sits at y144.9, which is frame 06's
135 x 322/300).

**The walking route was traced, not fetched.** The file's vector geometry comes from the REST
API's `geometry=paths`, whose quota for this token was exhausted before frame 08 was read (the
response's own `Retry-After` was three days); the rendered-node endpoint was not, so the frame
was rendered at @2x and the 5 px accent stroke was read back into a polyline by
[`scripts/trace-figma-stroke.mjs`](../scripts/trace-figma-stroke.mjs) — located by colour,
walked along its centreline, simplified to the vertices that carry the shape, then divided by
the render's scale and by the frame's own 322/300 stretch so it lives in the same 342x300 space
as everything else.

The frame then measures the result a second way, and that is what the test asserts: its node
box is `x83 y115.9 112x144.9`, every edge of the traced centreline lands within one stroke of
it, the route starts inside the unpicked zone and ends at the picker's own marker. The tracer
is in the repository so the route can be read again if the frame changes; hand-editing it is
what the check would fail on.

Values measured on node `5:23106` that are now tokens in `src/constants/theme.ts`: the map's
342x322 (`layout.routeMapHeight`), the card's two values at the frame's 27/37.8
(`typography.stat`, rounded to whole pixels like every metric here) and its guidance title at
17/23.8 semibold (`typography.rowTitle` — a slot of its own, because the design's existing card
title slot is 15/21 and it is the *weight* that tells a reader this row is the instruction to
follow). The card's 18 px inset and 10 px row gap are frame 06's card
metrics; the status message is the existing `Callout` at the same 14 px inset and 12 px gap the
frame draws; and the “Cancel route” line is the existing `TextAction` at the design's 14 px.

Three deliberate departures, all recorded in PROJECT.md: the frame's **“Start walking”** action
is not drawn, because it opens the active-visit screen (frame 09) which does not exist yet — a
primary button that does nothing is the one thing this repository does not ship; its **core
navigation** is absent for the same reason it is absent on frames 06 and 07; and its **offline
note** is reworded. The frame promises a downloaded tile cache (“Laajavuori tiles and zone
boundaries are cached.”) and this app downloads nothing, so since 2026-10-10 the note says what
the app can be true about — the boundaries are drawn from data on the device — names the cache
as the thing still missing, and carries an informational glyph rather than a download. Its
header also carries the “SEASON DEMO” disclosure frame 06's map makes.

### Screen 09, as extracted

Frame 09 (node `5:23185`) is the visit itself: the arrival note the design leads with, the same
map as frames 06 and 08 at 210 px (the third height, 0.7 of the first), a card carrying the time
in the zone, the frame's own promise that the track stays private, and its two actions.

**The timer is the first thing in this app that is genuinely alive.** It starts at the frame's own
reading — 42 minutes 17 seconds, node `5:23226` — and counts up for real, and **“Pause visit”**
holds it: resuming restarts the clock from the reading it held, so a paused stretch is not counted
as time in the zone (the visit policy counts dwell, not wall clock). The clock is
`hooks/use-elapsed-ms.ts`, a hook rather than a screen's own interval because three things have to
be right at once — a reading at the first paint, a tick per second, and a reading that holds while
paused — and the screen passes it an *instant*, not a duration, so a resume is just a new instant.

Values measured on node `5:23185` that are now tokens: the map's 342x210
(`layout.visitMapHeight`), the card's 20 px inset (`spacing.cardInset`) with its three lines 6 px
apart (the design's 6 px step, `spacing.setting`), the status label at 12/16.8 semibold
(`typography.statusLabel`) and the reading at 52/62.9 semibold (`typography.timer`). The arrival
note is the existing `Callout`, and the frame's 14 px and 12 px figures had two panels 342 px
apart, with the departure 10:55 and the duration 52 min (frame 10's own summary of the same walk).

Two things the measurement changed, both recorded in PROJECT.md: the frame's **two action labels
are shortened in Finnish** (“Keskeytä käynti” and “Lopeta käynti” each wrapped to two lines in the
103 px label box the frame draws — now “Keskeytä” and “Lopeta”), and **the reading is painted in
parts** so that the largest system text size has something to reflow: the frame's 52 px numeral is
222 px wide, and 200 % of it is 440 px in a 302 px card, so the reading breaks into hours and two
colon-led pairs that wrap onto a second line rather than being clipped or capped. Assistive
technology still hears one reading (`accessibilityRole="text"` with the whole value as its name).

### Screen 10, as extracted

Frame 10 (node `5:23259`) is the design's “quick report”: what the visit was (“Exit detected ·
visit complete”, then the frame's own summary — Zone 14 · 28 Aug · 10:03–10:55 · 52 min), the
picker's answers, and the design's note that the report waits on the phone rather than on a
connection.

**The report is really saved.** “Save report offline” writes it to the device's queue
(`src/services/report-queue.ts`, versioned key, strict reads, a delete path), which is the first
half of the offline slice (ADR-005): the picker's own data stays on the phone until something can
carry it to the server. The owner chose that on 2026-10-09, with the lawful-basis decision
recorded as the question that has to be answered before any release (PROJECT.md).

**The rating is a real five-way choice**, at the frame's own metrics: five cells 72 px tall
(`layout.ratingCellHeight`) 7 px apart, each holding a 24/29 number (`typography.rating`) over an
11/13.3 word (`typography.ratingLabel`) — “None, Few, Fair, Good, Lots”, the design's five
answers, with “Good” the one the frame draws chosen. The cells **size themselves to their words
and the row wraps**: the frame draws five equal 63 px cells, and the Finnish for “Fair”
(“Kohtalaisesti”) is a single word wider than 63 px at the design's own 11 px, so an equal cell
clips it — at 100 % text, not only at 200 %. That was the harness's finding on this screen, and
the cells now take the width their own word needs.

On the rest of the frame: its **“Add a berry photo” row is not drawn** (evidence media needs an
image picker, camera and photo permissions and its own security rules — the owner deferred it on
2026-10-09) and neither is its third species chip **“More”** (which opens a species index the app
does not have; the report offers the two species the design names). The offline note is the
existing `Callout` in a third tone — the design's warning tint (`warningMuted`, #F5EBD8), whose
two text pairs are asserted in the contrast suite — and the amount field is the existing
`FormField`, with the frame's own example value as its placeholder.

### Screen 11, as extracted

Frame 11 (Core picker · Visits and analytics, node `5:23343`) is the picker's own season, and the
screen built from it separates two kinds of thing deliberately:

- its **summary and chart are the design's sample month** (`DEMO_SEASON_TOTALS`,
  `DEMO_HARVEST_BY_VISIT`): 4.5 kg harvested over three visits, 1.5 kg/hour, 3 zones, 3 h in the
  zone with a 60 min median, and bars of 62, 70 and 54 px for 1.5, 1.7 and 1.3 kg. There is no
  analytics service, so the eyebrow says so — the frame's own words plus “· SEASON DEMO”, the
  disclosure frame 06's eyebrow already makes about its map;
- its **history is the picker's own record**. The rows are the device's report queue
  (`src/services/report-queue.ts`) read back, newest first — which is what makes screen 10's save
  visible rather than a promise — followed by the design's three sample visits, whose own dates
  and weights the language formats (“28.8. · 52 min · 1,3 kg” in Finnish).

Values measured on the frame that are now tokens: its bars are 44 px wide and 28 px apart
(`layout.harvestBarWidth`, `spacing.chart`), each bar's three parts 5 px apart
(`spacing.chartStack`), the summary card's figures 27/37.8 over 12/16.8 labels (the existing
`stat` and `metadata` slots), its heading 18/25 (`sectionHeading`) and its rows' titles 15/21
(`cardTitle`).

Three deliberate deviations, all recorded in PROJECT.md: the frame's **period chips are a real
choice** and filter the history — “August 2026” is the month the design's own three sample visits
are in, “All visits” is everything the phone holds, and the screen opens on the second because that
is the period holding the report screen 10 has just saved
([ADR-043](adr/ADR-043-three-waiting-frame-parts-get-their-answers.md)); the **rows are the device's
own** rather than the design's three alone; and the frame's **core navigation** is absent, as on every
other core picker screen. The chips draw through `ChoiceChips` — the radio group screen 03's
identifier chips already use — and the two lines under “Visit history” state what the choice is
showing, including how many visits the month chip leaves out. A visit's month is read in **UTC**, the
same reading every date this screen prints uses. The preface lines under the heading are the app's
own — the frame draws none — which is why they are held to one line each in both languages. The
layout harness found one defect on this screen — the Finnish chip row was cut off at 200 % and now
wraps.

### Screen 12, as extracted

The alert on frame 12 (Core picker · Alerts and forecast, node `5:23439`) is the design's own
sample, like frame 07's forecast and frame 08's offline note: no weather source, season model or
report stream exists behind it. The frame's closing sentence (“Forecasts combine weather, season
and trust-weighted reports. Harvests aren't guaranteed.”) names a forecast assembled from three
sources the app does not have, so since 2026-10-10 the screen says the alert is a sample instead
(“A sample alert. No weather, season or report source is connected yet, and a harvest is never
guaranteed.”) — the design's own promise kept, its claim about the sources dropped. Its header
carries the same “SEASON DEMO” disclosure frame 06's map makes. The screen keeps the frame's headline type at
24/33.6 (the new `heroTitle` slot) and reuses the vocabulary other screens already own: the
score is out of `SCORE_MAX` (`82 / 100 yield`), the confidence chip's word is
`confidenceLabelKey()` — the same “High confidence” frame 07's zone card prints — and the
distance is `formatDistance()` (“1.8 km” in English, “1,8 km” in Finnish).

Its **alert-preferences card** (nodes `5:23480`–`5:23504`) is drawn as the design's own sample since
2026-10-11 ([ADR-043](adr/ADR-043-three-waiting-frame-parts-get-their-answers.md)): the frame's four
settings — “Ripe-berry push alerts” with its switch, a 3 km search radius, quiet hours 21:00–07:00,
and “Bilberry + 1” — live in one `DEMO_*` module, the radius is printed by `formatRadius()` (whole
kilometres, the way the frame sets it, where the alert's own headline prints a measured distance with
a decimal), and one line on the card says the settings are the design's and that nothing reads them.
Nothing on it can act: the switch is a **figure** with no role, and the three rows below it are
readings that drop the chevron the frame draws, which is the treatment frame 13's sample rows get. Its
**“View Zone 18” action is not built**, and it is the last part of this frame that is not: the app's
demo map has no Zone 18, so an action claiming to open it would claim a role it cannot honour
(PROJECT.md records it). Its core navigation is absent, like every other core picker screen's.

On the harness's findings: the Finnish alert's context line (“Alue 18 · Laajavuori · Tuorein
havainto 60 min sitten”) wrapped to two lines where the frame draws one 306 px line, so the
Finnish states the reading alone (“… · 60 min sitten”). The preferences card holds the frame's own
line counts, except in two places where the wording is wider than the frame's: its push row's
Finnish label (“Push-hälytykset kypsistä marjoista”) takes two lines where the frame draws one, and
the app's own closing line takes three in **both** languages — the design draws no such line, so
that count is the wording's rather than the frame's.

### Screen 13, as extracted

Frame 13 (Account and offline · Downloads, node `5:23530`) is the design's sync centre, and the
part of it the app can be true about is the report queue: the screen lists what is still waiting
on this phone, with the frame's own heading (“Waiting to sync · 1 report”, the count as a value
and the singular and plural as the language's own two keys), each report as the frame's card
prints it (“Zone 14 · Lingonberry”, “28 Aug · 52 min · Yield 4 / 5 · 1.3 kg”, the design's chip
“Queued · visit + report”) and — where the frame promises a retry — the honest sentence: what is
saved is on this phone and nothing has been sent yet, because there is no transport (ADR-005).

This is the answer AGENTS.md §11 asks of a stored field: **how the user gets a copy**. Frames 11
and 13 both list it, from the device that holds it.

The frame also opens with a **status message** — “You're offline · Keep picking. Visits and
reports are saved on your phone.” — and it is now drawn, because the device's own report makes
the claim observable: `expo-network` (through `useNetworkState()`) is folded into three answers
by `connectionState()` (`src/features/offline/domain/connection.ts`), and the message is drawn
on `offline` alone. A platform that has not answered draws nothing, because an unanswered
question is not a “yes” and not a “no” (ADR-025). Nothing about the connection is stored or sent:
it is read to draw one sentence and forgotten. The sentence is the frame's own copy, in the
language's own keys.

The rest of the frame is not drawn, and PROJECT.md records each part: its **downloaded region,
cached map tiles and forecast, storage meter and “Last successful sync” line** (there is no tile
cache, no forecast download and no storage measurement), and its two actions — **“Retry sync”**
and **“Manage downloaded regions”** (nothing to retry over, nothing to manage). Its core
navigation is absent, as everywhere else.

### Screen 14, as extracted

This screen is where screen 05's consent sentence is kept (“I can turn it off in Privacy
settings”), and since 2026-10-10 it is built to the end of what the app can be true about:

- the **account row** (nodes `5:23626`–`5:23631`): a 62 px monogram circle (`layout.avatarSize`)
  with the profile's initials (23/28, `typography.profileInitials`), the name at 21/29
  (`typography.profileName`) over the identifier line at 13/18.2 (`caption`). It is filled from
  the session the sign-up produced rather than from the frame's example, and the frame's own
  claim about the identifier (“Email verified”) is drawn for what the identifier *is* — see
  PROJECT.md, known issue 27 ([ADR-029](adr/ADR-029-the-session-carries-the-accounts-name.md));
- the **“Use Picky as” card** (node `5:23632`, 342x147, 18 px inset, 10 px gaps) with both chips
  drawn as readings — neither sets anything, so neither claims a role — and the frame's own note;
- the **settings card** (node `5:23640`, 342x222) holding the frame's **“Saved spots” row**: its
  label at 15/21 semibold over the frame's own subtitle at 13/18.2 (“4 spots · private by
  default”, node `5:23644`), the plan's count at the end in `typography.rowValue` and the frame's
  chevron. The card's other row (“Default spot visibility”) is not drawn; neither is the divider
  below its chips;
- the **status message** — the existing `Callout` molecule with its 14 px inset, 18 px card
  radius, 12 px gap and a 14/600 title over a 13/400 body (node `5:23658`);
- the frame's own group of rows (node `5:23663`, 342x192, **gap 5** — `spacing.chartStack`, its
  third measured use): **Visit tracking while the app is open** — the frame's “Background visit
  tracking”, renamed to what the app does ([ADR-047](docs/adr/ADR-047-the-consent-says-what-the-app-does.md)) —
  with the platform's switch, the **“Offline
  maps & sync” row** (which prints the queue's own count where the frame prints “1 queued” and
  opens frame 13's sync centre) and the **“Language” row** kept as a reading. The group is drawn
  where the frame draws it — outside any card, at the content column's full width, which is what
  gives the sync row's label the frame's own 244 px (node `5:23671`) and what the Finnish wording
  needs: wrapped in a card's 18 px inset the label wrapped where the design draws one line, and
  the layout harness failed the screen in Finnish until it was drawn the frame's way;
- **“Sign out”** (node `5:23691`, 342x20, accent, centred over the column): the frame's last
  control, and real — it deletes what this device holds of the picker's and drops the session
  (`src/services/sign-out.ts`).

Not drawn, because each would promise something the app does not have: the frame's **“Default
spot visibility”** block (Private/Shared/Public describe how *other people* see a spot — invites,
a community map), and the **“Account & security”** and **“Terms & privacy”** rows, whose screens do
not exist. An affordance that cannot act must not claim a role (AGENTS.md §11.2). The frame's
bottom navigation is the app shell (ADR-022), and the Picker/Buyer chips are readings of the
app's one real role (CONTEXT.md, **Buyer**).

Values measured on node `5:23613` that are now tokens in `src/constants/theme.ts`: the 6 px
vertical padding of a settings row (`spacing.setting`, the same value on all six `Setting`
rows of the frame), the 62 px avatar (`layout.avatarSize`), the name and initials slots
(`typography.profileName`, `profileInitials`) and the 5 px gap between the rows of its own group
(`spacing.chartStack`). The header reuses the existing eyebrow/chip and 20/28 title slots.

Four deliberate deviations, all recorded in PROJECT.md: the screen's heading reads **Profile**
(and “Profiili”) rather than the frame's “Private by nature”, because this is the destination the
bar calls Profile, whose settings the page holds (owner's call, 2026-10-22); the frame's `Switch`
is drawn at
46x28 and the app uses the platform's own switch, a few pixels larger on iOS, because
scaling a native control distorts its feel and its accessibility behaviour (its colours do
come from the tokens); the frame's `lock-keyhole` icon is drawn as the nearest
`@expo/vector-icons` glyph; and the frame draws no back control (in the design this screen
is a tab) — nor does the route, because a tab's navigation is the bar and not the history
underneath it; a control that cannot act must not claim a role
(`src/config/__tests__/shell-tab-roots.test.ts` holds the same rule on all four destinations). Screen 05's action still asks
the operating system for nothing (its label now says where it leads rather than naming a
settings step, [ADR-050](adr/ADR-050-screen-05s-continue-action-says-what-the-press-does.md)), so
this screen is the only way the consent can be
withdrawn, and the write that withdraws it is the same stored record
([ADR-020](docs/adr/ADR-020-record-consent-on-device.md)); its own action now leads into the
app, which is how the settings screen is reached at all.

### The three screens behind frame 14's other rows — app-drawn, no node

Frame 14 draws five rows with a chevron (node `5:23663`), and the design stops at the rows: three of
the destinations were never drawn. All three exist, built from the app's own vocabulary, and the
two that state the app's obligations are written to be reviewable rather than to look designed.

- **“Account & security”** (`/account-security`, node `5:23677`; [ADR-039](adr/ADR-039-frame-14s-two-remaining-rows-get-their-screens.md)) — frame 14's own account row drawn from the same
  session (the name when a sign-up collected one, otherwise the identifier — ADR-038), then the
  session's facts: where it is kept, the hour it lasts, what ends it, and what is deliberately
  absent because no account service exists (no password to change or recover, no device list, no
  account deletion). The hour is observed and stated rather than assumed
  ([ADR-041](adr/ADR-041-a-session-that-can-run-out-says-so.md)): the screen reads the clock, shows
  the time left through the session's own pure rules, and when it runs out replaces the account row
  with a notice and the way back in.
- **“Terms & privacy”** (`/terms-privacy`, node `5:23688`; ADR-039) — a **notice about the device**:
  each record the phone holds, and for each one the four answers AGENTS.md §11 asks of a stored
  field (who may read it, how it is corrected, how a copy is had, how it is deleted). Which records
  exist is a rule (`features/privacy/domain/held-records.ts`), and a read that failed says the list
  is incomplete rather than presenting a subset as the whole. The written terms and the privacy
  notice are named as still owed and their place is named, because composing them is the owner's
  ([ADR-039](adr/ADR-039-frame-14s-two-remaining-rows-get-their-screens.md)).
- **“Your data”** (`/your-data`; [ADR-040](adr/ADR-040-the-copy-the-app-owes-is-a-document.md)) —
  the destination of the notice's “Take a copy” row and the export path open question 23 names as
  owed: it states what the copy contains record by record, what the file is
  (`picky.personal-data.v1`, the app's own field names, `incomplete` when a read failed), and where
  it goes — the **platform's own share sheet**, reached from a control the screen draws only when
  the route hands it one. The app picks no destination, uploads nothing and stores nothing new.

Being frame-less, none of the three has a line count to be held to; the harness measures them for
“nothing is lost at 200 %” only (entries `14c`, `14d`, `14e` in `e2e/layout.spec.ts`), and their
copy's own expectations live in their unit tests. Their Finnish is app-written, like the app-drawn
list's below, and joins the rest of the catalogue in open question 13's review.

### The sign-in screen — app-drawn, no node

Frames 01 and 03 both draw “Already have an account? Sign in”, and the design file stops there:
there is no frame for what the link opens. The screen exists (`/sign-in`) and the design owner's
answers are what it is built from ([ADR-034](adr/ADR-034-signing-in-the-frame-the-journey-and-the-session.md)):
**one identifier field**, then screen 04's own code step, which is reached with a pending request
that carries the address and no name — a returning account's name is the account service's answer,
and there is no profile to read ([ADR-038](adr/ADR-038-a-session-may-carry-no-name.md)). Once the
code is accepted a **returning user lands inside the app** rather than on screen 05, which is where
a sign-up continues, and the screen lives **outside the app shell** like the rest of onboarding
(ADR-022 draws no bar there). Being frame-less it has no frame line counts to be held to, so the
harness holds the app's own wording to the lines it needs in the wider language (the supporting
sentence takes three in Finnish) and measures it in both languages at the largest text size
(entry `01b` in `e2e/layout.spec.ts`), and what it states — a code, never a password — is the
reading ADR-034 records.

### The screen behind frame 14's “Saved spots” row — app-drawn, no node

There is no frame for it: the design's only collection point for the plan is frame 14's row, and
it was never drawn past that row ([ADR-024](adr/ADR-024-saved-zones-on-the-device.md) recorded the
gap, [ADR-030](adr/ADR-030-the-saved-plan-gets-a-screen.md) answers it). The screen
(`/saved-spots`) is therefore built **entirely from the app's own vocabulary** — the shell, the
screen template's header, frame 06's own `ZoneRow` for each saved zone and its empty state's
action — with copy that belongs to the app rather than to the design, and it says so: its eyebrow
carries the “· SEASON DEMO” disclosure frame 06's map and frame 11's season screen carry, because
the zones it lists are the design's demo composition until a zone source exists. What it does not
take from the design it takes from the record: the plan in the order it was made, a saved
identifier the zone source cannot describe named rather than dropped, and an empty plan that says
it is empty and offers frame 06's map. Being frame-less, it has no line counts to be held to; the
harness measures it for “nothing is lost at 200 %” only, and its copy's own expectations live in
the screen's unit test.

### The list behind frame 07's “See all 11” — app-drawn, no node

There is no frame for it either: the design's only sign of a zone-report list is frame 07's own
link (`5:23076`), and it was never drawn past that link
([ADR-044](adr/ADR-044-the-partial-frames-remaining-parts.md) answers it). The screen
(`/zone-reports`) is built from the app's own vocabulary, with the shell and the screen template's
header, and it does what the design's own eleven cannot be made to: it states the frame's week as
**the design's sample** — the count is read from the zone's own figures, so the card above and this
line cannot disagree — and lists what **this phone** holds for the same zone, newest first: the
reports the picker saved themselves (`features/discover/domain/zone-reports.ts` reads the queue's
own zone identity, so a report lands on the zone the frame prints, and another zone's report is
never printed under this zone's name). A report's line is the frame's own order of facts (its day,
its length, the rating the picker gave on the design's 1–5 scale, the harvest they typed), its
state is the queue's own word (“Queued”), a store that could not be read is a line saying so rather
than an empty list, and the line under the list names what is missing: the zone's reports from
other pickers need the report service, which does not exist.

Like the plan's list, it carries the **season-demo disclosure its zone needs** (the eyebrow's
`· SEASON DEMO`, because the zone and the week are the design's own composition), so the
demo-disclosure guard classifies it with the screens that draw the sample. The link that opens it
keeps the frame's own words (“See all 11”) and takes the role an action carries only where the
route supplies the list; its **accessible name** says where the press leads, because the frame's
eleven and the phone's own list are not the same thing. Being frame-less, it has no line counts to
be held to; the harness measures it for “nothing is lost at 200 %” only, its copy's own
expectations live in the screen's unit test, and the browser suite presses the link on the built
page and reads the list it lands on.

## Language lengths, measured

The design is authored in English, and English is the shorter language of the two the
app ships. Every built screen was therefore measured in a browser at the frame's 390 px
width in **both** languages (2026-10-08), checking three things: horizontal overflow,
clipping (`scrollWidth`/`scrollHeight` beyond `clientWidth`/`clientHeight`) and text that
wraps where the design shows a single line.

| Screen | English | Finnish |
| ------ | ------- | ------- |
| 01 · Welcome | clean | one defect found and fixed: the third promise tag wrapped to two lines (17 px → 34 px), because “Yksityinen luonnostaan” is 22 characters in a third of the content column |
| 03 · Create account | clean | clean — every field stays 54 px, the chips grow in width as designed, and the 87 px privacy note keeps two lines, so it stays 87 px |
| 04 · Verification | clean | clean — the sentence naming the destination and the expiry note both keep the frame's two lines, and the six code cells stay on one row; the frame's resend row (and with it the countdown) is not drawn, because no caller can send a code (ADR-048) |
| 04b · Verification, the phone state (design-drawn, frame undrawn) | clean | clean — the frame draws no phone state, so there is no line count to wrap against: the titles, the change actions and the foot card's own sentences that name the destination render in both languages at both text sizes |
| 05 · Location consent | clean | clean — the supporting line, the second benefit and the consent row all keep the frame's two lines; “Löydä suuntasi” and “Ei nyt · selaa ilman seurantaa” fit theirs |
| 06 · Discover map | clean | one defect found and fixed: at 200 % the three legend states no longer fitted the 342 px column in Finnish (“Poimimaton”, “Äskettäin poimittu”, “Kypsymässä”) and the row was cut off horizontally — it wraps now, as screen 03's chip row does |
| 07 · Zone details | clean | one defect found and fixed: the scoring note (“Pisteisiin vaikuttavat tuoreus, luotettavuus ja lähihavaintojen yhtäpitävyys.”) ran to two lines where the frame draws one (342×17) — shortened to “…ja lähihavainnot.” |
| 08 · Route to zone | clean | one defect found and fixed: the turn guidance (“Käänny oikealle 180 m kuluttua · määränpää Laajavuori”) ran to two lines where the frame draws one (264×18) — the word “määränpää” went, and the place name now closes the line |
| 09 · Active visit | one defect found and fixed | the two action labels (“Keskeytä käynti”, “Lopeta käynti”) each wrapped to two lines in the frame's 103 px label box — shortened to “Keskeytä” and “Lopeta”; and at 200 % the reading needed 440 px in a 302 px card, so it is painted in parts and reflows |
| 10 · Post-visit feedback | one defect found and fixed | the Finnish rating word “Kohtalaisesti” was clipped by the frame's own 63 px cell at the design's 11 px — the cells now size to their words and the row wraps |
| 11 · Visits and analytics | clean | one defect found and fixed: at 200 % the two period chips (“Elokuu 2026”, “Kaikki käynnit”) were cut off horizontally in their row — the row wraps now, as screen 03's chip row does |
| 12 · Alerts and forecast | clean | one defect found and fixed: the alert's context line (“Alue 18 · Laajavuori · Tuorein havainto 60 min sitten”) ran to two lines where the frame draws one (306×18) — the Finnish now states the reading alone (“… · 60 min sitten”) |
| 13 · Downloads | clean | two findings: at 200 % the “Jonossa · käynti ja raportti” chip was cut off vertically by the frame's 36 px chip height — the chip's height is a floor now (`min-h-chip`) — and the queue row's own line keeps the frame's single 306 px line in both languages. The sample block ADR-042 added was measured with it (2026-10-11): every one of the frame's lines — the region's name and its “12 km² · 86 MB · ladattu”, both card rows and their “Välimuistissa”, the forecast's own line, the refresh note, both storage figures, both action labels and the last-sync line — renders in the frame's own single line in Finnish as well as in English, and the app's own disclosure sentence above the block needs three of the column's lines |
| 14 · Privacy settings | clean | one defect found and fixed, and it was this harness that found it: the frame's group of rows was first drawn inside a card, whose 18 px inset took the sync row's label from the frame's own 244 px (node `5:23671`) down to 200 px, so “Offline-kartat ja synkronointi” wrapped where the design draws one line and the row clipped at 200 %; the group is drawn where the frame draws it now — outside any card — and the rest is clean: the status message's body keeps the frame's two lines (282x36), the title, both row labels and the new subtitle (“3 spots · private by default” / “3 paikkaa · oletuksena yksityisiä”) fit theirs, and the sync row's own value (“1 queued” / “1 jonossa”) fits its 62 px slot |
| 14b · Saved spots (app-drawn) | clean | clean — the design drew no frame for this list, so there is no line count to wrap against: every string of it renders in both languages at both text sizes, and its rows are frame 06's own `ZoneRow`s, which frame 06's entry above already holds to their lines |
| 14c · Account & security (app-drawn) | clean | clean — frame-less, so the run holds it to “nothing is lost” at 200 %: every string of the screen's own copy renders in both languages at both text sizes. The one reading that changes on its own (the time left in the session's hour, ADR-041) cannot be seeded into a browser run, because the session lives in the process (ADR-028); it is asserted in the screen's unit test, and the harness measures the lines that are there — including the lifetime reading the countdown sits beside |
| 14d · Terms & privacy (app-drawn) | clean | clean — frame-less, held to “nothing is lost” at 200 %: the Finnish is markedly longer than the English and every sentence still renders, the record rows' hints included (the runs carry the wider language's line counts, 2–5 lines per sentence) |
| 14e · Your data (app-drawn) | clean | clean — frame-less, held to “nothing is lost” at 200 %: the contents card's rows, the file card, the sentence naming where the copy goes and the control that opens the sheet all render in both languages at both text sizes |
| Not found | clean | clean |

The tag row is the exact case the design's thirds cannot absorb: a third of 342 px is
~111 px, which fits 17–18 characters at 12 px semibold. The Finnish tag is now
“Yksityinen oletus”, which also matches what the app claims on screen 03 (“Tallennetut
paikat ovat oletuksena yksityisiä”), and a test holds the three tags to that budget so
the regression cannot return silently.

The table above is no longer produced by hand. **Every built screen is measured in both
languages by `npm run test:layout`** (ADR-018, TESTING.md §12): the harness reads each
string's line count from the frame it belongs to — the counts in this section are the
frames' own, taken from the text nodes of `5:22710`, `5:22788`, `5:22840`, `5:22885` and
`5:23613` — and fails CI when a translation exceeds it or clips. A new screen is measured by adding its frame's copy and
line counts to the manifest in `e2e/layout.spec.ts`; a screen that is not in the manifest
is a screen nobody measures. A screen the design never drew — like the list behind frame 14's
“Saved spots” row — has no line counts to take, so the manifest holds it to what a frame-less
screen can be held to (every string still renders at the largest text size), and its copy's own
expectations live in that screen's unit test.

### At a large system text size, where the frames stop being the target

The frames are a fixed-height composition, and a device can ask for text twice as large
(ADR-019). At 200 % the frame's line counts are not asserted — reflow is what the user asked
for — and what is measured instead is that nothing is lost: no clipped copy, no box whose
content spills out of it, no sideways scroll. Three frames' numbers did not survive that, and
all three were fixed as floors rather than redrawn: the 64 px header row became a minimum;
screen 03's chip row wraps now, because “Sähköposti” and “Puhelinnumero” together are wider
than the 342 px content column at that size; and a field's value box lets the field keep its
width instead of stretching past the screen. What the *design* should look like at 200 % is
not in the file — it is an owner question, not something this document can extract.

## Design system, as extracted

The foundations frame names the palette, and the file confirms the values in use.
Everything is **literal**: the file has 0 bound variables, 0 named styles and 0
components, so no Enterprise-only variables endpoint is needed (that caveat applies
only if the design later adopts variables).

| Token        | Value     | Design name  | Notes                                    |
| ------------ | --------- | ------------ | ---------------------------------------- |
| background   | `#F5F7F8` | Mist         |                                          |
| surface      | `#FFFFFF` | —            | cards sit on Mist                        |
| border       | `#DDE5E5` | —            | 1 px strokes; the design uses no shadows |
| text         | `#182B30` | Ink          | most-used colour in the file             |
| textMuted    | `#596C70` | —            | secondary text                           |
| accent       | `#414BA0` | Blueberry    | primary actions, selected states         |
| accentMuted  | `#EAECFA` | —            | selected chip / tinted row               |
| success      | `#28654E` | Forest       |                                          |
| successMuted | `#E4F0E7` | —            |                                          |
| warning      | `#855C25` | —            | amber, with `#F5EBD8` tint               |

Type is **Inter** throughout, measured: screen titles 20/28, onboarding headlines
28/39, section headings 18/25, body 16/22, labels 13/16 semibold, metadata 12/17,
chips 10/14 semibold, metrics 27/38, hero numbers 50–52. Radii from the foundations:
“54 px actions · 18 px cards · 24 px insets”; measured radii are 100 px (pills),
18 px (cards), 10 px and 8 px (controls). Gaps cluster at 12 px, paddings at 14, 18
and 24 px.

## Aligned so far, and what is still open

Aligned in `src/constants/theme.ts` on 2026-10-08, with tests written first:

- the light palette above, plus the three tints (`accentMuted`, `successMuted`,
  `warningMuted`);
- `spacing.gap` (12 px) and `radii.lg` (18 px cards);
- type metrics: `title` 28/39, `subtitle` 20/28, `body` 16/22, new `label` 13/16
  semibold and `metadata` 12/17.

**Closed since, and not through the type scale**: the design's **action metrics**. The actions were
“54 px tall pills” against a compact 8 px-radius control; they arrived as layout tokens instead —
`min-h-action` (54 px), `rounded-control` (10 px) and `min-h-chip` (the chip's 36 px as a floor) —
which is what let an action grow around a label that wraps at the largest text size (ADR-019). Every
screen is measured at those metrics by the harness, so the change is held to them rather than to this
note.

Still open, in order of impact:

1. **Inter is not loaded.** The app still renders the platform font; the design is set
   in Inter. Needs a font dependency and font loading in the root layout.
2. **No dark design exists.** Dark mode in `theme.ts` is an app-side derivation from
   the same hues and is marked as such in the file.
3. **`danger` and `surfaceMuted`** have no design counterpart yet; both are marked
   app-side in `theme.ts`.

## Extracting again

**The map is geometry, and it arrives through `geometry=paths`.** Frame 06's shapes are only in
the response when the request asks for them; without it the file carries each node's box and
nothing to draw:

```bash
curl -s -H "X-Figma-Token: $(cat .secrets/figma.token)" \
  "https://api.figma.com/v1/files/SFDhkQO0SDmWshHxpF6O7o/nodes?ids=5:22942&geometry=paths" \
  -o /tmp/figma-06.json
```

A vector node's path is written in the node's own coordinate system and its `relativeTransform`
places that system inside its parent, so the two are applied together — a path plus the
transform's translation. The zones' own labels are the check that the placement is right: the
frame draws each identifier inside its polygon.

**When the geometry quota is spent, render the node and trace the stroke.** The two endpoints
have separate budgets, so this is the fallback (
[`scripts/trace-figma-stroke.mjs`](../scripts/trace-figma-stroke.mjs)):

```bash
curl -s -H "X-Figma-Token: $(cat .secrets/figma.token)" \
  "https://api.figma.com/v1/images/SFDhkQO0SDmWshHxpF6O7o?ids=5:23125&format=png&scale=2" \
  -o /tmp/images.json   # the URL it returns is only valid for minutes: download it at once
node scripts/trace-figma-stroke.mjs /tmp/map08.png '#414BA0' 60 2 '150,516,32,32'
```

The arguments are the render, the stroke's colour, a per-channel tolerance, the render's scale
and any regions to exclude (a mark of the same colour, here the picker's own dot). The output is
in the render's coordinates; divide the vertical axis by the frame's own stretch when the map
is a scaled instance (frame 08's 322/300). The frame's node box is then the check: within one
stroke of the traced centreline, or the trace is wrong.

**1. Figma MCP server — for interactive agent sessions.** Installed at project scope
(ADR-016, CONTRIBUTING.md) and still needs its one-time OAuth authorization; it reports
`Needs authentication`.

Driving it from a script is **verified broken in this environment**: Claude Code is
pinned to a custom model (`oc/muse-spark-1.2-contributor-free`) and its API call is
refused (`Connection refused — a firewall or proxy may be blocking it`). Use an
interactive session where that works, or route 2.

**2. Figma REST API with a read-only token — the route used above.**

```bash
curl -s -H "X-Figma-Token: $(cat .secrets/figma.token)" \
  "https://api.figma.com/v1/files/SFDhkQO0SDmWshHxpF6O7o" -o /tmp/picky-figma.json
```

The token is a personal access token with read-only file access; it is **not** a
project secret and must stay out of `.env` (public config only), out of commits and out
of logs. Revoke it in Figma when it is no longer needed.
