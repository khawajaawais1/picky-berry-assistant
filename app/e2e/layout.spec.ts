import { expect, test, type Browser, type Page, type TestInfo } from '@playwright/test';

import { interpolate } from '../src/services/i18n/interpolate';
import { en, type TranslationKey } from '../src/services/i18n/locales/en';
import { fi } from '../src/services/i18n/locales/fi';

import {
  FRAME_VIEWPORT,
  LARGEST_FONT_SCALE,
  applyFontScale,
  findPageOverflow,
  measureCopy,
} from './measure';
import { PROTOTYPE_READINGS, type PrototypeReading } from './prototype-readings';

/**
 * Measures every built screen in both shipped languages, at the frame's 390 px width, and
 * twice over: once at the design's own text size, where it fails when a translation wraps
 * onto a line the design does not draw, and once at the largest text size a platform
 * setting can ask for, where it fails when the copy is clipped or spills out of the box
 * the design sizes.
 *
 * The copy is read from the catalogues the app itself renders (not retyped here), so a
 * reworded translation is measured as the new wording; the line counts are read from
 * the frames, so they are the design's, not the current render's. The app picks its
 * language from the device (`useLocales()` → `navigator.languages`), which is why the
 * locale is set on the browser context rather than injected: this exercises the same
 * path a Finnish phone does.
 *
 * The design's line counts are deliberately *not* asserted at the large text size: at
 * 200 % a paragraph must reflow, and holding it to the frame's line count would demand
 * the opposite of what a large-text user needs. What is asserted there is that nothing is
 * lost — every string still renders, and no box hides or spills it (ADR-019).
 *
 * Scope: these are static checks of layout, not device journeys. Maestro remains the plan
 * for those (TESTING.md §2), and this harness measures the web export, so platform font
 * differences remain a device concern.
 */

type Catalogue = Record<TranslationKey, string>;

type Locale = {
  name: string;
  /** Handed to the browser context; the app reads it as the device's language. */
  tag: string;
  /** The app's own locale code, for a copy rule whose value it formats per language. */
  code: LocaleCode;
  catalogue: Catalogue;
};
type LocaleCode = 'en' | 'fi';

/**
 * One piece of copy the design lays out on a known number of lines. `maxLines` is what
 * the frame draws — read from the frames themselves (nodes 5:22710, 5:22788 and
 * 5:22840), never estimated. Fewer lines than the frame is fine (the copy is shorter);
 * more means the screen no longer matches the design and everything below it moved down.
 */
type CopyRule = {
  what: string;
  key: TranslationKey;
  maxLines?: number;
  /**
   * The values the screen fills into the sentence's `{placeholders}`. Without one the
   * measurement would look for the literal placeholder and call a screen that renders its
   * value broken.
   *
   * A value may be another catalogue key (`{ key }`) rather than a literal, which is how a
   * sentence built around a translated fragment — screen 07's wind in its weather line — is
   * measured in the language the screen actually renders it in. Passing the English word
   * would leave the Finnish run looking for copy that is not on the page.
   *
   * A value may instead be written per language (`{ en, fi }`), for a value the app formats
   * differently in each: screen 13's queued report prints “28 Aug” in English and “28.8.” in
   * Finnish, and the run that measures Finnish has to look for the Finnish day.
   */
  values?: Record<string, string | { key: TranslationKey } | { en: string; fi: string }>;
};

type Screen = {
  name: string;
  path: string;
  /** Copy that proves the locale applied — the first line the screen shows. */
  anchor: TranslationKey;
  copy: CopyRule[];
  /**
   * The screen is inside the app shell, so the core navigation bar's own labels are on it too
   * (frames 06–14) and are measured with it — including in Finnish, where they are the copy a
   * user reads most often and a label that wrapped inside a 90 px item would be a defect.
   */
  shell?: boolean;
  /**
   * Device storage the screen reads, written before the app loads. Frame 13's sync centre lists
   * the reports the phone is holding, and the design draws it holding one: the harness opens it
   * with a report already saved, because the empty card is the state no frame draws (the unit
   * test covers that one).
   */
  seed?: Record<string, string>;
};

/**
 * The core navigation bar's four labels, as frames 06–14 draw them: one line each, inside a 90 px
 * item. They are measured as copy of every screen in the shell rather than of one screen, because
 * that is where they are drawn.
 */
const NAV_COPY: readonly CopyRule[] = [
  { what: 'the shell’s Discover label', key: 'navigation.discover', maxLines: 1 },
  { what: 'the shell’s Visits label', key: 'navigation.visits', maxLines: 1 },
  { what: 'the shell’s Alerts label', key: 'navigation.alerts', maxLines: 1 },
  { what: 'the shell’s Profile label', key: 'navigation.profile', maxLines: 1 },
];

/** Everything the frame draws on a screen: its own copy, plus the bar's when it is in the shell. */
function copyRulesOf(screen: Screen): readonly CopyRule[] {
  return screen.shell ? [...screen.copy, ...NAV_COPY] : screen.copy;
}

/** Long enough for the export to hydrate, short enough to fail a stalled page. */
const RENDER_TIMEOUT_MS = 15_000;

const LOCALES: readonly Locale[] = [
  { code: 'en', name: 'English', tag: 'en-US', catalogue: en },
  { code: 'fi', name: 'Finnish', tag: 'fi-FI', catalogue: fi },
];

/**
 * The zone both of screen 07's source-side journeys open: “Laajavuori 1”, the first feature of the
 * data team's 50-zone stub (`assets/data/test-zones.json`, held equal to `data/test_zones.geojson`
 * by a test). Written out because the route receives this id the way it receives any other — as
 * input from a link, not as a value this harness owns — and the saved-plan journey in
 * `e2e/accessibility.spec.ts` opens the same zone, so the two must name the same one.
 */
const SOURCE_ZONE_ID = 'cc0e7929-de9f-516a-9049-7a25a1a6d092';

/**
 * Screen 07's frame blocks, which both of its readings draw from the same view with the same
 * values: the forecast note inside the yield card, the outlook, the freshest report behind the
 * “See all” link, and the scoring note. One list rather than two, because a rule added for one
 * reading is a string the other renders too — and because the source reading must not drift from
 * the design's sample it discloses under itself.
 */
const ZONE_DETAILS_BLOCKS: readonly CopyRule[] = [
  { what: 'the forecast note', key: 'discover.details.forecastDisclaimer' },
  { what: 'the outlook heading', key: 'discover.details.outlook.title' },
  // The one block the frame lays out over two lines (342x40, node 5:23069).
  { what: 'the outlook body', key: 'discover.details.outlook.body', maxLines: 2 },
  {
    what: 'the weather line',
    key: 'discover.details.weather',
    values: {
      temperature: '18',
      time: '08:00',
      wind: { key: 'discover.details.wind.light' },
    },
  },
  { what: 'the report heading', key: 'discover.details.reports.title' },
  {
    what: 'the reports action',
    key: 'discover.details.reports.seeAll',
    values: { count: '11' },
  },
  { what: 'the report’s own words', key: 'discover.details.reports.quote' },
  {
    what: 'the report’s provenance line',
    key: 'discover.details.reports.meta',
    values: {
      max: '5',
      minutes: '38',
      trust: { key: 'discover.details.reports.trust.trusted' },
      yield: '4',
    },
  },
  { what: 'the scoring note', key: 'discover.details.reports.scoring' },
];

const SCREENS: readonly Screen[] = [
  {
    name: '01 · Onboarding · Welcome',
    path: '/',
    anchor: 'onboarding.welcome.eyebrow',
    copy: [
      { what: 'the eyebrow', key: 'onboarding.welcome.eyebrow' },
      // The promise and the supporting line are the frame's two-line blocks (30/42 and
      // 14/19.6); they are allowed to reflow, but not beyond what the frame draws.
      { what: 'the promise', key: 'onboarding.welcome.headline', maxLines: 2 },
      { what: 'the supporting line', key: 'onboarding.welcome.supporting', maxLines: 2 },
      { what: 'the first promise tag', key: 'onboarding.welcome.tag.freshInsights' },
      { what: 'the second promise tag', key: 'onboarding.welcome.tag.offlineReady' },
      { what: 'the third promise tag', key: 'onboarding.welcome.tag.privateByNature' },
      { what: 'the primary action label', key: 'onboarding.welcome.action' },
      { what: 'the sign-in action', key: 'onboarding.welcome.signIn' },
      { what: 'the footer', key: 'onboarding.welcome.footer' },
    ],
  },
  {
    // The sign-in screen (ADR-034). **The design never drew it**: frames 01 and 03 draw the link
    // and nothing behind it, so there are no frame line counts to take — every string below is the
    // app's own, and the run at the largest text size is what holds it to “nothing is lost”, the
    // way the saved plan's entry does.
    name: '01b · Onboarding · Sign in',
    path: '/sign-in',
    anchor: 'onboarding.signIn.eyebrow',
    copy: [
      { what: 'the eyebrow', key: 'onboarding.signIn.eyebrow' },
      { what: 'the screen title', key: 'onboarding.signIn.title' },
      { what: 'the heading', key: 'onboarding.signIn.heading' },
      // The app's own sentence, so it carries the lines its wording needs in the wider language
      // (Finnish takes three; measured 2026-10-11) rather than the one line a frame would draw.
      { what: 'the supporting line', key: 'onboarding.signIn.supporting', maxLines: 3 },
      { what: 'the email label', key: 'onboarding.signIn.email' },
      { what: 'the password label', key: 'onboarding.signIn.password' },
      { what: 'the primary action label', key: 'onboarding.signIn.action' },
      { what: 'the create-account action', key: 'onboarding.signIn.createAccount' },
    ],
  },
  {
    // The password-reset request (ADR-062). **The design never drew it**: the sign-in screen is
    // app-drawn too, and no frame carries a reset journey. Every string below is the app's own,
    // so the large-text run is what holds it to “nothing is lost”; the confirmation is reached by
    // pressing through in `e2e/accessibility.spec.ts`, not by a fresh load.
    name: '01c · Onboarding · Reset password',
    path: '/forgot-password',
    anchor: 'onboarding.forgotPassword.eyebrow',
    copy: [
      { what: 'the eyebrow', key: 'onboarding.forgotPassword.eyebrow' },
      { what: 'the screen title', key: 'onboarding.forgotPassword.title' },
      { what: 'the heading', key: 'onboarding.forgotPassword.heading' },
      { what: 'the supporting line', key: 'onboarding.forgotPassword.supporting', maxLines: 3 },
      { what: 'the email label', key: 'onboarding.signIn.email' },
      { what: 'the primary action label', key: 'onboarding.forgotPassword.action' },
      { what: 'the sign-in action', key: 'onboarding.signIn.title' },
    ],
  },
  {
    name: '03 · Onboarding · Create account',
    path: '/create-account',
    anchor: 'onboarding.createAccount.eyebrow',
    copy: [
      { what: 'the eyebrow', key: 'onboarding.createAccount.eyebrow' },
      { what: 'the screen title', key: 'onboarding.createAccount.title' },
      { what: 'the heading', key: 'onboarding.createAccount.heading' },
      { what: 'the supporting line', key: 'onboarding.createAccount.supporting', maxLines: 2 },
      { what: 'the name label', key: 'onboarding.createAccount.field.name' },
      { what: 'the identifier label', key: 'onboarding.createAccount.field.email' },
      { what: 'the password label', key: 'onboarding.createAccount.field.password' },
      { what: 'the password rule', key: 'onboarding.createAccount.passwordHint' },
      { what: 'the consent row', key: 'onboarding.createAccount.consent', maxLines: 2 },
      { what: 'the terms link', key: 'onboarding.createAccount.readTerms' },
      { what: 'the primary action label', key: 'onboarding.createAccount.action' },
      { what: 'the sign-in action', key: 'onboarding.createAccount.signIn' },
      { what: 'the privacy note title', key: 'onboarding.createAccount.privacy.title' },
      { what: 'the privacy note body', key: 'onboarding.createAccount.privacy.body', maxLines: 2 },
      // The frame's email/phone chips are deliberately absent: the form is email-only, because
      // phone sign-in is deferred and screen 04 is retired (ADR-054 §5, ADR-059).
    ],
  },
  {
    name: '05 · Onboarding · Location consent',
    path: '/location-consent',
    anchor: 'onboarding.location.eyebrow',
    copy: [
      { what: 'the eyebrow', key: 'onboarding.location.eyebrow' },
      { what: 'the screen title', key: 'onboarding.location.title' },
      { what: 'the heading', key: 'onboarding.location.heading' },
      // The frame lays the supporting line out over two lines (342x40).
      { what: 'the supporting line', key: 'onboarding.location.supporting', maxLines: 2 },
      { what: 'the first benefit title', key: 'onboarding.location.benefit.nearby.title' },
      { what: 'the first benefit body', key: 'onboarding.location.benefit.nearby.body' },
      { what: 'the second benefit title', key: 'onboarding.location.benefit.timing.title' },
      // The frame lays this one out over two lines (272x36).
      {
        what: 'the second benefit body',
        key: 'onboarding.location.benefit.timing.body',
        maxLines: 2,
      },
      // The consent row and the reassurance line are the frame's two-line blocks too
      // (308x40 and 342x36).
      { what: 'the consent row', key: 'onboarding.location.consent', maxLines: 2 },
      { what: 'the reassurance line', key: 'onboarding.location.reassurance', maxLines: 2 },
      { what: 'the primary action label', key: 'onboarding.location.action' },
      { what: 'the skip action', key: 'onboarding.location.skip' },
      // The frame's zone map is an illustration (its labels are baked into the exported
      // asset), so there is no copy on it for this harness to measure. The two benefit
      // rows carry the same meaning in words, which is what is measured above.
    ],
  },
  {
    name: '06 · Core picker · Discover map',
    path: '/discover',
    shell: true,
    anchor: 'discover.eyebrow',
    copy: [
      { what: 'the eyebrow', key: 'discover.eyebrow' },
      { what: 'the screen title', key: 'discover.title' },
      // The map's own words. Screen 06's map is the pilot's real zones now (ADR-053), not the
      // frame's drawing, so the frame's lake name and scale line are gone — the real map has
      // no lake layer and no tile scale — and the three state words are replaced by the five
      // band legend's two lines. Every one of them is a single line on the screen.
      { what: 'the place name on the map', key: 'discover.map.place' },
      // The app's own line under the map: the payload's oldest timestamp, printed in the
      // language's date form. The frame draws no freshness line, so one line is the app's own
      // limit rather than the design's.
      {
        what: 'the last-updated line',
        key: 'discover.map.updated',
        values: { date: { en: '3 August 2026', fi: '3.8.2026' } },
      },
      { what: 'the legend’s heading', key: 'discover.score.label' },
      { what: 'the legend’s low-confidence line', key: 'discover.score.lowConfidence' },
      // The card reads the ZoneSource's first zone now: its own name and the berry the chips
      // asked for are values, and every other line is a fact the payload carries. The score,
      // confidence and ripeness are the stub's, so the run measures the sentences around them.
      {
        what: 'the zone card’s title',
        key: 'discover.card.zoneTitle',
        values: { species: { key: 'report.species.bilberry' }, zone: 'Laajavuori 1' },
      },
      { what: 'the zone card’s source line', key: 'discover.card.source' },
      {
        what: 'the yield chip',
        key: 'discover.list.yield',
        values: { max: '100', score: '53' },
      },
      { what: 'the confidence chip', key: 'discover.details.confidence.medium' },
      { what: 'the zone card’s status line', key: 'discover.ripeness.past' },
      // The frame's two filter controls (nodes `5:22955` and `5:22959`) and the row under the
      // card (node `5:23008`). The field's promise is one line in a 250x21 slot, each chip is
      // one line inside its 36 px pill, and the row's three pieces are drawn on one 342x20
      // line — which is what the Finnish has to fit in as well.
      // `discover.search.placeholder` is deliberately absent: it is the field's placeholder,
      // which React Native Web renders as an attribute rather than as text, so this probe —
      // which reads what a page renders as copy — cannot see it. A placeholder is also the one
      // string a single-line input cannot wrap, so at the largest system text size it is clipped
      // the same way on every platform; that half is a device check (PROJECT.md records it).
      { what: 'the first species chip', key: 'report.species.lingonberry', maxLines: 1 },
      { what: 'the second species chip', key: 'report.species.bilberry', maxLines: 1 },
      { what: 'the third species chip', key: 'report.species.cloudberry', maxLines: 1 },
      { what: 'the map/list row’s state', key: 'discover.view.mapStatus', maxLines: 1 },
      { what: 'the map/list row’s action', key: 'discover.view.showList', maxLines: 1 },
    ],
  },
  {
    name: '07 · Core picker · Zone details',
    path: '/zone-details',
    shell: true,
    anchor: 'discover.details.eyebrow',
    copy: [
      { what: 'the eyebrow', key: 'discover.details.eyebrow' },
      // The title names the same demo zone and place the map draws (298x28, node 5:23044).
      {
        what: 'the screen title',
        key: 'discover.details.title',
        values: { place: { key: 'discover.map.place' }, zone: '14' },
      },
      {
        what: 'the score’s own scale',
        key: 'discover.details.scoreLabel',
        values: { max: '100' },
      },
      { what: 'the confidence line', key: 'discover.details.confidence.high' },
      {
        what: 'the week’s report count',
        key: 'discover.details.reportsThisWeek',
        values: { count: '11' },
      },
      // The chip is the map legend's word for the same zone, which is the point: the two
      // screens describe one zone one way (node 5:23063, “Unpicked”).
      { what: 'the state chip', key: 'discover.legend.unpicked' },
      { what: 'the ripeness chip', key: 'discover.ripeness.ripe' },
      // The frame's species row (node `5:23047`): what this zone is reported for, each chip one
      // line inside its 36 px pill — including the two berries the design names.
      { what: 'the first species chip', key: 'report.species.lingonberry', maxLines: 1 },
      { what: 'the second species chip', key: 'report.species.bilberry', maxLines: 1 },
      ...ZONE_DETAILS_BLOCKS,
    ],
  },
  {
    // The same frame read from the **zone source** instead of the design's sample: the state the
    // map's card and the saved plan open (ADR-058, ADR-060), which `/zone-details` alone cannot
    // reach because a bare URL draws the sample. The zone and berry are the ones the saved-plan
    // journey opens — Laajavuori 1, scored for lingonberry — so the harness measures the page the
    // picker actually arrives on, not only the one the design drew.
    name: '07 · Core picker · Zone details (a source zone)',
    path: `/zone-details?zone=${SOURCE_ZONE_ID}&species=lingonberry`,
    shell: true,
    // The source reading's own sentence: it is drawn only once the zone has been read, so it also
    // proves the screen is not still pending — or the sample the entry above measures.
    anchor: 'discover.details.sample',
    copy: [
      { what: 'the eyebrow', key: 'discover.details.eyebrow' },
      // The title is the zone's own name from the payload (“Laajavuori 1”), not a catalogue
      // sentence, so there is no key to measure here. Its date line below proves the same payload
      // rendered, and the saved-plan journey asserts the name itself.
      {
        what: 'the score’s own scale',
        key: 'discover.details.scoreLabel',
        values: { max: '100' },
      },
      { what: 'the confidence line', key: 'discover.details.confidence.medium' },
      // One chip, not the sample's two: a zone's picking state is the design's and is not part of
      // the source's answer, which is what the sample note below says out loud.
      { what: 'the ripeness chip', key: 'discover.ripeness.ripe' },
      // The berry the screen was asked for comes first, then every other berry the payload scores
      // — a source zone's row is its data, not the design's three chips.
      { what: 'the first species chip', key: 'report.species.lingonberry', maxLines: 1 },
      { what: 'the second species chip', key: 'report.species.bilberry', maxLines: 1 },
      { what: 'the third species chip', key: 'report.species.cloudberry', maxLines: 1 },
      { what: 'the fourth species chip', key: 'report.species.crowberry', maxLines: 1 },
      // The zone's own freshness in frame 06's words, with the instant the source sent — formatted
      // per language, the way the rows' dates are (so both forms are given).
      {
        what: 'the zone’s own freshness',
        key: 'discover.map.updated',
        values: { date: { en: '3 August 2026', fi: '3.8.2026' } },
      },
      // The app's own sentence, not a frame's: its allowance is the one its wording takes rather
      // than a frame's count (measured 2026-10-24; Finnish is the longer of the two).
      { what: 'where the app’s own knowledge stops', key: 'discover.details.sample', maxLines: 3 },
      ...ZONE_DETAILS_BLOCKS,
    ],
  },
  {
    // The list behind frame 07's “See all 11” (node `5:23076`), opened by that row on the screen
    // above. **The design never drew it** (ADR-044), so it has no frame's line counts to be held
    // to: every string below is the app's own, and the run at the largest text size is what holds
    // it to “nothing is lost”.
    name: '07b · Core picker · Zone reports',
    path: '/zone-reports',
    shell: true,
    anchor: 'discover.zoneReports.eyebrow',
    // The zone it is about is the frame's own demo zone, and the queue is seeded with the frame's
    // own visit — Zone 14, 28 Aug, 52 min, 1.3 kg, rated 4 of 5 — so the list the screen draws is
    // the one the frame's week is about. The empty state, which the design never drew, is asserted
    // in the screen's unit test.
    seed: {
      'picky.report-queue.v1': JSON.stringify([
        {
          amountText: '1.3 kg',
          minutes: 52,
          recordedAt: '2026-08-28T10:55:00.000Z',
          speciesId: 'lingonberry',
          yieldRating: 4,
          zoneId: 'Z14',
        },
      ]),
    },
    copy: [
      // The design's sample week, said as such by the eyebrow and by the sentence under it: the
      // frame's eleven are read from the zone's own figures, so the count is a value here.
      { what: 'the eyebrow', key: 'discover.zoneReports.eyebrow' },
      { what: 'the screen title', key: 'discover.zoneReports.title', values: { zone: '14' } },
      // The app's own sentence, so it carries the lines its wording needs in the wider language
      // (Finnish takes three; measured 2026-10-12) rather than the one line a frame would draw.
      {
        what: 'what the frame’s own week is',
        key: 'discover.zoneReports.intro',
        maxLines: 3,
        values: { count: '11' },
      },
      // What this phone holds, counted in the language's own sentence — one report here, so the
      // singular entry is the one the page renders.
      { what: 'the count of the phone’s own reports', key: 'discover.zoneReports.held.one' },
      // The row's own line, in the frame's own order of facts — its day (a value the app formats
      // per language, so both forms are given), its length, the rating and the harvest typed.
      {
        what: 'a report’s own line',
        key: 'discover.zoneReports.row.meta',
        values: {
          amount: '1.3 kg',
          date: { en: '28 Aug', fi: '28.8.' },
          max: '5',
          minutes: '52',
          yield: '4',
        },
      },
      { what: 'a report’s species', key: 'report.species.lingonberry' },
      // The queue's own word for the row's state, the same one the season screen's rows carry.
      { what: 'a report’s state', key: 'discover.season.row.queued' },
      // The half of the design's own list nothing can return yet, named rather than faked — the
      // app's own sentence again, two lines in Finnish (measured 2026-10-12).
      { what: 'what is missing from the list', key: 'discover.zoneReports.missing', maxLines: 2 },
      // `discover.zoneReports.empty` and `common.readFailed` are deliberately absent: the harness
      // opens the screen holding a report, and the design draws no failure state. Both are
      // asserted in the screen's unit test.
    ],
  },
  {
    name: '08 · Core picker · Route to zone',
    path: '/route-to-zone',
    shell: true,
    anchor: 'discover.route.eyebrow',
    copy: [
      { what: 'the eyebrow', key: 'discover.route.eyebrow' },
      { what: 'the screen title', key: 'discover.route.title', values: { zone: '14' } },
      { what: 'the offline note title', key: 'discover.route.offline.title' },
      // The frame lays the note out over two lines (282x36, node 5:23124).
      {
        what: 'the offline note body',
        key: 'discover.route.offline.body',
        maxLines: 2,
        values: { place: { key: 'discover.map.place' } },
      },
      // The card's distance is a formatted value, not copy: the frame draws “1.4 km” and a
      // Finnish device draws “1,4 km” for the same data, so this measures the label only.
      { what: 'the distance label', key: 'discover.route.distance' },
      {
        what: 'the duration',
        key: 'discover.route.duration',
        values: { minutes: '22' },
      },
      {
        what: 'the arrival label',
        key: 'discover.route.arrival',
        values: { time: '10:03' },
      },
      { what: 'the guidance title', key: 'discover.route.guidance.title' },
      {
        what: 'the guidance line',
        key: 'discover.route.guidance.detail',
        values: {
          direction: { key: 'discover.route.turn.right' },
          distance: '180 m',
          place: { key: 'discover.map.place' },
        },
      },
      // The frame lays the supporting line out over two lines (342x40, node 5:23160).
      { what: 'the supporting line', key: 'discover.route.supporting', maxLines: 2 },
      { what: 'the cancel action', key: 'discover.route.cancel' },
      // `discover.route.turn.left` is deliberately absent: the frame's turn is to the right, so
      // the other direction is copy no rendered screen shows until a route turns left.
    ],
  },
  {
    name: '09 · Core picker · Active visit',
    path: '/active-visit',
    shell: true,
    anchor: 'discover.visit.eyebrow',
    copy: [
      { what: 'the eyebrow', key: 'discover.visit.eyebrow' },
      { what: 'the screen title', key: 'discover.visit.title', values: { zone: '14' } },
      { what: 'the arrival note title', key: 'discover.visit.arrived.title' },
      // The timer's reading and the arrival time in the note's body are the device's own clock,
      // so they cannot be written here; the large-text pass still holds them, because every
      // string on every screen is checked for being clipped or spilling out of its box.
      { what: 'the status label', key: 'discover.visit.status' },
      { what: 'the timer hint', key: 'discover.visit.timerHint' },
      // The frame lays the privacy line out over two lines (308x36, node 5:23230).
      { what: 'the privacy line', key: 'discover.visit.privacy', maxLines: 2 },
      { what: 'the pause action', key: 'discover.visit.pause' },
      { what: 'the end action', key: 'discover.visit.end' },
      // The frame lays the supporting line out over two lines (342x40, node 5:23238).
      { what: 'the supporting line', key: 'discover.visit.supporting', maxLines: 2 },
      // `discover.visit.resume` is deliberately absent: it is what the pause action turns into,
      // so no freshly rendered screen shows it and it has no line of the frame to hold it to.
    ],
  },
  {
    name: '10 · Core picker · Post-visit feedback',
    path: '/post-visit-feedback',
    shell: true,
    anchor: 'report.eyebrow',
    copy: [
      { what: 'the eyebrow', key: 'report.eyebrow' },
      { what: 'the screen title', key: 'report.title' },
      { what: 'the exit note title', key: 'report.exit.title' },
      // The frame prints the visit's own summary on one line (282x18, node 5:23277).
      {
        what: 'the exit note body',
        key: 'report.exit.body',
        values: { arrival: '10:03', departure: '10:55', minutes: '52', zone: '14' },
      },
      // The frame lays the heading out over two lines (342x78, node 5:23278).
      { what: 'the heading', key: 'report.heading', maxLines: 2 },
      // The frame lays the supporting line out over two lines (342x40, node 5:23279).
      { what: 'the supporting line', key: 'report.supporting', maxLines: 2 },
      { what: 'the first species chip', key: 'report.species.lingonberry' },
      { what: 'the second species chip', key: 'report.species.bilberry' },
      { what: 'the rating question', key: 'report.plentiful' },
      // The frame draws one word per cell, and its own “Fair” is a word that fits one line in a
      // 63 px cell. The Finnish for it (“Kohtalaisesti”) does not, and the cell is a floor it
      // grows from, so the words are held to the two lines a narrow cell can need (ADR-019).
      { what: 'the first rating word', key: 'report.rating.none', maxLines: 2 },
      { what: 'the third rating word', key: 'report.rating.fair', maxLines: 2 },
      { what: 'the fifth rating word', key: 'report.rating.lots', maxLines: 2 },
      { what: 'the amount label', key: 'report.amount.label' },
      { what: 'the offline note title', key: 'report.offline.title' },
      // The frame lays the offline note's body out over two lines (282x36, node 5:23319).
      { what: 'the offline note body', key: 'report.offline.body', maxLines: 2 },
      { what: 'the save action', key: 'report.save' },
      { what: 'the skip action', key: 'report.skip' },
      // `report.saveFailed` is deliberately absent: the design has no failure state, so it has
      // no line count to hold it to; the unit test is where it is asserted.
    ],
  },
  {
    name: '12 · Core picker · Alerts and forecast',
    path: '/alerts',
    shell: true,
    anchor: 'discover.alert.eyebrow',
    copy: [
      { what: 'the eyebrow', key: 'discover.alert.eyebrow' },
      { what: 'the screen title', key: 'discover.alert.title' },
      // The frame's own stamp line (272x17, node 5:23455); its day is a value the language writes.
      {
        what: 'the alert stamp',
        key: 'discover.alert.stamp',
        maxLines: 1,
        values: { date: { en: '28 Aug', fi: '28.8.' }, time: '09:30' },
      },
      // The frame's headline (306x68, node 5:23456) is set over two lines, and its distance is a
      // formatted value, so both forms are given here.
      {
        what: 'the alert headline',
        key: 'discover.alert.headline',
        maxLines: 2,
        values: { distance: { en: '1.8 km', fi: '1,8 km' } },
      },
      {
        what: 'the score chip',
        key: 'discover.alert.score',
        values: { max: '100', score: '82' },
      },
      { what: 'the confidence chip', key: 'discover.details.confidence.high' },
      // The frame draws this context line on one line (306x18, node 5:23462).
      {
        what: 'the alert’s zone line',
        key: 'discover.alert.context',
        maxLines: 1,
        values: { minutes: '60', place: 'Laajavuori', zone: '18' },
      },
      { what: 'the reasons heading', key: 'discover.alert.why' },
      // Each reason is a 15/21 title over a 13/18.2 line, both on one line in the frame
      // (308 px wide, nodes 5:23467-5:23479).
      { what: 'the first reason title', key: 'discover.alert.reason.warm.title', maxLines: 1 },
      { what: 'the first reason detail', key: 'discover.alert.reason.warm.detail', maxLines: 1 },
      { what: 'the second reason title', key: 'discover.alert.reason.rain.title', maxLines: 1 },
      { what: 'the second reason detail', key: 'discover.alert.reason.rain.detail', maxLines: 1 },
      { what: 'the third reason title', key: 'discover.alert.reason.picked.title', maxLines: 1 },
      { what: 'the third reason detail', key: 'discover.alert.reason.picked.detail', maxLines: 1 },
      // The frame's preferences card, drawn as the design's own sample (ADR-043). Its three values
      // are formatted rather than translated — the radius by `formatRadius` (the screen test holds
      // it) and the other two by the sentence keys below — and the sample line is the disclosure
      // that travels with them.
      { what: 'the preferences heading', key: 'discover.alert.preferences.title' },
      // Finnish needs two lines in the row's label column where the frame draws one (ADR-019).
      { what: 'the push setting', key: 'discover.alert.preferences.push', maxLines: 2 },
      { what: 'the radius setting', key: 'discover.alert.preferences.radius' },
      { what: 'the quiet-hours setting', key: 'discover.alert.preferences.quiet' },
      {
        what: 'the quiet-hours value',
        key: 'discover.alert.preferences.quietValue',
        maxLines: 1,
        values: { from: '21:00', to: '07:00' },
      },
      { what: 'the species setting', key: 'discover.alert.preferences.species' },
      {
        what: 'the species value',
        key: 'discover.alert.preferences.speciesValue',
        maxLines: 1,
        values: { count: '1', species: { key: 'report.species.bilberry' } },
      },
      // The app's own disclosure, not the frame's: the design draws no such line, so it carries the
      // lines its wording needs in the wider language — three, in both languages (measured
      // 2026-10-11 on a 304 px box).
      { what: 'the sample line', key: 'discover.alert.preferences.sample', maxLines: 3 },
      // The frame lays its disclaimer out over two lines (342x34, node 5:23509).
      { what: 'the forecast note', key: 'discover.alert.note', maxLines: 2 },
      // The frame's “View Zone 18” action is not registered: it is not drawn, and the unit test is
      // where its absence is asserted (PROJECT.md).
    ],
  },
  {
    name: '11 · Core picker · Visits and analytics',
    path: '/visits',
    shell: true,
    anchor: 'discover.season.eyebrow',
    copy: [
      // The frame's eyebrow carries the design's own disclosure that its season is a sample
      // month, the way frame 06's does about its map (PROJECT.md).
      { what: 'the eyebrow', key: 'discover.season.eyebrow' },
      { what: 'the screen title', key: 'discover.season.title' },
      { what: 'the selected period chip', key: 'discover.season.period.month' },
      { what: 'the other period chip', key: 'discover.season.period.all' },
      // The frame lays the summary line out on one line (306x20, node 5:23362).
      { what: 'the summary line', key: 'discover.season.summary', maxLines: 1 },
      // Each of the five figures is a value the screen formats; its label is the frame's copy,
      // drawn on one line in a 147 px or a 94 px column (nodes 5:23364-5:23380).
      { what: 'the harvest label', key: 'discover.season.metric.harvested', maxLines: 1 },
      { what: 'the rate label', key: 'discover.season.metric.rate', maxLines: 1 },
      { what: 'the zones label', key: 'discover.season.metric.zones', maxLines: 1 },
      { what: 'the stay label', key: 'discover.season.metric.stay', maxLines: 1 },
      { what: 'the median label', key: 'discover.season.metric.median', maxLines: 1 },
      { what: 'the chart title', key: 'discover.season.chart.title' },
      { what: 'the chart unit', key: 'discover.season.chart.unit' },
      { what: 'the history heading', key: 'discover.season.history.title' },
      // The line the chips' own choice is stated in — the period, then the visits it holds — drawn
      // on one line under the heading. The screen opens on “All visits” (ADR-043), which is where
      // the three rows the frame draws sit; the line about what a period leaves out is deliberately
      // absent here, because nothing is outside the period the page opens in (the screen test
      // enqueues a September visit, presses the month chip and measures that line).
      {
        what: 'the history count line',
        key: 'discover.season.history.shown.many',
        maxLines: 1,
        values: { count: '3', period: { key: 'discover.season.period.all' } },
      },
      // The frame's rows title themselves “Zone 14 · Lingonberry” (node 5:23403), and the two
      // statuses it draws are both on the screen: its newest row is queued, the rest synced.
      {
        what: 'a history row title',
        key: 'discover.season.row.title',
        values: { species: { key: 'report.species.lingonberry' }, zone: '14' },
      },
      { what: 'a queued status', key: 'discover.season.row.queued' },
      { what: 'a synced status', key: 'discover.season.row.synced' },
      // The frame lays its note out over two lines (342x34, node 5:23418).
      { what: 'the closing note', key: 'discover.season.note', maxLines: 2 },
      // `common.readFailed` is deliberately absent: the design has no failure state, so it has
      // no line count to hold it to; the unit tests are where it is asserted.
    ],
  },
  {
    // Frame 13 with a report on the phone, because that is the screen the design draws: the
    // frame's own visit — Zone 14, 28 Aug, 52 min, 1.3 kg, rated 4 of 5.
    name: '13 · Account and offline · Downloads',
    path: '/downloads',
    shell: true,
    anchor: 'offline.eyebrow',
    seed: {
      'picky.report-queue.v1': JSON.stringify([
        {
          amountText: '1.3 kg',
          minutes: 52,
          recordedAt: '2026-08-28T10:55:00.000Z',
          speciesId: 'lingonberry',
          yieldRating: 4,
          zoneId: 'Z14',
        },
      ]),
    },
    copy: [
      { what: 'the eyebrow', key: 'offline.eyebrow' },
      { what: 'the screen title', key: 'offline.title' },
      // The frame lays its heading out on one line (272x24, node 5:23581).
      {
        what: 'the waiting heading',
        key: 'offline.waiting.one',
        maxLines: 1,
        values: { count: '1' },
      },
      {
        what: 'the queued row title',
        key: 'offline.row.title',
        values: { species: { key: 'report.species.lingonberry' }, zone: '14' },
      },
      // The frame's own line: “28 Aug · 52 min · Yield 4 / 5 · 1.3 kg” (306x18, node 5:23583).
      // Its day is a value the app formats per language, so both forms are given here.
      {
        what: 'the queued row’s own line',
        key: 'offline.row.meta',
        maxLines: 1,
        values: {
          amount: '1.3 kg',
          date: { en: '28 Aug', fi: '28.8.' },
          max: '5',
          minutes: '52',
          yield: '4',
        },
      },
      { what: 'the queued chip', key: 'offline.row.chip' },
      // The frame lays its note out over two lines (306x34, node 5:23586).
      { what: 'the queue note', key: 'offline.note', maxLines: 2 },
      // The frame's downloaded region and everything that hangs off it, drawn as the design's own
      // sample since ADR-042 and labelled on the screen by the eyebrow above and this sentence
      // (the app's own words, so it carries the lines the wider language needs).
      { what: 'the sample disclosure', key: 'offline.sample.note', maxLines: 3 },
      // The frame's own card (node 5:23549): “Laajavuori region” on one line (232x25) and
      // “12 km² · 86 MB · Downloaded” on one (232x18).
      { what: 'the region’s name', key: 'offline.region.title', maxLines: 1 },
      {
        what: 'the region’s own line',
        key: 'offline.region.detail',
        maxLines: 1,
        values: { area: '12', size: '86' },
      },
      // The card's two rows, each one line in the frame (217x21 and 217x18, nodes 5:23559 and
      // 5:23560) with the frame's own value at the end (53x17, node 5:23562).
      {
        what: 'the tiles row',
        key: 'offline.tiles.title',
        maxLines: 1,
        values: { count: '24' },
      },
      { what: 'what the tiles are for', key: 'offline.tiles.detail', maxLines: 1 },
      { what: 'the rows’ value', key: 'offline.cached', maxLines: 1 },
      { what: 'the forecast row', key: 'offline.forecast.title', maxLines: 1 },
      {
        what: 'and when it was saved',
        key: 'offline.forecast.detail',
        maxLines: 1,
        values: { date: { en: '28 Aug', fi: '28.8.' }, time: '08:00' },
      },
      // The frame's own note under the card (306x17, node 5:23571).
      { what: 'the refresh note', key: 'offline.refresh.note', maxLines: 1 },
      // The storage block (nodes 5:23574 and 5:23575), both one line in the frame (165x20 each).
      { what: 'the storage label', key: 'offline.storage.label', maxLines: 1 },
      {
        what: 'and what is used of what there is',
        key: 'offline.storage.value',
        maxLines: 1,
        values: { total: '500', used: '86' },
      },
      // The frame's two actions (nodes 5:23587 and 5:23590), drawn without a role: their labels
      // are the frame's own words, one line each (83x19 and 224x19).
      { what: 'the retry action', key: 'offline.retry', maxLines: 1 },
      { what: 'the manage action', key: 'offline.manage', maxLines: 1 },
      // The frame's last line (342x20, node 5:23592).
      {
        what: 'the last-sync line',
        key: 'offline.lastSync',
        maxLines: 1,
        values: { date: { en: '28 Aug', fi: '28.8.' }, time: '08:12' },
      },
      // `offline.empty` is deliberately absent: the harness opens the screen the way the frame
      // draws it — holding a report — so the empty state is asserted in the unit test.
    ],
  },
  {
    // Frame 14, built almost to the end of what the app can be true about: the header, the
    // account row (from the session — see below), the “Use Picky as” card, the settings card with
    // the “Saved spots” row and its subtitle, the status message, and the frame's own group of
    // rows — visit tracking, sync, account & security, language and terms & privacy —
    // which the frame draws **outside a card** at the content column's width (node 5:23663), and
    // sign out. Two of those rows open screens the design never drew, measured by their own
    // entries below (“14c” and “14d”); the frame's **default spot visibility** block is the one
    // row not drawn, because its chips describe how *other people* see a spot (PROJECT.md).
    name: '14 · Account and offline · Privacy settings',
    path: '/privacy-settings',
    shell: true,
    anchor: 'privacy.eyebrow',
    // The frame draws its sync row holding one report (“1 queued”) and its saved-spots row
    // holding a plan (“4”), so the harness opens the screen with the report frame 13's entry
    // holds and a plan of the app's own three zones.
    seed: {
      'picky.report-queue.v1': JSON.stringify([
        {
          amountText: '1.3 kg',
          minutes: 52,
          recordedAt: '2026-08-28T10:55:00.000Z',
          speciesId: 'lingonberry',
          yieldRating: 4,
          zoneId: 'Z14',
        },
      ]),
      'picky.saved-zones.v1': JSON.stringify([
        { savedAt: '2026-08-26T09:00:00.000Z', zoneId: 'Z14' },
        { savedAt: '2026-08-27T09:00:00.000Z', zoneId: 'Z09' },
        { savedAt: '2026-08-28T09:00:00.000Z', zoneId: 'Z21' },
      ]),
    },
    copy: [
      { what: 'the eyebrow', key: 'privacy.eyebrow' },
      { what: 'the screen title', key: 'privacy.title' },
      // The frame's “Use Picky as” card, with its own note under the two chips (306x34, node
      // 5:23639), and the frame's “Saved spots” row beside the plan's own count.
      { what: 'the role card’s heading', key: 'privacy.useAs.title', maxLines: 1 },
      { what: 'the role the app has', key: 'privacy.useAs.picker', maxLines: 1 },
      { what: 'the role it does not', key: 'privacy.useAs.buyer', maxLines: 1 },
      { what: 'the role card’s note', key: 'privacy.useAs.note', maxLines: 2 },
      { what: 'the saved-spots row label', key: 'privacy.savedSpots.title', maxLines: 1 },
      // The frame's own subtitle under that label (306x18, node 5:23644), in the plural the
      // seed's three saved zones ask for.
      {
        what: 'the saved-spots row’s subtitle',
        key: 'privacy.savedSpots.subtitle.many',
        maxLines: 1,
        values: { count: '3' },
      },
      { what: 'the status message title', key: 'privacy.trailsNote.title' },
      // The frame lays the status message's body out over two lines (282x36, node 5:23662).
      { what: 'the status message body', key: 'privacy.trailsNote.body', maxLines: 2 },
      { what: 'the setting row label', key: 'privacy.visitTracking' },
      // The frame's own sync row and its value (“1 queued”, 244x21 and 62x17, nodes 5:23671 and
      // 5:23673), which is the row that opens frame 13.
      { what: 'the sync row label', key: 'privacy.sync.title', maxLines: 1 },
      {
        what: 'the sync row’s value',
        key: 'privacy.sync.value',
        maxLines: 1,
        values: { count: '1' },
      },
      // The frame's “Language” row and the language it names. The app follows the device's
      // language, so the value is the catalogue's own word for itself (ADR-017).
      { what: 'the language row label', key: 'privacy.language.title', maxLines: 1 },
      { what: 'the language row’s value', key: 'privacy.language.value', maxLines: 1 },
      // The frame's last control, centred over the column (342x20, node 5:23691).
      { what: 'the sign-out action', key: 'privacy.signOut', maxLines: 1 },
      // The account row's copy is deliberately absent: it is drawn from the session the app is
      // holding, and a session lives in the process rather than in the storage this harness can
      // seed (ADR-028) — a freshly loaded export holds none. `e2e/accessibility.spec.ts` walks the
      // sign-up and asserts the row there.
      // `privacy.saveFailed`, `privacy.account.readFailed` and `privacy.signOut.failed` are absent
      // for the same reason the other failure states are: the design has no failure state, so
      // there is no line count to hold them to; the unit tests are where they are asserted.
    ],
  },
  {
    // The picker's own saved plan (frame 14's “Saved spots” row, ADR-030). **The design never drew
    // this screen**, so there is no frame to take line counts from: every string below is the
    // app's own, and the run at the largest text size is what holds it to “nothing is lost”.
    name: '14b · Account and offline · Saved spots',
    path: '/saved-spots',
    shell: true,
    anchor: 'privacy.savedSpots.title',
    // The plan the settings screen's own entry holds, so the rows measured here are the ones that
    // screen counts. The empty state is the state the design never showed and the unit test keeps
    // (`saved-spots-screen.test.tsx`).
    //
    // **Mixed berries on purpose.** A row names the berry whose layer the bookmark was pressed on
    // (ADR-061), so a plan saved entirely under one berry measures only that berry's word — the
    // other language's word for it, and the other berry, would never be drawn. Laajavuori 1 is
    // saved under the pilot berry and Laajavuori 2 under lingonberry, which the source scores
    // differently (past / ripening, and 53 / 38); the third identifier is one no zone answers to,
    // which is the row the screen draws as a bare id.
    seed: {
      'picky.saved-zones.v1': JSON.stringify([
        {
          savedAt: '2026-08-26T09:00:00.000Z',
          speciesId: 'bilberry',
          zoneId: 'cc0e7929-de9f-516a-9049-7a25a1a6d092',
        },
        {
          savedAt: '2026-08-27T09:00:00.000Z',
          speciesId: 'lingonberry',
          zoneId: 'a2f83130-4d9a-5133-ba7e-83444d71e848',
        },
        {
          savedAt: '2026-08-28T09:00:00.000Z',
          speciesId: 'bilberry',
          zoneId: '55a2cccb-eca3-5455-885b-72ad2a0129c4',
        },
      ]),
    },
    copy: [
      { what: 'the eyebrow', key: 'privacy.savedSpots.eyebrow' },
      { what: 'the screen title', key: 'privacy.savedSpots.title' },
      // The rows are the source's own (`ZoneSourceRow`), resolved through the same port frame 06
      // reads since ADR-060, so their strings and values are the map's own zones — each read
      // through the berry its record holds, which is the half a single-berry plan cannot measure.
      {
        what: 'the plan row saved under the pilot berry',
        key: 'discover.card.zoneTitle',
        values: { species: { key: 'report.species.bilberry' }, zone: 'Laajavuori 1' },
      },
      {
        what: 'the plan row saved under lingonberry',
        key: 'discover.card.zoneTitle',
        values: { species: { key: 'report.species.lingonberry' }, zone: 'Laajavuori 2' },
      },
      { what: 'the pilot-berry row’s ripeness chip', key: 'discover.ripeness.past', maxLines: 1 },
      {
        what: 'the pilot-berry row’s yield chip',
        key: 'discover.list.yield',
        maxLines: 1,
        values: { max: '100', score: '53' },
      },
      {
        what: 'the lingonberry row’s ripeness chip',
        key: 'discover.ripeness.ripening',
        maxLines: 1,
      },
      {
        what: 'the lingonberry row’s yield chip',
        key: 'discover.list.yield',
        maxLines: 1,
        values: { max: '100', score: '38' },
      },
      // `privacy.savedSpots.empty`, `privacy.savedSpots.browse` and
      // `privacy.savedSpots.readFailed` are deliberately absent: the first two are the state a
      // seeded plan is not in, and the third is a failure the design never draws. The unit test is
      // where all three are asserted.
    ],
  },
  {
    // Frame 14's “Account & security” row (node 5:23677) and the screen behind it — **the design
    // never drew it** (ADR-039), so there is no frame to take line counts from: every string below
    // is the app's own, and the run at the largest text size is what holds it to “nothing is lost”.
    // No session can be seeded — it lives in the process rather than in storage (ADR-028) — so the
    // account row itself is absent here and the screen draws the line saying so; the row is
    // asserted in `e2e/accessibility.spec.ts` and in the screen's unit test.
    name: '14c · Account and offline · Account & security',
    path: '/account-security',
    shell: true,
    anchor: 'privacy.accountSecurity.title',
    copy: [
      { what: 'the eyebrow', key: 'privacy.accountSecurity.eyebrow' },
      { what: 'the screen title', key: 'privacy.accountSecurity.title' },
      // No frame draws any of this screen's copy, so each rule carries the lines the app's own
      // wording needs in the wider of the two languages (measured 2026-10-11) rather than the one
      // line a frame would draw: the check that still bites is the run at the largest text size.
      { what: 'what the screen is for', key: 'privacy.accountSecurity.intro', maxLines: 2 },
      {
        what: 'the line for a phone holding no session',
        key: 'privacy.accountSecurity.none',
        maxLines: 2,
      },
      { what: 'the code note’s title', key: 'privacy.accountSecurity.reach.title' },
      { what: 'the code note’s body', key: 'privacy.accountSecurity.reach.body', maxLines: 4 },
      { what: 'the session card’s heading', key: 'privacy.accountSecurity.session.title' },
      { what: 'where the session is kept', key: 'privacy.accountSecurity.session.where.label' },
      {
        what: 'and what that means',
        key: 'privacy.accountSecurity.session.where.hint',
        maxLines: 3,
      },
      { what: 'how long it lasts', key: 'privacy.accountSecurity.session.lifetime.label' },
      {
        what: 'and the hour it names',
        key: 'privacy.accountSecurity.session.lifetime.value',
        maxLines: 2,
      },
      { what: 'what ends it', key: 'privacy.accountSecurity.session.ends.label' },
      { what: 'and its value', key: 'privacy.accountSecurity.session.ends.value' },
      { what: 'the missing-parts heading', key: 'privacy.accountSecurity.absent.title' },
      {
        what: 'the service that is not there',
        key: 'privacy.accountSecurity.absent.service',
        maxLines: 4,
      },
      {
        what: 'the device list that is not there',
        key: 'privacy.accountSecurity.absent.devices',
        maxLines: 2,
      },
      {
        what: 'what signing out deletes',
        key: 'privacy.accountSecurity.signOut.note',
        maxLines: 3,
      },
      // The frame's own word for the control, reused from the settings screen it also lives on.
      { what: 'the sign-out action', key: 'privacy.signOut', maxLines: 1 },
      // `privacy.account.readFailed` and `privacy.signOut.failed` are absent for the reason the
      // other failure lines are: no frame draws them, and the unit test is where they are asserted.
    ],
  },
  {
    // Frame 14's “Terms & privacy” row (node 5:23688) and the screen behind it — **the design never
    // drew it** (ADR-039). Frame-less, so no line counts; what the run asserts is that every string
    // still renders at the largest text size.
    //
    // The phone is seeded with the three records a fresh export can hold — the consent, the plan
    // and the queued report — so the notice lists them rather than drawing its empty line (the
    // account record is the session, which cannot be seeded: ADR-028).
    name: '14d · Account and offline · Terms & privacy',
    path: '/terms-privacy',
    shell: true,
    anchor: 'privacy.termsPrivacy.title',
    seed: {
      'picky.privacy-consent.v2': JSON.stringify({
        visitTracking: false,
        decidedAt: '2026-10-09T08:00:00.000Z',
      }),
      'picky.report-queue.v1': JSON.stringify([
        {
          amountText: '1.3 kg',
          minutes: 52,
          recordedAt: '2026-08-28T10:55:00.000Z',
          speciesId: 'lingonberry',
          yieldRating: 4,
          zoneId: 'Z14',
        },
      ]),
      'picky.saved-zones.v1': JSON.stringify([
        { savedAt: '2026-08-26T09:00:00.000Z', zoneId: 'Z14' },
        { savedAt: '2026-08-27T09:00:00.000Z', zoneId: 'Z09' },
        { savedAt: '2026-08-28T09:00:00.000Z', zoneId: 'Z21' },
      ]),
    },
    copy: [
      { what: 'the eyebrow', key: 'privacy.termsPrivacy.eyebrow' },
      { what: 'the screen title', key: 'privacy.termsPrivacy.title' },
      // These lines are the app's own, so each rule carries the lines its wording needs in the
      // wider of the two languages (measured 2026-10-11) — there is no frame drawing one line to
      // hold them to, and the run at the largest text size is what still bites.
      { what: 'what the screen sets out', key: 'privacy.termsPrivacy.intro', maxLines: 2 },
      { what: 'the held-records heading', key: 'privacy.termsPrivacy.held.title' },
      { what: 'the consent record’s name', key: 'privacy.termsPrivacy.record.consent.label' },
      { what: 'what it is', key: 'privacy.termsPrivacy.record.consent.value', maxLines: 2 },
      { what: 'how it goes away', key: 'privacy.termsPrivacy.record.consent.hint', maxLines: 3 },
      { what: 'the plan record’s name', key: 'privacy.termsPrivacy.record.plan.label' },
      { what: 'what it is', key: 'privacy.termsPrivacy.record.plan.value' },
      { what: 'how it goes away', key: 'privacy.termsPrivacy.record.plan.hint', maxLines: 2 },
      { what: 'the queue record’s name', key: 'privacy.termsPrivacy.record.queue.label' },
      { what: 'what it is', key: 'privacy.termsPrivacy.record.queue.value', maxLines: 2 },
      { what: 'how it goes away', key: 'privacy.termsPrivacy.record.queue.hint', maxLines: 2 },
      { what: 'the rights heading', key: 'privacy.termsPrivacy.rights.title' },
      { what: 'seeing what is held', key: 'privacy.termsPrivacy.rights.see.value', maxLines: 5 },
      // The app's own wording, so the line count is what the wider language needs (measured): the
      // Finnish sentence naming where the copy is taken occupies four of the card's lines.
      { what: 'taking a copy', key: 'privacy.termsPrivacy.rights.copy.value', maxLines: 4 },
      { what: 'correcting it', key: 'privacy.termsPrivacy.rights.correct.value', maxLines: 4 },
      { what: 'deleting it', key: 'privacy.termsPrivacy.rights.delete.value', maxLines: 2 },
      { what: 'what the app sends', key: 'privacy.termsPrivacy.leaves.title' },
      { what: 'and where it goes', key: 'privacy.termsPrivacy.leaves.body', maxLines: 4 },
      // The way to the copy (ADR-040), whose label is the destination's own title — the same key
      // this screen's own manifest entry below measures as that screen's title.
      { what: 'the way to the copy', key: 'privacy.export.title', maxLines: 1 },
      { what: 'the notice card’s heading', key: 'privacy.termsPrivacy.notice.title' },
      {
        what: 'and what it says is still owed',
        key: 'privacy.termsPrivacy.notice.body',
        maxLines: 5,
      },
      // The account record's three strings and the empty line are absent on purpose: the harness
      // cannot seed a session (ADR-028), so a run that listed them would be asserting copy the
      // screen does not draw. Both are asserted in the screen's unit test.
    ],
  },
  {
    // The copy’s own screen — the export path open question 23 names as owed, and **a screen the
    // design never drew** (ADR-040). Frame-less, so no line counts to be held to; what the run
    // asserts is that every string still renders at the largest text size.
    //
    // The phone is seeded the way the notice's entry seeds it — the consent, the plan and the queued
    // report — so the contents card lists records rather than its empty line. The account record is
    // the session, which cannot be seeded (ADR-028), so neither it nor its label is listed here.
    name: '14e · Account and offline · Your data',
    path: '/your-data',
    shell: true,
    anchor: 'privacy.export.title',
    seed: {
      'picky.privacy-consent.v2': JSON.stringify({
        visitTracking: false,
        decidedAt: '2026-10-09T08:00:00.000Z',
      }),
      'picky.report-queue.v1': JSON.stringify([
        {
          amountText: '1.3 kg',
          minutes: 52,
          recordedAt: '2026-08-28T10:55:00.000Z',
          speciesId: 'lingonberry',
          yieldRating: 4,
          zoneId: 'Z14',
        },
      ]),
      'picky.saved-zones.v1': JSON.stringify([
        { savedAt: '2026-08-26T09:00:00.000Z', zoneId: 'Z14' },
        { savedAt: '2026-08-27T09:00:00.000Z', zoneId: 'Z09' },
        { savedAt: '2026-08-28T09:00:00.000Z', zoneId: 'Z21' },
      ]),
    },
    copy: [
      { what: 'the eyebrow', key: 'privacy.export.eyebrow' },
      { what: 'the screen title', key: 'privacy.export.title' },
      { what: 'what the screen sets out', key: 'privacy.export.intro', maxLines: 2 },
      { what: 'the contents heading', key: 'privacy.export.contents.title' },
      { what: 'the consent record’s name', key: 'privacy.termsPrivacy.record.consent.label' },
      { what: 'and the decision it carries', key: 'privacy.export.contents.consent.off' },
      { what: 'the plan record’s name', key: 'privacy.termsPrivacy.record.plan.label' },
      { what: 'the queue record’s name', key: 'privacy.termsPrivacy.record.queue.label' },
      { what: 'the file’s heading', key: 'privacy.export.format.title' },
      { what: 'and what the file is', key: 'privacy.export.format.body', maxLines: 5 },
      { what: 'the sheet’s heading', key: 'privacy.export.share.noteTitle' },
      { what: 'where the copy goes', key: 'privacy.export.share.note', maxLines: 3 },
      { what: 'the share action', key: 'privacy.export.share.label', maxLines: 1 },
      // The three outcome lines and the empty line are absent on purpose: the outcomes are drawn
      // after the action is used, and the harness never presses it (a press would open a share sheet
      // — or report that the browser has none, which is a state of the machine rather than of the
      // app). Each outcome, and the empty state, is asserted in the screen's unit test.
    ],
  },
  {
    // Frames 15–18, the planned marketplace. Its four screens are **outside the app shell**: the
    // frames label themselves “OUTSIDE CORE” and draw no navigation bar, so nothing of the shell's
    // is measured here (ADR-022).
    name: '15 · Planned marketplace · Browse',
    path: '/marketplace',
    anchor: 'market.eyebrow.browse',
    copy: [
      { what: 'the eyebrow', key: 'market.eyebrow.browse' },
      { what: 'the screen title', key: 'market.title.browse' },
      { what: 'the disclosure chip', key: 'market.disclosure' },
      { what: 'the mode line', key: 'market.browse.mode' },
      // The frame's three filter chips, one line each inside their 36 px pill (node 5:23801).
      { what: 'the first filter chip', key: 'market.filter.all', maxLines: 1 },
      { what: 'the second filter chip', key: 'market.filter.pickup', maxLines: 1 },
      { what: 'the third filter chip', key: 'market.filter.distance', maxLines: 1 },
      // A card's own lines (nodes 5:23811-5:23816): the title and the price share one 318 px row,
      // and the availability line and the seller line are one line each.
      { what: 'the first card’s price', key: 'market.card.price', values: { amount: '8' } },
      {
        what: 'the first card’s availability',
        key: 'market.card.available',
        maxLines: 1,
        values: { available: '20', place: 'Laajavuori, Jyväskylä' },
      },
      {
        what: 'the second card’s availability',
        key: 'market.card.availableAway',
        maxLines: 1,
        values: {
          available: '8',
          place: 'Palokka',
          // A formatted distance, so each language's own decimal mark is what is measured.
          distance: { en: '4.2 km', fi: '4,2 km' },
        },
      },
      {
        what: 'a card’s seller line',
        key: 'market.card.seller',
        maxLines: 1,
        values: { name: 'Matti Laine', rating: '4.9', reviews: '24' },
      },
      {
        what: 'the listing count',
        key: 'market.browse.count.many',
        values: { count: '2' },
      },
      // `market.browse.none` and `market.browse.count.one` are deliberately absent: the harness
      // opens the screen as the frame draws it — two listings and nothing typed — so the empty
      // answer and the singular are asserted in the unit tests.
    ],
  },
  {
    name: '16 · Planned marketplace · Listing detail',
    path: '/marketplace-listing',
    anchor: 'market.eyebrow.listing',
    copy: [
      { what: 'the eyebrow', key: 'market.eyebrow.listing' },
      { what: 'the disclosure chip', key: 'market.disclosure' },
      { what: 'the listing’s headline', key: 'market.listing.headline' },
      // The frame's own price slot beside the headline (node 5:23854).
      { what: 'the price per kilogram', key: 'market.listing.price', values: { amount: '8' } },
      {
        what: 'the stock line',
        key: 'market.listing.stock',
        values: { species: { key: 'report.species.bilberry' }, available: '20' },
      },
      // The frame lays the description out over two lines (342x40, node 5:23856).
      { what: 'the listing’s description', key: 'market.listing.blurb', maxLines: 2 },
      {
        what: 'the harvest date',
        key: 'market.listing.harvested',
        maxLines: 1,
        values: { date: { en: '28 August 2026', fi: '28.8.2026' } },
      },
      // The frame lays the pickup line out over two lines (272x40, node 5:23863).
      {
        what: 'the pickup line',
        key: 'market.listing.pickup',
        maxLines: 2,
        values: { place: 'Laajavuori car park', window: '17:00–19:00' },
      },
      { what: 'the delivery line', key: 'market.listing.delivery' },
      {
        what: 'the seller’s reputation',
        key: 'market.seller.meta',
        maxLines: 1,
        values: { rating: '4.9', reviews: '24' },
      },
      // The design's own word alone: the frame draws it 104 px wide inside a 165 px action, and the
      // seller's whole name goes in the action's accessible name instead (see the key's comment).
      { what: 'the contact action', key: 'market.listing.contact', maxLines: 1 },
      { what: 'the order action', key: 'market.listing.order' },
      // The frame lays the escrow note out over two lines (342x34, node 5:23879).
      { what: 'the escrow note', key: 'market.listing.escrow', maxLines: 2 },
    ],
  },
  {
    name: '17 · Planned marketplace · Seller chat',
    path: '/marketplace-chat',
    anchor: 'market.eyebrow.chat',
    copy: [
      { what: 'the eyebrow', key: 'market.eyebrow.chat' },
      { what: 'the disclosure chip', key: 'market.disclosure' },
      { what: 'the seller’s badge', key: 'market.seller.badge' },
      {
        what: 'the thread’s listing',
        key: 'market.chat.listing',
        maxLines: 1,
        // The price is the unit price the screen formats, and Finnish writes it the other way round
        // (screen 16 measures the same figure); a value written once would look for the wrong line.
        values: { name: 'Fresh blueberries', price: { en: '€8/kg', fi: '8 €/kg' } },
      },
      {
        what: 'the thread’s listing line',
        key: 'market.chat.listingMeta',
        maxLines: 1,
        values: { available: '20', place: 'Laajavuori' },
      },
      {
        what: 'the thread’s stamp',
        key: 'market.chat.stamp',
        maxLines: 1,
        values: { date: { en: '28 August 2026', fi: '28.8.2026' } },
      },
      // The design's own four messages: two lines, two lines, one and three inside the frame's
      // 280 px bubble (nodes 5:23910-5:23923).
      { what: 'the first message', key: 'market.chat.ask', maxLines: 3 },
      { what: 'the second message', key: 'market.chat.reply', maxLines: 3 },
      { what: 'the third message', key: 'market.chat.confirm', maxLines: 2 },
      { what: 'the fourth message', key: 'market.chat.pack', maxLines: 3 },
      // `market.chat.read` is deliberately absent: the frame sets the receipt inside the timestamp
      // line itself (“14:02 · Read”, node `5:23912`) rather than as a slot of its own, so there is no
      // single string to hold to a line count. The unit test is where the receipt is asserted.
      {
        what: 'the order summary action',
        key: 'market.chat.summary',
        maxLines: 1,
        values: { total: '40' },
      },
      { what: 'the composer’s own line', key: 'market.chat.composer', maxLines: 1 },
    ],
  },
  {
    name: '18 · Planned marketplace · Checkout and order status',
    path: '/marketplace-order',
    anchor: 'market.eyebrow.order',
    copy: [
      { what: 'the eyebrow', key: 'market.eyebrow.order' },
      { what: 'the screen title', key: 'market.order.title' },
      { what: 'the disclosure chip', key: 'market.disclosure' },
      { what: 'the test-mode chip', key: 'market.order.testMode' },
      { what: 'the status message’s title', key: 'market.order.confirmed.title' },
      // The frame lays the status message's body out over two lines (282x36, node 5:23958).
      { what: 'the status message’s body', key: 'market.order.confirmed.body', maxLines: 2 },
      {
        what: 'the order’s seller line',
        key: 'market.order.by',
        maxLines: 1,
        values: { seller: 'Matti Laine', date: { en: '28 August 2026', fi: '28.8.2026' } },
      },
      {
        what: 'the order’s own line',
        key: 'market.order.line',
        maxLines: 1,
        // The unit is the listing's own price per kilogram, which Finnish writes with the symbol
        // after the figure — the same value the listing screen measures (ADR-017).
        values: { kilograms: '5', unit: { en: '€8/kg', fi: '8 €/kg' } },
      },
      { what: 'the delivery line', key: 'market.order.delivery', maxLines: 1 },
      { what: 'the total’s label', key: 'market.order.total', maxLines: 1 },
      {
        what: 'a figure with its own symbol',
        key: 'market.price.symbol',
        maxLines: 1,
        values: { amount: '40' },
      },
      {
        what: 'the pickup row’s title',
        key: 'market.order.pickup.title',
        maxLines: 1,
        values: { name: 'Matti Laine' },
      },
      // The frame lays the pickup row's own line out over two lines (308x36, node 5:23978).
      {
        what: 'the pickup row’s line',
        key: 'market.order.pickup.meta',
        maxLines: 2,
        values: {
          date: { en: '28 Aug', fi: '28.8.' },
          time: '18:30',
          place: 'Laajavuori car park',
          town: 'Jyväskylä',
        },
      },
      { what: 'the confirmed status', key: 'market.order.status.confirmed', maxLines: 1 },
      { what: 'the waiting status', key: 'market.order.status.waiting', maxLines: 1 },
      // The frame lays both halves of its hold message out over two lines each (282x79,
      // node 5:23987).
      { what: 'the hold message’s title', key: 'market.order.hold.title', maxLines: 2 },
      {
        what: 'the hold message’s body',
        key: 'market.order.hold.body',
        maxLines: 2,
        values: { name: 'Matti Laine' },
      },
      {
        what: 'the message action',
        key: 'market.order.message',
        maxLines: 1,
        values: { name: 'Matti Laine' },
      },
      // The frame lays its dispute note out over two lines (342x34, node 5:23998).
      { what: 'the dispute note', key: 'market.order.disputeNote', maxLines: 2 },
      // `market.order.confirm` and `market.order.dispute` do not exist: neither action is drawn,
      // because no provider holds the payment they would release or freeze (PROJECT.md).
    ],
  },
  {
    name: 'Not found',
    // The export writes this screen to `+not-found.html` and the static server answers
    // an unknown path with a 404 body of its own (no app in it), so the harness enters
    // through the exported route. It is the same screen a bad deep link renders.
    path: '/+not-found',
    anchor: 'app.notFound.title',
    // No frame exists for this screen, so only the header's title slot and the action
    // are held to one line — the two slots every frame draws on one line. The subtitle
    // is a sentence in a body slot and may reflow.
    copy: [
      { what: 'the screen title', key: 'app.notFound.title' },
      { what: 'the action', key: 'app.notFound.action' },
    ],
  },
];

/** Each screen is opened in its own context: language, viewport and colour scheme are
 *  properties of the browser, which is how the app receives them from a device. */
async function openScreen(browser: Browser, screen: Screen, locale: Locale) {
  const context = await browser.newContext({
    colorScheme: 'light',
    locale: locale.tag,
    viewport: FRAME_VIEWPORT,
  });
  const page = await context.newPage();

  if (screen.seed) {
    await page.addInitScript((entries: Record<string, string>) => {
      for (const [key, value] of Object.entries(entries)) window.localStorage.setItem(key, value);
    }, screen.seed);
  }

  await page.goto(screen.path);

  return { context, page };
}

/**
 * Waits for the locale's own copy to appear.
 *
 * The exported page is prerendered in the source language and only becomes Finnish once
 * the app hydrates, so this wait is what makes the measurement below a measurement of
 * *this* language: without it, a broken locale path would measure English on a Finnish
 * device and pass.
 */
async function waitForLocale(page: Page, screen: Screen, locale: Locale): Promise<string | null> {
  const anchor = locale.catalogue[screen.anchor];

  try {
    await page
      .getByText(anchor, { exact: true })
      .first()
      .waitFor({ state: 'visible', timeout: RENDER_TIMEOUT_MS });
    return null;
  } catch {
    return `${locale.name} never applied: “${anchor}” did not appear, so the page stayed in the source language`;
  }
}

/**
 * The whole-page checks: nothing may extend past the viewport horizontally or exceed the
 * box the app gave it. At a scaled text size the emulation is re-applied first, so an
 * element that a re-render put back to the design's type is still measured at scale (§
 * `applyFontScale` is idempotent).
 */
async function pageProblems(page: Page, locale: Locale, fontScale = 1): Promise<string[]> {
  if (fontScale > 1) await applyFontScale(page, fontScale);

  const overflow = await findPageOverflow(page);
  const problems: string[] = [];

  if (overflow.scrollsHorizontally) {
    problems.push(
      `${locale.name}: the screen scrolls sideways — ${overflow.documentWidth} px of content in a ${overflow.viewportWidth} px viewport`,
    );
  }
  problems.push(...overflow.clipped.map((entry) => `${locale.name}: ${entry}`));

  return problems;
}

/** The copy as the screen renders it: the catalogue's sentence with its placeholders filled. */
function copyOf(rule: CopyRule, locale: Locale): string {
  const values = Object.fromEntries(
    Object.entries(rule.values ?? {}).map(([name, value]) => [
      name,
      typeof value === 'string'
        ? value
        : 'key' in value
          ? locale.catalogue[value.key]
          : value[locale.code],
    ]),
  );

  return interpolate(locale.catalogue[rule.key], values);
}

/** Every string against the number of lines its frame draws — the design's measurement. */
async function designProblems(page: Page, screen: Screen, locale: Locale): Promise<string[]> {
  const problems: string[] = [];

  for (const rule of copyRulesOf(screen)) {
    const text = copyOf(rule, locale);
    const maxLines = rule.maxLines ?? 1;
    const measurements = await measureCopy(page, text);

    if (measurements.length === 0) {
      problems.push(
        `${rule.what}: “${text}” is not on the screen any more — the ${locale.name} copy for ${rule.key} is not rendered here`,
      );
      continue;
    }

    for (const measurement of measurements) {
      if (measurement.lines > maxLines) {
        problems.push(
          `${rule.what} (${locale.name}): “${text}” occupies ${measurement.lines} lines where the design draws ${maxLines} (box ${measurement.width}×${measurement.height} px)`,
        );
      }
      if (measurement.clipped) {
        problems.push(`${rule.what} (${locale.name}): “${text}” is cut off horizontally`);
      }
    }
  }

  return problems;
}

/**
 * The same strings at the largest text size a platform setting can ask for, where the
 * frame's line counts no longer apply: every string must still render, and none may be
 * cut off. This is what a screen that “fits” by hiding or truncating its copy fails.
 */
async function largestTextSizeProblems(
  page: Page,
  screen: Screen,
  locale: Locale,
): Promise<string[]> {
  const problems: string[] = [];
  const scaled = await applyFontScale(page, LARGEST_FONT_SCALE);

  // Without this the test would pass by measuring the design's text size and calling it
  // 200 %: the emulation doing nothing has to be a failure, not a green run.
  if (scaled === 0) {
    problems.push(
      `${locale.name}: the text-size setting could not be applied — no element on the screen renders text`,
    );
  }

  for (const rule of copyRulesOf(screen)) {
    const text = copyOf(rule, locale);
    const measurements = await measureCopy(page, text);

    if (measurements.length === 0) {
      problems.push(
        `${rule.what}: “${text}” is not on the screen at ${LARGEST_FONT_SCALE * 100} % — the ${locale.name} copy for ${rule.key} was dropped rather than reflowed`,
      );
      continue;
    }

    for (const measurement of measurements) {
      if (measurement.clipped) {
        problems.push(
          `${rule.what} (${locale.name}): “${text}” is cut off horizontally at ${LARGEST_FONT_SCALE * 100} %`,
        );
      }
    }
  }

  return problems;
}

/**
 * The prototypes' readings are measured in English: their copy is literal English by design, so a
 * Finnish run would be looking for copy the reading does not have. Naming that here — rather than
 * filtering a loop inline — is what keeps “measured in one language” a decision instead of a hole.
 */
const PROTOTYPE_LOCALE = LOCALES[0]!;

/** Opens a prototype reading the way a reviewer does: its own URL, at the frame's width. */
async function openPrototypeReading(browser: Browser, reading: PrototypeReading) {
  const context = await browser.newContext({
    colorScheme: 'light',
    locale: PROTOTYPE_LOCALE.tag,
    viewport: FRAME_VIEWPORT,
  });
  const page = await context.newPage();

  await page.goto(reading.url);

  // Ready means the reading has mounted, not that the static shell answered. A cold runner (CI)
  // finishes `goto` before React has drawn the bar, so measuring straight away found nothing on
  // every reading at the design's text size while the 200 % reading — which spends one more
  // evaluation before it measures — passed: the bar was there by then (found in CI, 2026-10-21).
  // This is the same readiness the screens' path waits for (`waitForLocale`), not a retry: a
  // reading that never mounts still fails, on `prototypeProblems`' own readable message below.
  await page
    .getByText(reading.bar, { exact: true })
    .first()
    .waitFor({ state: 'visible', timeout: 5_000 })
    .catch(() => undefined);

  return { context, page };
}

/**
 * What the reading must show at one text size: the bar's own line — derived from the prototype's
 * variant table, so it proves *this* reading mounted rather than the app's own screen behind the
 * parameter — then every string the harness declares for it, none clipped, and nothing spilling out
 * of the box the app gave it.
 */
async function prototypeProblems(
  page: Page,
  reading: PrototypeReading,
  fontScale: number,
): Promise<string[]> {
  if (fontScale > 1) await applyFontScale(page, fontScale);

  const problems: string[] = [];
  const at = fontScale > 1 ? ` at ${fontScale * 100} %` : '';

  for (const [index, text] of [reading.bar, ...reading.copy].entries()) {
    const measurements = await measureCopy(page, text);
    const what = index === 0 ? 'the bar’s own line' : 'the reading’s own copy';

    if (measurements.length === 0) {
      problems.push(
        `${what}: “${text}” is not on ${reading.url}${at} — the reading is not drawn, or its wording moved`,
      );
      continue;
    }

    for (const measurement of measurements) {
      if (measurement.clipped) {
        problems.push(`${what}: “${text}” is cut off horizontally${at}`);
      }
    }
  }

  return [...problems, ...(await pageProblems(page, PROTOTYPE_LOCALE, fontScale))];
}

/** A failure attaches the screen it measured, so the report shows the break it describes. */
async function report(
  testInfo: TestInfo,
  label: string,
  page: Page,
  problems: string[],
): Promise<void> {
  if (problems.length > 0) {
    await testInfo.attach(label, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
  }

  expect(problems).toEqual([]);
}

/**
 * The review-only prototype surfaces, measured like a screen and for the same reason.
 *
 * They are the paper a designer judges by flipping between readings, and nothing was measuring them:
 * their copy is **literal English by design** — a prototype's wording is not a translation anyone
 * should review — so the manifest above (which is built from catalogue keys) could not reach them,
 * and a shipped build does not mount them at all. A reading whose sentence is clipped at 200 %, or
 * whose bar is missing, was therefore only ever noticed by whoever happened to open it.
 *
 * What is asserted: every string the harness declares for the reading is still on the screen, none
 * is cut off, and nothing spills out of the box the app gave it — at the design's own text size and
 * at the largest one a platform setting can ask for (ADR-019). What is deliberately **not**
 * asserted: a line count, because no frame draws these screens, and the strings' length, because a
 * prototype is allowed to be reworded by whoever owns the question — the harness declares what it
 * expects to see, and a reworded reading is a one-line update here rather than a silent gap.
 *
 * English only, and that is a decision rather than an omission: a reading has no Finnish to measure.
 */
for (const reading of PROTOTYPE_READINGS) {
  test.describe(`prototype · ${reading.bar}`, () => {
    test('shows every string the harness declares, with none of it clipped', async ({
      browser,
    }, testInfo) => {
      const { context, page } = await openPrototypeReading(browser, reading);

      try {
        const problems = await prototypeProblems(page, reading, 1);

        await report(testInfo, `${reading.bar} at the design’s text size`, page, problems);
      } finally {
        await context.close();
      }
    });

    test('keeps every string visible at the largest system text size', async ({
      browser,
    }, testInfo) => {
      const { context, page } = await openPrototypeReading(browser, reading);

      try {
        const problems = await prototypeProblems(page, reading, LARGEST_FONT_SCALE);

        await report(testInfo, `${reading.bar} at ${LARGEST_FONT_SCALE * 100} %`, page, problems);
      } finally {
        await context.close();
      }
    });
  });
}

for (const screen of SCREENS) {
  test.describe(screen.name, () => {
    for (const locale of LOCALES) {
      test(`shows no wrapped or clipped copy in ${locale.name}`, async ({ browser }, testInfo) => {
        const { context, page } = await openScreen(browser, screen, locale);

        try {
          const localeProblem = await waitForLocale(page, screen, locale);
          const problems = localeProblem
            ? [localeProblem]
            : [
                ...(await designProblems(page, screen, locale)),
                ...(await pageProblems(page, locale)),
              ];

          await report(testInfo, `${screen.name} in ${locale.name}`, page, problems);
        } finally {
          await context.close();
        }
      });

      test(`keeps every string visible at the largest system text size in ${locale.name}`, async ({
        browser,
      }, testInfo) => {
        const { context, page } = await openScreen(browser, screen, locale);

        try {
          const localeProblem = await waitForLocale(page, screen, locale);
          const problems = localeProblem
            ? [localeProblem]
            : [
                ...(await largestTextSizeProblems(page, screen, locale)),
                ...(await pageProblems(page, locale, LARGEST_FONT_SCALE)),
              ];

          await report(
            testInfo,
            `${screen.name} in ${locale.name} at ${LARGEST_FONT_SCALE * 100} %`,
            page,
            problems,
          );
        } finally {
          await context.close();
        }
      });
    }
  });
}
