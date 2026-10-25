# Demo values and stand-ins

An inventory of everything the app shows or keeps that is **not** its own observation,
with each entry classified and its build gate stated. Audited 2026-10-10 against the working
tree as it stood that day; every row was read in the file it names. **F2 was fixed later the
same day**, so the affected rows and that finding carry the date they changed; everything else
below is the audit's own reading.

This file records **classification and gating only**. What each frame contains is
[design-source.md](design-source.md)'s, what is built of each frame is PROJECT.md's
“Implementation status”, and why the marketplace and the account stand-in are built the
way they are is [ADR-026](adr/ADR-026-marketplace-screens-as-a-disclosed-demo.md) and
[ADR-059](adr/ADR-059-email-password-replaces-the-code-screen.md). None of the three is repeated here.

## How to read it

**The classes.** Three as asked for, plus two the three do not fit — named rather than
forced, because calling the 60-second resend wait “the design's sample” would be false.

| Class | Meaning |
| ----- | ------- |
| **A · Design's sample** | The frame's own composition, repeated because there is no service behind it. Not invented by us; not observed by anyone. |
| **B · Stand-in for a missing service** | A value or implementation answering a question the server, the OS or the provider will answer. Built to be swapped, not extended. |
| **C · Real data** | Produced at runtime by the device or the user. |
| **D · The app's own choice** | Neither the design's nor a stand-in for a service: a number this repository picked to make a drawn state reachable. Each row says whether the owner has decided it or it still awaits them. |
| **E · Throwaway prototype** | Not product data at all. Deleted with the question it was built to ask. |

**The gates.** Only **three** things are production-gated, below. Everything else in
this file ships in a production build.

---

## 1. Production-gated (nothing here reaches a shipped build)

| # | Value | What it would be | The gate | Evidence |
| - | ----- | ---------------- | -------- | -------- |
| G1 | The stand-in session port's acceptance (`createStandInSessionPort`, `src/services/session/stand-in-port.ts`) | A credential accepted, and a reset link requested, without asking the account service | In a production build the port answers `unavailable` for **every** credential and for a reset request **when no provider is configured**; screens 03 and `/sign-in` draw their action disabled, and `/forgot-password` draws it disabled without `EXPO_PUBLIC_FIREBASE_API_KEY`. A configured Firebase key is not a stand-in: it sends the real reset email in every environment | `e2e/production-export.spec.ts` (a real production export with no key fills the forms and every account action stays disabled, the reset request included); `src/services/session/__tests__/stand-in-port.test.ts`; `src/services/session/__tests__/firebase-password-reset.test.ts` |
| G2 | Two prototype sets behind one shared switcher: the three sign-in readings (`src/features/onboarding/components/prototype/`) and the community map's three readings, each on the screen it would live on (`src/features/discover/components/prototype/`); `PrototypeSwitcher` (`src/components/prototype/`) | Throwaway readings of a screen the design has no frame for, and of a feature (shared spots) whose frame does not exist either | Every host route reads `appEnvironment() === 'production' ? undefined : …` and then ignores `?variant=` entirely | `e2e/production-export.spec.ts` (`/create-account?variant=B` shows screen 03; `/discover?variant=A`, `/zone-details?variant=B` and `/saved-spots?variant=C` each show the app's own screen — and no `PROTOTYPE` text is mounted on any of them) |
| G3 | A one-time demo seed of two saved spots and two queued reports (`src/services/demo-seed.ts`) | Personal records the picker did not create, on a preview build | Only when `EXPO_PUBLIC_APP_ENV` is not `production` **and** `Platform.OS` is not `web`; production starts empty and the web harness never seeds. The profile carries `privacy.previewSample`; the marker `picky.demo-seed.v1` keeps it from reappearing after sign-out | `src/services/demo-seed.ts`; `src/services/__tests__/demo-seed.test.ts`; the notice in `src/features/privacy/components/privacy-settings-screen.tsx` |

Both gates were re-run against a production export of this tree on 2026-10-10
(`npx playwright test --config playwright.production.config.ts` — 3 passed), so the table above is
what a shipped build does today, not what it was written to do.

The gate reads `EXPO_PUBLIC_APP_ENV` through `src/config/env.ts`, the one module allowed to
read an `EXPO_PUBLIC_*` value. Both `EXPO_PUBLIC_*` reads must stay **literal** for the build
to substitute them: when `env.ts` looked the name up through a variable, every bundle came
back unset, `appEnvironment()` answered `development` in production, and G1 and G2 were both
open in a shipped export. That is the defect `e2e/production-export.spec.ts` exists for.

---

## 2. A · The design's sample

Every row repeats the frame's own composition. “Disclosed on screen” means the screen itself
says so, not that this repository records it.

| # | Value | Screens | Disclosed on screen | Lives in |
| - | ----- | ------- | ------------------- | -------- |
| A1 | `EXAMPLE_NAME` `'Aino Korhonen'`, `EXAMPLE_EMAIL` `'aino@example.fi'` | 03 (as placeholders, never pre-filled) | Yes — they are placeholders, not a filled form | `src/features/onboarding/domain/example-values.ts` |
| A2 | `DEMO_ZONES` — Z14 unpicked score 78 · Z09 recently picked · Z21 ripening; place “Laajavuori” | 07 without a zone id (a bare URL alone since the plan reads the source — ADR-060); 08–10 read the same demo zone. **No longer the map or the plan**: since 2026-10-22 screen 06's map reads the pilot stub through `ZoneSource` (B7, ADR-053), since 2026-10-24 its card, list and filters do too (ADR-057/ADR-058), and the saved plan's rows do since the same day (ADR-060) | **Yes**: eyebrow `CORE PICKER · SEASON DEMO / 28 AUG` on the screens that still draw it, and the map's own `50 zones · test data` line | `src/features/discover/domain/zone.ts:61` |
| A3 | `DEMO_ZONE_DETAILS` — 11 reports this week, 18 °C light wind 08:00, a trusted report 38 min old at 4/5 (its score 78 and season also fill screen 07's no-id path) | 07: the outlook, freshest report, walk and report list **even when the zone's figures come from the source** (the score and season are the source's there); and the whole screen without a zone id. The list behind “See all 11” states the eleven as the design's sample week (their count is read from this one constant, so the card and the line cannot disagree) | **Yes**, since 2026-10-10: screen 07's eyebrow `CORE PICKER · ZONE INSIGHT · SEASON DEMO`, beside the frame's forecast disclaimer, and since 2026-10-24 one sentence before those blocks on a source zone (ADR-058); the list's eyebrow carries the same disclosure, and its own sentence names the week as the design's (ADR-044) | `zone-details.ts:65` |
| A4 | `DEMO_ROUTE` — 1400 m, 22 min, arrival 10:03, keep right in 180 m | 08; and frame 07's “Navigate · 1.4 km” | **Yes**, since 2026-10-10: eyebrow `… · WALKING ROUTE · SEASON DEMO`, and the same change removed the note's claim that tiles are cached (see F2) | `route.ts:33` |
| A5 | `DEMO_ACTIVE_VISIT` — 42 min 17 s | 09 (the timer is **seeded** from it: `Date.now() - elapsedMs`), 10 | **Yes**, since 2026-10-10: eyebrow `… · VISIT IN PROGRESS · SEASON DEMO` | `active-visit.ts:13` |
| A6 | `DEMO_VISIT_WINDOW` — arrival 10:03, departure 10:55 → 52 min | 10's exit summary **and every report the picker saves** | **Yes on the screen**, since 2026-10-10: eyebrow `… · QUICK REPORT · SEASON DEMO`. The **stored** half is disclosed where the report is read back by nothing — that is F1 | `visit-report.ts:55` (see F1) |
| A7 | `DEFAULT_YIELD_RATING` = 4 (“Good”), the frame's drawn selection | 10 (the row starts there) | n/a — the design's drawn state, adopted deliberately | `visit-report.ts:52` |
| A8 | `DEMO_SEASON_TOTALS` — 4.5 kg, 1.5 kg/h, 3 zones, 3 h, median 60 min; `DEMO_HARVEST_BY_VISIT` — 20/24/28 Aug bars | 11 summary and chart | **Yes**: eyebrow `CORE PICKER · PERSONAL INSIGHTS · SEASON DEMO` | `season-insights.ts:31,38` |
| A9 | `DEMO_VISIT_HISTORY` — three visits, two of them marked `synced` | 11 history, listed **under** the picker's own rows in one list | Partly: the eyebrow covers the screen, but the rows carry no marker of their own (see F3) | `season-insights.ts:80` |
| A10 | `DEMO_ALERT` — ripe bilberries 1.8 km north, 82/100, high confidence, Zone 18 Laajavuori, latest report 1 h ago, stamped `TODAY · 28 AUG · 09:30` | 12 | **Yes**, since 2026-10-10: eyebrow `… · FORECAST REASONING · SEASON DEMO`, and the closing note says the alert is a sample (see F2) | `alert.ts:33` |
| A11 | `DEMO_ALERT_REASON_COUNT` = 3 (“A warm week”, “Rain on Sunday”, “Last picked 6 days ago”) | 12 | **Yes**, with A10's eyebrow | `alert.ts:53` |
| A12 | `DEMO_LISTINGS` — Matti Laine 4.9/24, Liisa Niemi 4.8/18, €8/kg, €6/kg, 20 kg, 8 kg; `DEMO_LISTING_DETAIL` — harvested 28 Aug 2026, Laajavuori car park 17:00–19:00; `DEMO_ORDER` — 5 kg, €40 held, pickup 18:30; `DEMO_THREAD` — four messages 14:02–14:06 | 15–18 | **Yes, on all four**: the common `Planned extra` chip (frame 15 `5:23793`, 16 `5:23846`, 17 `5:23897`, 18 `5:23949`), plus `Buyer mode · Preview` (15) and `Provider test mode` + “Test order confirmed · No real money was charged. Demo payment is held by the provider.” (18) | `src/features/marketplace/domain/{listing,order,chat}.ts` |
| A13 | The design map's geometry — the three zone polygons, the position marker, the route line | 08, 09 (screen 06 draws real geography since ADR-053) | Covered by A2's disclosure | `zone-map-geometry.ts` (ADR-021) |
| A14 | `ACTIVE · LINGONBERRY` (09) and `28 Aug` inside 10's exit summary (`discover.visit.status`, `report.exit.body`) | 09, 10 | Covered by A5's and A6's eyebrows since 2026-10-10; the two strings are still the design's own words, and `28 Aug` is still printed as a date (F3) | `locales/en.ts` |
| A15 | `discover.map.place` `'Laajavuori'`, `discover.map.lake` `'Tuomiojärvi'` | the lake name on 08–09's drawing; the place name on 06–10 (on 06 it names the pilot area the real map frames) | Covered by A2 | `locales/en.ts:114-115` |
| A16 | `DEMO_DOWNLOADS` — 12 km², 86 MB of 500, 24 zones' tiles, a forecast saved 28 Aug 08:00, last sync 08:12 | 13 | **Yes**, since 2026-10-11: the eyebrow's `· SEASON DEMO` and the screen's own sentence above the block saying these are the design's sample and nothing is downloaded (ADR-042) | `features/offline/domain/downloads.ts` |
| A17 | `DEMO_ALERT_PREFERENCES` — ripe-berry push alerts on, a 3 km search radius, quiet hours 21:00–07:00, bilberry + 1 species | 12 | **Yes**, since 2026-10-11: the eyebrow's `· SEASON DEMO` and a line **on the card itself** saying the four settings are the design's and that nothing reads them; the switch is a figure with no role and the three rows are readings (ADR-043) | `features/discover/domain/alert.ts` |

---

## 3. B · Stand-ins for a missing service

| # | Stand-in | What it stands in for | Gate | Swap point |
| - | -------- | --------------------- | ---- | ---------- |
| B2 | `createStandInSessionPort` behind the `SessionPort` seam (`signIn`, `current`, `signOut`, `requestPasswordReset`) | The account service and Firebase's credential — the account is the API's, the credential the provider's (ADR-054); the reset request belongs to the same provider (ADR-062) | Production: no credential is accepted, so no session is minted. The reset half is a stand-in only when no Firebase key is configured: then it accepts a reset address without sending anything, and a production build refuses it (G1). With a key, `firebase-password-reset.ts` takes the reset request in every environment and sends the email | Sign-in and account creation still wait for the account service; the reset's swap point has landed behind the same port (ADR-028, ADR-059, ADR-062) |
| B3 | `createInMemorySessionStore` | A session store that survives the process | Not gated — the value is not a door, it is a session that vanishes on reload | `src/services/session/store.ts`; ADR-006's secure adapter is not installed (`expo-secure-store` is not a dependency) |
| B5 | `DEFAULT_VISIT_POLICY` — `default-1`, 5 min dwell, 30 min grace, 1 day | The server-owned policy payload `parseVisitPolicy` validates | Not wired to any screen: `features/visits` is imported by nothing yet, though `expo-location` is installed behind the position seam (ADR-045) | Replace with the fetched policy |
| B6 | No transport behind `src/services/report-queue.ts` | The sync the design's “sync when you're online” promises | Not gated — the queue holds the picker's own data and never drains. Nothing can reach the `synced` state the design draws | ADR-005; the queue stays as the capture half |
| B7 | `assets/data/test-zones.json` behind the `ZoneSource` port (`services/test-zone-source.ts`) — the data team's 50-zone stub around Laajavuori, a copy of `data/test_zones.geojson` kept equal by a test | The zone service's `GET /zones` | **Not gated**: the scores are stand-ins, and the map and card say `test data` on the screen itself. No network, no location and nothing sent | The service's adapter behind the same port; no screen changes (ADR-053, ADR-057) |

B1 (`STUB_CODE`/`verifyCode`) and B4 (the `pending-verification` hand-off) were the code screen's
stand-ins; both were **deleted with screen 04** on 2026-10-24
([ADR-059](adr/ADR-059-email-password-replaces-the-code-screen.md)). Their numbers are not reused,
so the rows that cite B2/B3/B5–B7 keep pointing at the same thing.

---

## 4. C · Real data

| # | What | Where it lives | Left by | Four questions (AGENTS.md §11) |
| - | ---- | -------------- | ------- | ------------------------------ |
| C1 | Privacy consent — `visitTracking`, `decidedAt` | `picky.privacy-consent.v2` (AsyncStorage) | The consent screens, by an affirmative action; ships unchecked | Answered in `src/services/privacy-consent.ts` (ADR-020); the field and the copy state what the app does — tracking while the app is open — since 2026-10-12 (ADR-047), and a record left under the previous key is cleared on the next read |
| C2 | Saved zones — zone id, the berry it was saved under, saved at | `picky.saved-zones.v1` (AsyncStorage) | Frame 07's bookmark | Answered in `src/services/saved-zones.ts` (ADR-024, ADR-061); the plan is listed on frame 14's “Saved spots” screen (ADR-030), whose rows resolve each id against the zone source's answer for its own berry (ADR-060, ADR-061) |
| C3 | Report queue — zone id, species, yield rating, typed amount, minutes, recorded at | `picky.report-queue.v1` (AsyncStorage) | Frame 10's “Save report offline”, through `enqueueReport` | Answered in `src/services/report-queue.ts`; **two of the six fields are the design's sample** (F1) |
| C4 | Session — account id, the account's name (ADR-029), issued at, expires at | Process memory only | The stand-in port, on screens 03 and `/sign-in`; `/forgot-password` passes an address through the port but stores nothing | Answered in `src/services/session/index.ts`; the id and the name are personal data whose **lawful basis is open** (PROJECT.md question 15) |
| C5 | App language | The device's preference list (`expo-localization`) | The OS | No storage (ADR-017) |
| C6 | Colour scheme | The device (`useColorScheme`) | The OS | No storage |
| C7 | Connection state | The device (`expo-network`) | The OS | Read to draw one sentence, then forgotten (ADR-025) |
| C8 | The clock — a visit's elapsed time and every `recordedAt` | The device | The OS | Stored only inside C3 |
| C9 | Zone cache — a berry's last zone list: public geometry, score, confidence, ripeness | `picky.zones-cache.v1` (AsyncStorage) | A successful zone read, through the query provider in `src/app/_layout.tsx` | Answered in `src/features/discover/services/zone-cache.ts`; **no personal data** — the service's answers about forests, not the picker — refreshed by the next read, dropped when the app's data is cleared or it is uninstalled, and restored only if the map has been opened within the previous week |

---

## 5. D · The app's own choice

| # | Value | Why it exists | Recorded in |
| - | ----- | ------------- | ----------- |
| D2 | `SESSION_LIFETIME_MS` = 1 h | The provider owns a session's lifetime and there is no provider yet — **awaiting the owner** | `session.ts:24`; PROJECT.md known issue 23 / open questions |
| D4 | The foreground watch — `Accuracy.High`, a 50 m distance filter, a 60 s time ceiling on Android, foreground only | The platform's default (`Balanced`, ~100 m) would put a picker in a zone they are not in; `High` costs more battery, so the cadence caps a moving walk at one fix a minute on Android and takes no fix at all while the picker stands still. The trade-off is battery for boundary resolution, recorded rather than implied | **Decided 2026-10-24** — [ADR-063](adr/ADR-063-the-watch-has-a-cadence-and-an-accuracy-budget.md); `POSITION_WATCH_BUDGET` in `src/services/location/expo-source.ts`; [ADR-045](adr/ADR-045-a-position-behind-a-port-and-nothing-kept.md); [ADR-047](adr/ADR-047-the-consent-says-what-the-app-does.md) §2.3; PROJECT.md question 21 |

D4 was the app's choice awaiting an owner; it became a recorded decision on 2026-10-24
(ADR-063). D2 still awaits.

D1 (the 60-second resend wait), D3 (the six-digit code and its expiry words) and D5 (the phone
state's two strings) went with screen 04 on 2026-10-24
([ADR-059](adr/ADR-059-email-password-replaces-the-code-screen.md)). Their numbers are not reused.

---

## 6. E · Throwaway prototype

Two sets, one shared switcher (`src/components/prototype/prototype-switcher.tsx`), both
hard-coded English, both production-gated (G2), and both deleted once their question is answered.
Neither has unit tests — there is no product behaviour to hold — but since 2026-10-12 **every
reading is read by the browser harnesses**: the accessibility walk holds it to the same role / name
/ state / named-image contract a shipped screen is held to, and the layout harness measures its own
copy at both text sizes (`e2e/prototype-readings.ts`, TESTING.md §12). A reading is added to a
prototype's variant table and both harnesses open it. **Since 2026-10-13 the copy scan reads their
words too** — from source, against the same claim families — which is how the sign-in reading's own
sentence and its action's label turned out to be the two strings the app shipped until ADR-048
rewrote them (`PROPOSALS` in `src/config/__tests__/copy-claims.test.ts`;
[docs/copy-claims-audit.md](copy-claims-audit.md) row 16). The readings' wording is the design's and
an open questionnaire's, so it is recorded rather than reworded — and it cannot reach a shipped
screen without the catalogue half of that same scan refusing it:

- `src/features/onboarding/components/prototype/sign-in-variants.tsx` — three readings of a
  sign-in screen, mounted together on `/create-account?variant=A|B|C`, reached by
  `npm run prototype:sign-in` (ADR-016's design question is still open). The written-up reading of
  each variant is [to-questionnaire-sign-in.md](../to-questionnaire-sign-in.md).
- `src/features/discover/components/prototype/community-map-variants.tsx` — three readings of the
  design's “community map”, each mounted on the screen that reading would give it: a second layer
  on frame 06's map (`/discover?variant=A`), a list under the zone's own screen
  (`/zone-details?variant=B`), and place cards carrying the sharer in the picker's own plan
  (`/saved-spots?variant=C`). Reached by `npm run prototype:community-map`; it is
  [to-questionnaire-community-map.md](../to-questionnaire-community-map.md) §1's question, and the
  prototype's own bar navigates between the three screens.

Class E has no row in the tables above on purpose: a prototype's data is not product data to
classify. The community map's three shared spots, for instance, are **invented by the prototype**
(the design draws no community map), and nothing of them is stored, sent or logged.

---

## 7. Absent, and deliberately not stood in

Each of these is the frame's drawing of something no service backs, and each is **omitted**
rather than faked. The rule is the one AGENTS.md §11.2 states: a control that cannot act claims
no role, and a figure nothing measures is not printed.

- Frame 13's downloaded region used to be here, and is **not any more**: since 2026-10-11 the frame's
  region, its tiles and forecast, its storage meter, its last-sync line and its two actions are drawn
  as the design's own sample with the screen saying so (row A16, ADR-042) rather than omitted. What
  stayed the rule: neither action claims a role, and no tile cache, forecast download or storage
  measurement exists.
- Frame 12's alert-preferences card used to be here, and is **not any more**: since 2026-10-11 its four
  settings are drawn as the design's own sample with the card saying so (row A17, ADR-043), its switch
  is a figure with no role, and its three rows are readings that drop the chevron the frame draws. What
  stayed the rule: nothing on the card can act, and no notification is delivered, no permission asked
  for, and no radius, quiet hours or species filter exists.
- Screen 03's terms link was the same treatment in another shape: **drawn inert** as a label, because a
  link which cannot act claims no role. It is not inert any more — since 2026-10-11 it is **wired** to
  the device notice (`/terms-privacy`, ADR-039), which is what the app can honestly put behind a consent
  line while no terms document exists (ADR-043). What stayed the rule: no terms document is invented.
- Frame 18: “Confirm berries received” and “Open dispute” — one releases a payment, one freezes
  it, and no provider holds either. The strings are absent from the catalogue entirely, and the
  owner's 2026-10-12 ask for the frame to be finished left them out with that reason recorded
  ([ADR-044](adr/ADR-044-the-partial-frames-remaining-parts.md)).
- Frames 06 and 09: the **recentre control** — its whole meaning is “centre the map on my
  position”, the app reads no position for any screen yet (the seam exists since 2026-10-12,
  [ADR-045](adr/ADR-045-a-position-behind-a-port-and-nothing-kept.md), and no screen asks it for a
  fix) and its map neither pans nor follows the device — on screen 06 it is real geography with
  every gesture off (ADR-053), on 09 it is still the design's drawing (ADR-021). A button on the map (06) and one under it (09)
  would look operable and act on nothing, so both stay out. What they wait on is more than a
  position source and a map that moves: on 2026-10-12 a reading of the drawing found it carries no
  latitude or longitude at all (its paths are the frame's own 342×300 coordinates), so a real fix
  has no place on it — the control needs **a map with geographic coordinates**, which is the real
  basemap ([ADR-031](adr/ADR-031-a-real-basemap-osm-derived-tiles-we-host.md)), beside the position
  source ([ADR-044](adr/ADR-044-the-partial-frames-remaining-parts.md)).
- Screen 04 is retired, so its resend row is not a “not drawn” part any more: the whole screen went
  on 2026-10-24 ([ADR-059](adr/ADR-059-email-password-replaces-the-code-screen.md)).
- Frame 12: “View Zone 18” — the alert names a zone the app's demo composition does not hold (the
design's own three zones are Z14, Z09 and Z21), so a screen for it would need a zone source or a
zone invented for it; the link stays out ([ADR-044](adr/ADR-044-the-partial-frames-remaining-parts.md)).
- Frame 17: the chat composer is drawn inert — it claims no input role, because nothing is
  delivered anywhere.
- Frame 10: “Add a berry photo” (deferred by the owner, 2026-10-09) — no image picker, no camera
  permission, no media store.
- Frame 07: “See all 11” used to be drawn as the design's words rather than as a control, and is
  **not** here any more: since 2026-10-12 it opens the zone's own report list — an app-drawn screen
  (`/zone-reports`) that states the frame's eleven as the design's sample week and lists what this
  phone holds for the zone, naming the report service that would return the others
  ([ADR-044](adr/ADR-044-the-partial-frames-remaining-parts.md), row A3). The row keeps the
  frame's own visible label and carries a role only where the route supplies that list.
- Frame 14: “Default spot visibility” and its three chips (a sharing model the app does not
  have) — and nothing else on that frame: its account row, its saved-spots row, its sign out **and
  all five of its chevron rows** are built and lead somewhere real (ADR-029, ADR-030, ADR-039,
  ADR-040, ADR-041).
- Frame 11's two period chips are **not** here any more: since 2026-10-11 they are a real choice over
  the visit history, with the period and its count stated and a filtered-off visit counted rather than
  hidden (ADR-043). Frame 15's three filter chips are drawn in the frame's states and claim no role,
  and its sliders glyph is not built (no filter sheet): every one of the frame's filters leaves both of
  the app's two listings, and two of them would have to claim metadata the app does not hold — a real
  filter needs a listings service ([ADR-044](adr/ADR-044-the-partial-frames-remaining-parts.md)).
- Every core picker and account screen: the core navigation is the app shell (ADR-022).
- Screen 05: **the platform's permission is not asked on that screen.** The app's own consent is
  what the picker records there; the OS permission is asked by the position seam when a screen
  starts reading a fix, and no screen reads one today (ADR-045) — so consent is recorded and the
  platform is left alone until something can use a fix.

---

## 8. Findings

**F1 — the design's sample is written into the picker's own record.** (`buildVisitReport`,
`visit-report.ts:98-109`; recorded as known issue 26 in PROJECT.md on 2026-10-10.)
Every report frame 10 saves is stamped with `zoneId` = the demo zone
(`DEMO_ACTIVE_VISIT.zoneId` → Z14) and `minutes` = 52, the design's own window
(`DEMO_VISIT_WINDOW`, line 103). Screens 11 and 13 then read that back as the picker's own
record — “Zone 14 · 52 min” on a visit they may never have had, in a zone the app cannot know
they were in. Row A9 shows the same thing in the other direction: the design's three sample
visits sit in the *same list* as the picker's, and two of them say **“Synced”** while nothing
syncs. This is the one class of entry in this audit where a demo value is not merely displayed
but **stored**, and it is what makes the two screens that read the queue less true than they
mean to be.

**F2 — the disclosure was not uniform. Fixed 2026-10-10.** Frames 06, 11 and 15–18 said on the
screen that what they show is the design's composition (A2, A8, A12). Frames 07, 08, 09, 10 and
12 did not (A3, A4, A5, A6, A10), and two of them asserted facts about services that do not
exist:

- frame 08 leads with “Laajavuori tiles and zone boundaries are **cached**” — there is no tile
  cache (`route-to-zone-screen.tsx` records this in a comment, not on the screen);
- frame 12 closes with “Forecasts combine weather, season and trust-weighted reports” — nothing
  combines anything.

Both were the frame's own sentences, kept verbatim, drawn in the app's voice. PROJECT.md recorded
the demo; the screens did not, and screen 07's only qualification was a disclaimer that implies a
forecast exists.

What changed: the five screens' eyebrows now carry the same `· SEASON DEMO` the map and the season
screen carry (`· KAUSIDEMO` in Finnish), and the two sentences were rewritten to say what the app
can be true about — frame 08's note states that the boundaries are drawn from data on the device
and names the tile cache as missing (its glyph is informational rather than a download), and frame
12's says the alert is a sample rather than describing a forecast model. The layout harness
re-measured all five screens in both languages at both text sizes afterwards, which is where the
longer eyebrow and the longer notes are checked against the frame's own line counts.

What keeps it from drifting again: `src/features/discover/components/__tests__/demo-disclosure.test.tsx`
reads every `*-screen.tsx` on disk and fails until each one is classified — either as drawing the
design's sample (and then it must render its disclosure, in every shipped language) or as drawing
none of it (and then it must reference no `DEMO_*` value and render neither the map nor the zone
card, the two components that fall back to the sample). A new screen cannot be added without that
decision being made.

**F3 — the demo's day is printed as a date a screen can see.** `report.exit.body` reads
“Zone 14 · **28 Aug** · 10:03–10:55 · 52 min” unconditionally (`locales/en.ts`), and screen 09's
status chip hard-codes a species (`ACTIVE · LINGONBERRY`). Frame 18's “Today” was deliberately
dropped for exactly this reason — a screen may not claim the design's sample day is the day the
picker is holding the phone — so the rule is applied on one screen and not on these.

**F4 — reviewed and left as they are.** Two claims about missing services are *hedged on screen*
and were checked rather than assumed:

- the marketplace's escrow sentence (“**Planned** provider escrow protects payment…”) and the
  order's “Order confirmed · payment held” / hold callout sit on a screen carrying `Planned
  extra`, `Provider test mode` and “No real money was charged”, so the hedge is in front of the
  claim (PROJECT.md known issue 22);
- frame 17's composer and frame 15's filter chips are drawn inert — no input role, no filter
  role — so there is nothing on them to be true about (AGENTS.md §11.2).

**F5 — personal data whose lawful basis is still open.** The account's email address is held
inside the session (`src/services/session/`), and the password is passed through without being
kept. The address is personal data; PROJECT.md question 15 is the recorded open decision. It is
not logged, sent or persisted — but a field with no lawful basis recorded is not done
(AGENTS.md §11.1).

**F6 — a number the design never states, picked here.** `SESSION_LIFETIME_MS` = 1 h (D2). It is a
reachable, harmless stand-in; it is waiting on an owner answer rather than a service, which is why
it is classed separately and not counted as demo data.

**F7 — a whole domain built and unwired.** `features/visits` (the visit policy, the polygon
containment and the visit lifecycle) is exported and tested, and imported by nothing; the policy's
defaults are the owner's agreed numbers, though `expo-location` is installed behind the position
seam (ADR-045). It is the one place in the app where a stand-in exists for a service that nothing
yet asks about (B5).

---

## 9. What is *not* demo or stand-in

For completeness, so a later reading does not over-classify:

- the report queue, saved zones, the consent record and the session are the picker's own data
  (C1–C4) — the services behind them are missing, the data is not;
- the search over frame 15's listings, the order arithmetic in whole cents, and the money and
  date formatters are real code over demo operands;
- the species vocabulary (`domain/species.ts`), `REPORT_SPECIES_MORE`, the token set
  (`src/constants/theme.ts`) and the two catalogues are the app's own, not the design's;
- the app shell, the connection rule, the language resolution and the theme resolution read the
  device and are real (C5–C7);
- the device's position, when a screen asks for it and the picker's consent record says yes
  ([ADR-045](adr/ADR-045-a-position-behind-a-port-and-nothing-kept.md)) — read in memory through the
  `PositionSource` port, replaced by the next fix, and written, sent and logged nowhere. It is not
  listed as class C because there is nothing stored to classify: **no screen asks for a fix today**.
  Since 2026-10-12 the consumer exists — `useVisitPresence`
  ([ADR-046](adr/ADR-046-the-tracker-gets-its-hook-and-the-zone-list-stays-out.md)) turns fixes into
  zone presence and drives the visit tracker — but it ships no zone list (a scripted one would be
  invented geography), so mounting it on a screen would ask for a fix that resolves to no zone. What
  it waits on is real rings and a map that carries geography (nothing returns either yet).
