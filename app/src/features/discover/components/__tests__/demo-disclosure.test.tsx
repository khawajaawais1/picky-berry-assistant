/// <reference types="node" />
// Node's file APIs, for reading the screens' own source rather than trusting a hand-kept list.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { OfflineSyncScreen } from '@/features/offline';
import {
  MarketBrowseScreen,
  MarketChatScreen,
  MarketListingScreen,
  MarketOrderScreen,
} from '@/features/marketplace';
import { getCatalogue, SUPPORTED_LOCALES, type Locale, type TranslationKey } from '@/services/i18n';
import { QueryProvider } from '@/services/query-client';

// eslint-disable-next-line import/first
import { ActiveVisitScreen } from '../active-visit-screen';
// eslint-disable-next-line import/first
import { AlertsScreen } from '../alerts-screen';
// eslint-disable-next-line import/first
import { DiscoverScreen } from '../discover-screen';
// eslint-disable-next-line import/first
import { PostVisitFeedbackScreen } from '../post-visit-feedback-screen';
// eslint-disable-next-line import/first
import { RouteToZoneScreen } from '../route-to-zone-screen';
// eslint-disable-next-line import/first
// eslint-disable-next-line import/first
import { SeasonInsightsScreen } from '../season-insights-screen';
// eslint-disable-next-line import/first
import { ZoneDetailsScreen } from '../zone-details-screen';
// eslint-disable-next-line import/first
import { ZoneReportsScreen } from '../zone-reports-screen';

/**
 * The rule this guards: **a screen that draws the design's sample names the demo on itself.**
 *
 * *(2026-10-10: the sample check follows one more hop — a screen is also judged by the domain
 * modules of its own feature that it imports, because the saved plan's rows were then the
 * picker's record mapped onto the design's zones by `saved-spots.ts`. 2026-10-24: that module
 * reads the zone source instead (ADR-060), so the plan left the demo list below; the hop stays,
 * because the next screen may reach the sample the same indirect way.)*
 *
 * It exists because the disclosure drifted once. Five screens — 07's yield card, 08's walk, 09's
 * running timer, 10's exit summary and 12's alert — drew the design's own composition with nothing
 * on the screen saying so, while 06's map, 11's season and all four marketplace frames said it in
 * their own words. Nothing failed: each screen's own test asserted the figures it drew, and the
 * absence of a disclosure is not a figure. The audit that found it is
 * [docs/demo-and-stand-ins.md](../../../../../docs/demo-and-stand-ins.md) (finding F2); this file is
 * the part that does not depend on someone reading that document again.
 *
 * Three things are asserted, and together they close the loop:
 *
 * 1. **Every screen the app has is classified.** The list of screens is not kept here: the files
 *    under `src/features/*\/components/` are read from disk, and each must appear in one of two
 *    lists below. A new screen fails this test until someone decides whether it draws the design's
 *    sample — which is the decision that was skipped last time.
 * 2. **The classification is true of the file.** A screen listed as drawing the sample must
 *    reference a `DEMO_*` value or render the two components that fall back to it (`ZoneMap`,
 *    `ZoneCard`, both of which draw the demo zones when a caller gives them nothing); a screen
 *    listed as drawing none must do neither. A stale entry fails in both directions.
 * 3. **The disclosure is real, and in every language.** Each demo screen is rendered and must show
 *    the phrase its own catalogue key carries, and that key's Finnish string must carry the Finnish
 *    phrase too — a disclosure that exists only in English is one half the users never see.
 *
 * What it does **not** decide: whether a screen *should* be drawing the design's sample. That is a
 * product question, answered in PROJECT.md's known issues, and this file only refuses to let the
 * answer go unsaid on the screen. It also does not judge an illustration: frame 05's zone-map
 * preview and frame 07's season photograph are exported images, decoration rather than figures the
 * app presents as its own knowledge, and neither is a disclosure case.
 *
 * Why it lives here: what it walks is screens, and seven of the eleven are this feature's. The four
 * marketplace screens are reached through that feature's public API, which is the only cross-feature
 * import this repository allows.
 */
const ROOT = join(__dirname, '..', '..', '..', '..', '..');

type DemoScreen = {
  /** The screen's file, relative to the repository root — the form the scan below produces. */
  file: string;
  /** The catalogue key whose string tells the reader the figures are the design's own sample. */
  disclosure: TranslationKey;
  /** The screen itself. Every one of these renders with no props, as its own test renders it. */
  draw: () => ReactElement;
};

/** The screens that draw the design's sample, and the key each one discloses it with. */
const DEMO_SCREENS: readonly DemoScreen[] = [
  {
    file: 'src/features/discover/components/discover-screen.tsx',
    disclosure: 'discover.eyebrow',
    draw: () => <DiscoverScreen />,
  },
  {
    file: 'src/features/discover/components/zone-details-screen.tsx',
    disclosure: 'discover.details.eyebrow',
    draw: () => <ZoneDetailsScreen />,
  },
  {
    file: 'src/features/discover/components/route-to-zone-screen.tsx',
    disclosure: 'discover.route.eyebrow',
    draw: () => <RouteToZoneScreen />,
  },
  {
    file: 'src/features/discover/components/active-visit-screen.tsx',
    disclosure: 'discover.visit.eyebrow',
    draw: () => <ActiveVisitScreen />,
  },
  {
    file: 'src/features/discover/components/post-visit-feedback-screen.tsx',
    disclosure: 'report.eyebrow',
    draw: () => <PostVisitFeedbackScreen />,
  },
  {
    file: 'src/features/discover/components/season-insights-screen.tsx',
    disclosure: 'discover.season.eyebrow',
    draw: () => <SeasonInsightsScreen />,
  },
  {
    file: 'src/features/discover/components/alerts-screen.tsx',
    disclosure: 'discover.alert.eyebrow',
    draw: () => <AlertsScreen />,
  },
  {
    // The list behind frame 07's “See all 11” (ADR-044): the rows on it are the picker's own
    // queued reports, but the zone it is about and the week it counts are the design's own
    // composition — so it carries the season-demo disclosure, like the plan's list above.
    file: 'src/features/discover/components/zone-reports-screen.tsx',
    disclosure: 'discover.zoneReports.eyebrow',
    draw: () => <ZoneReportsScreen />,
  },
  {
    // The queue above it is the picker's own record; the downloaded region, its tiles, forecast,
    // storage meter, two actions and sync line below it are the design's composition, drawn as the
    // design's sample since ADR-042 — and the eyebrow says so, as frame 06's map and frame 11's
    // season screen do.
    file: 'src/features/offline/components/offline-sync-screen.tsx',
    disclosure: 'offline.eyebrow',
    draw: () => <OfflineSyncScreen />,
  },
  {
    file: 'src/features/marketplace/components/market-browse-screen.tsx',
    disclosure: 'market.disclosure',
    draw: () => <MarketBrowseScreen />,
  },
  {
    file: 'src/features/marketplace/components/market-listing-screen.tsx',
    disclosure: 'market.disclosure',
    draw: () => <MarketListingScreen />,
  },
  {
    file: 'src/features/marketplace/components/market-chat-screen.tsx',
    disclosure: 'market.disclosure',
    draw: () => <MarketChatScreen />,
  },
  {
    file: 'src/features/marketplace/components/market-order-screen.tsx',
    disclosure: 'market.disclosure',
    draw: () => <MarketOrderScreen />,
  },
];

/**
 * The screens that draw none of the design's sample — the other half of the decision the lists
 * make. They are three groups: onboarding (a hero, a form and a consent screen, plus the sign-in
 * screen the design never drew), the account surface (the picker's own settings, the
 * screens behind frame 14's app-drawn rows — ADR-039 — and the copy those records are taken on,
 * ADR-040; all of them state what the device holds rather than any figure of the design's), and
 * nothing else.
 *
 * Frame 13's sync centre used to sit in this list too. It moved when ADR-042 put the design's own
 * region, storage figures and two actions on it: what it states about the phone (the queue) is
 * still the picker's, but the block below it is the design's composition and belongs with the
 * screens that say so.
 */
const SAMPLE_FREE_SCREENS: readonly string[] = [
  'src/features/onboarding/components/create-account-screen.tsx',
  'src/features/onboarding/components/forgot-password-screen.tsx',
  'src/features/onboarding/components/location-consent-screen.tsx',
  'src/features/onboarding/components/sign-in-screen.tsx',
  'src/features/onboarding/components/welcome-screen.tsx',
  'src/features/privacy/components/account-security-screen.tsx',
  'src/features/privacy/components/privacy-settings-screen.tsx',
  'src/features/privacy/components/terms-privacy-screen.tsx',
  // The export surface (ADR-040): it lists the phone's own records as the notice does, so it draws
  // none of the design's sample either.
  'src/features/privacy/components/your-data-screen.tsx',
  // The saved plan reads the zone source (ADR-060): every row is a source zone, and a saved id
  // the source no longer answers to is printed as the id alone — no design sample is drawn.
  'src/features/discover/components/saved-spots-screen.tsx',
  // The watch field test (ADR-063) is a tester's instrument, not a screen of the design: it draws
  // readings from the real seam and the phone's own battery, and none of the design's sample.
  'src/features/field-test/components/field-test-screen.tsx',
].sort();

/**
 * What each language says when it names the design's own composition. The two are the app's whole
 * disclosure vocabulary: frame 06's map says “SEASON DEMO” (Finnish “KAUSIDEMO”) and the
 * marketplace's four frames say “Planned extra” (“Suunniteltu lisäosa”). A third phrase, or a
 * reworded one, belongs in this list — otherwise this test would pass while a screen said nothing.
 */
const DISCLOSURE: Record<Locale, readonly string[]> = {
  en: ['SEASON DEMO', 'Planned extra'],
  fi: ['KAUSIDEMO', 'Suunniteltu lisäosa'],
};

function disclosurePattern(locale: Locale): RegExp {
  return new RegExp(DISCLOSURE[locale].join('|'));
}

/** Every `*-screen.tsx` under `src/features`, as the root-relative path the two lists use. */
function screenFiles(): string[] {
  const features = join(ROOT, 'src', 'features');

  if (!existsSync(features)) {
    // A wrong ROOT would otherwise read as “no screens”, which is a passing test that checks
    // nothing — the one failure mode a guard must not have.
    throw new Error(`no features directory at ${features}: this file's repository root is wrong`);
  }

  return readdirSync(features, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const components = join(features, entry.name, 'components');

      if (!existsSync(components)) {
        return [];
      }

      return readdirSync(components)
        .filter((name) => name.endsWith('-screen.tsx'))
        .map((name) => `src/features/${entry.name}/components/${name}`);
    })
    .sort();
}

/**
 * Whether a screen reaches for the design's sample: directly, through a component that falls back
 * to the demo zones (`ZoneMap`, `ZoneCard`), or through one of the domain modules of its own
 * feature — the path the saved plan took until it read the zone source (ADR-060).
 */
function drawsTheSample(file: string): boolean {
  const text = readFileSync(join(ROOT, file), 'utf8');

  if (/\bDEMO_[A-Z_]+\b/.test(text) || /\b(ZoneMap|ZoneCard)\b/.test(text)) {
    return true;
  }

  const domain = join(dirname(join(ROOT, file)), '..', 'domain');

  if (!existsSync(domain)) {
    return false;
  }

  return [...text.matchAll(/from '\.\.\/domain\/([a-z-]+)'/g)].some(([, name]) => {
    const module = join(domain, `${name}.ts`);

    return existsSync(module) && /\bDEMO_[A-Z_]+\b/.test(readFileSync(module, 'utf8'));
  });
}

describe('the demo disclosure', () => {
  it('classifies every screen the app has, and is true of the file it names', () => {
    const classified = [...DEMO_SCREENS.map((entry) => entry.file), ...SAMPLE_FREE_SCREENS].sort();
    const onDisk = screenFiles();

    // Labelled with the remedy, not just the file: an unclassified screen is the case this test
    // exists for, and the next reader has to know which list to put it in.
    const misclassified = [
      ...onDisk
        .filter((file) => !classified.includes(file))
        .map(
          (file) =>
            `unclassified — add it to DEMO_SCREENS with the key its disclosure uses, or to SAMPLE_FREE_SCREENS: ${file}`,
        ),
      ...classified
        .filter((file) => !onDisk.includes(file))
        .map((file) => `in a list but not on disk — remove it: ${file}`),
    ];

    expect(misclassified).toEqual([]);

    // Named rather than counted, so a failure says which screen and which way it is wrong: a
    // screen drawing the sample without saying so is the defect this file exists for, and a
    // screen that has stopped drawing it is a stale claim about a file that changed.
    const wrong = [
      ...DEMO_SCREENS.filter((entry) => !drawsTheSample(entry.file)).map(
        (entry) => `listed as drawing the design's sample but draws none: ${entry.file}`,
      ),
      ...SAMPLE_FREE_SCREENS.filter(drawsTheSample).map(
        (file) => `listed as drawing none of it but draws the sample: ${file}`,
      ),
    ];

    expect(wrong).toEqual([]);
  });

  describe.each(DEMO_SCREENS)('$file', ({ disclosure, draw }) => {
    it('names the demo on the screen it draws', async () => {
      await render(draw(), { wrapper: QueryProvider });

      expect(screen.queryAllByText(disclosurePattern('en')).length).toBeGreaterThan(0);
    });

    it.each(SUPPORTED_LOCALES)('names it in %s too, not only in English', (locale) => {
      expect(getCatalogue(locale)[disclosure]).toMatch(disclosurePattern(locale));
    });
  });
});
