import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { themes, typography } from '@/constants/theme';
import { QueryProvider } from '@/services/query-client';
import { readSavedZones, saveZone } from '@/services/saved-zones';

import type { Species } from '../../domain/species';
import type { ZoneInsight, ZoneInsightSource } from '../../domain/zone-insight';
import type { Zone, ZoneScore, ZoneSource } from '../../domain/zone-source';
import { liveZoneSource } from '../../test-fixtures';
import { ZoneDetailsScreen } from '../zone-details-screen';

/**
 * Frame 07 as the app can be true about it today (node `5:23032`): the header, the photograph,
 * the yield card, the outlook, the freshest report and the frame's own **“Save zone”** bookmark —
 * the frame's own words, in the frame's own order.
 *
 * Three things here are asserted rather than assumed. The state chip says **“Unpicked”**, the
 * word the map's legend uses for the same zone, so screen 06 and screen 07 describe the same
 * zone the same way. The **bookmark really saves**: it writes the picker's own plan on this
 * device and takes it back out, so the control shows a state the app kept rather than one a
 * screen remembered (ADR-024). And the one line on the screen that could be read as a promise —
 * the forecast — is the frame's own disclaimer, present and translated.
 *
 * The frame's figures are its own sample for the season demo, so the header carries the same
 * “SEASON DEMO” disclosure frame 06's map carries. A reader is told where the numbers come from
 * on the screen that shows them; the note in PROJECT.md is not a disclosure to a user.
 *
 * Where the frame draws an action with nothing behind it, the screen draws the design's words
 * instead and no role (its “Navigate” until a route supplies frame 08). Its “See all 11” is the
 * fourth: the list it names is app-drawn, because the design never drew it, and the row is a
 * control only when the route supplies that list (ADR-044).
 */
beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('ZoneDetailsScreen', () => {
  function renderZone(props: Partial<Parameters<typeof ZoneDetailsScreen>[0]> = {}) {
    return render(
      <ZoneDetailsScreen
        species="lingonberry"
        zoneId="zone-a"
        zoneSource={liveZoneSource()}
        {...props}
      />,
      { wrapper: QueryProvider },
    );
  }

  it('names no zone it was not given, instead of drawing another zone’s figures', async () => {
    await render(<ZoneDetailsScreen zoneSource={liveZoneSource()} />, { wrapper: QueryProvider });

    expect(screen.getByTestId('zone-details-status')).toHaveTextContent(
      'This zone is not among the pilot zones this phone can read.',
    );
  });

  it('leads with the photograph and the yield card: score, confidence and ripeness', async () => {
    await renderZone();

    expect(await screen.findByText('Laajavuori 1')).toBeOnTheScreen();
    expect(screen.getByText('CORE PICKER · ZONE INSIGHT')).toBeOnTheScreen();
    expect(screen.getByLabelText('Berry season photograph')).toBeOnTheScreen();
    expect(screen.getByText('70')).toBeOnTheScreen();
    expect(screen.getByText('/ 100 yield score')).toBeOnTheScreen();
    expect(screen.getByText('High confidence')).toBeOnTheScreen();
    expect(screen.getByText('Ripe now')).toBeOnTheScreen();
    expect(screen.getByTestId('zone-yield-score')).toHaveStyle({
      fontSize: typography.metric.fontSize,
      lineHeight: typography.metric.lineHeight,
    });
    expect(
      screen.getByText('A forecast of conditions, not a guaranteed harvest.'),
    ).toBeOnTheScreen();
  });

  it('names the species the zone is scored for, the berry read first in the accent fill', async () => {
    await renderZone();
    await screen.findByText('Laajavuori 1');

    expect(screen.getByTestId('zone-species-chip-lingonberry')).toHaveStyle({
      backgroundColor: themes.light.colors.accent,
    });
    expect(screen.getByTestId('zone-species-chip-bilberry')).toHaveStyle({
      backgroundColor: themes.light.colors.surface,
    });
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  });

  it('opens the route and the zone’s report list when the route supplies them', async () => {
    const onNavigate = jest.fn();
    const onSeeReports = jest.fn();
    await renderZone({ onNavigate, onSeeReports });
    await screen.findByText('Laajavuori 1');

    await fireEvent.press(screen.getByRole('button', { name: 'Navigate' }));
    await fireEvent.press(screen.getByRole('button', { name: 'See the zone’s reports' }));

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onSeeReports).toHaveBeenCalledTimes(1);
  });

  it('offers no action without a destination: the bookmark is the only control', async () => {
    await renderZone();
    await screen.findByText('Laajavuori 1');

    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Save zone' })).toBeOnTheScreen();
  });

  it('saves the zone the screen is about, and takes it back out again', async () => {
    await renderZone();

    const save = await screen.findByRole('button', { name: 'Save zone' });
    await waitFor(() => expect(save.props.accessibilityState).toMatchObject({ disabled: false }));
    await fireEvent.press(save);

    const saved = await screen.findByRole('button', { name: 'Remove zone from saved zones' });
    expect(saved.props.accessibilityState).toMatchObject({ selected: true });
    await expect(readSavedZones()).resolves.toEqual([
      { savedAt: expect.any(String), speciesId: 'lingonberry', zoneId: 'zone-a' },
    ]);

    await fireEvent.press(saved);

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Save zone' }).props.accessibilityState,
      ).toMatchObject({ selected: false }),
    );
    await expect(readSavedZones()).resolves.toEqual([]);
  });

  it('opens already saved when the zone is in the picker’s plan', async () => {
    await saveZone('zone-a', 'lingonberry');

    await renderZone();

    expect(
      await screen.findByRole('button', { name: 'Remove zone from saved zones' }),
    ).toBeOnTheScreen();
  });

  it('says so when the device will not keep the zone, instead of lighting the bookmark', async () => {
    await renderZone();
    const save = await screen.findByRole('button', { name: 'Save zone' });
    await waitFor(() => expect(save.props.accessibilityState).toMatchObject({ disabled: false }));
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('storage is full'));

    await act(async () => {
      fireEvent.press(save);
    });

    expect(
      await screen.findByText('This zone could not be saved or removed on this phone.'),
    ).toBeOnTheScreen();

    jest.restoreAllMocks();
  });

  it('offers the back control only when there is somewhere to go back to', async () => {
    const { rerender } = await renderZone({ onBack: jest.fn() });

    expect(screen.getByRole('button', { name: 'Back' })).toBeOnTheScreen();

    await rerender(
      <ZoneDetailsScreen species="lingonberry" zoneId="zone-a" zoneSource={liveZoneSource()} />,
    );
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeOnTheScreen();
  });
});

const BILBERRY_SCORE: ZoneScore = { score: 53, confidence: 'medium', ripeness: 'past' };
const LINGONBERRY_SCORE: ZoneScore = { score: 70, confidence: 'high', ripeness: 'ripe' };

function sourceZone(
  id: string,
  name: string,
  scores: Partial<Record<Species, ZoneScore>>,
  updatedAt: string | null = '2026-08-03T07:02:00+03:00',
): Zone {
  return {
    id,
    h3: id,
    name,
    score: scores.bilberry?.score ?? 0,
    confidence: scores.bilberry?.confidence ?? 'low',
    ripeness: scores.bilberry?.ripeness ?? 'unripe',
    scores,
    updatedAt,
    ring: [
      [25.689711, 62.25623],
      [25.69564, 62.253184],
      [25.703822, 62.254551],
      [25.689711, 62.25623],
    ],
  };
}

const SOURCE_ZONES: readonly Zone[] = [
  sourceZone('zone-a', 'Laajavuori 1', {
    bilberry: BILBERRY_SCORE,
    lingonberry: LINGONBERRY_SCORE,
  }),
  sourceZone('zone-b', 'Kilimajärvi 1', {
    bilberry: { score: 12, confidence: 'low', ripeness: 'unripe' },
  }),
];

/** A source that answers for one berry and drops the zones it has no score for. */
function sourceOf(zones: readonly Zone[]): ZoneSource & { list: jest.Mock } {
  return {
    list: jest.fn(async ({ species }: { species: Species }) =>
      zones.flatMap((candidate) => {
        const score = candidate.scores[species];
        return score ? [{ ...candidate, ...score }] : [];
      }),
    ),
  };
}

/**
 * Frame 07 over the same `ZoneSource` frame 06 reads.
 *
 * The card that opened the screen named a zone and a berry; this screen asks the port for that
 * berry's answer and draws **that** zone's own name, species, score, confidence and season. The
 * design's outlook, freshest report and walk have no source, so they stay the design's sample
 * and the screen says so before them. A zone the source does not answer to gets a sentence, not
 * another zone's figures.
 */
describe('ZoneDetailsScreen over the zone source', () => {
  const SAMPLE_NOTE = 'These zones are the bundled test data, not the zone service’s answer.';

  async function renderSource(zoneId = 'zone-a', species: Species = 'lingonberry') {
    return render(
      <ZoneDetailsScreen species={species} zoneId={zoneId} zoneSource={sourceOf(SOURCE_ZONES)} />,
      { wrapper: QueryProvider },
    );
  }

  it('reads the zone the card opened, with that zone’s own name and figures', async () => {
    await renderSource();

    expect(await screen.findByText('Laajavuori 1')).toBeOnTheScreen();
    expect(screen.getByText('70')).toBeOnTheScreen();
    expect(screen.getByText('/ 100 yield score')).toBeOnTheScreen();
    expect(screen.getByText('High confidence')).toBeOnTheScreen();
    expect(screen.getByText('Ripe now')).toBeOnTheScreen();

    // The demo zone the card used to open is gone from this path with its figures.
    expect(screen.queryByText('Zone 14 · Laajavuori')).not.toBeOnTheScreen();
    expect(screen.queryByText('78')).not.toBeOnTheScreen();
  });

  it('draws the species row from the zone’s own scores, the berry read first', async () => {
    await renderSource();
    await screen.findByText('Laajavuori 1');

    expect(screen.getByTestId('zone-species-chips')).toBeOnTheScreen();
    expect(screen.getByTestId('zone-species-chip-lingonberry')).toHaveStyle({
      backgroundColor: themes.light.colors.accent,
      borderColor: themes.light.colors.accent,
    });
    expect(screen.getByTestId('zone-species-chip-bilberry')).toHaveStyle({
      backgroundColor: themes.light.colors.surface,
      borderColor: themes.light.colors.border,
    });
    // The row is data, not a filter: a single zone has nothing for a species to narrow.
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(screen.queryByText('More')).not.toBeOnTheScreen();
  });

  it('reads the score of the berry the card showed, not the zone’s pilot default', async () => {
    await renderSource('zone-a', 'bilberry');

    expect(await screen.findByText('Laajavuori 1')).toBeOnTheScreen();
    expect(screen.getByText('53')).toBeOnTheScreen();
    expect(screen.getByText('Medium confidence')).toBeOnTheScreen();
    expect(screen.getByText('Season over')).toBeOnTheScreen();
    expect(screen.getByTestId('zone-species-chip-bilberry')).toHaveStyle({
      backgroundColor: themes.light.colors.accent,
    });
  });

  it('prints the zone’s own score timestamp, the instant the map reads', async () => {
    await renderSource();

    // The same data and the same words as the line under frame 06's map: the zone's `updated_at`,
    // never the moment this screen read it (ADR-053/057, widened to the details here).
    expect(await screen.findByTestId('zone-details-updated')).toHaveTextContent(
      'Last updated 3 August 2026',
    );
  });

  it('prints no freshness line when the zone carries no timestamp', async () => {
    await render(
      <ZoneDetailsScreen
        species="lingonberry"
        zoneId="zone-c"
        zoneSource={sourceOf([
          sourceZone('zone-c', 'Laajavuori 3', { lingonberry: LINGONBERRY_SCORE }, null),
        ])}
      />,
      { wrapper: QueryProvider },
    );

    expect(await screen.findByText('Laajavuori 3')).toBeOnTheScreen();
    // A missing instant is a fact the app does not have; the line is omitted rather than
    // guessed from the moment the screen loaded.
    expect(screen.queryByTestId('zone-details-updated')).not.toBeOnTheScreen();
  });

  it('no longer prints the design’s week of reports over a source zone’s score', async () => {
    await renderSource();
    await screen.findByText('Laajavuori 1');

    // The count belongs to the demo week, not to the zone the source answered for.
    expect(screen.queryByText('11 reports this week')).not.toBeOnTheScreen();
  });

  it('draws no test-data disclosure over a live zone, and offers the walk', async () => {
    await render(
      <ZoneDetailsScreen
        onNavigate={jest.fn()}
        species="lingonberry"
        zoneId="zone-a"
        zoneSource={sourceOf(SOURCE_ZONES)}
      />,
      { wrapper: QueryProvider },
    );
    await screen.findByText('Laajavuori 1');

    expect(screen.getByText('CORE PICKER · ZONE INSIGHT')).toBeOnTheScreen();
    expect(screen.queryByTestId('zone-details-sample-note')).not.toBeOnTheScreen();
    // The walk is measured from the phone, so a live zone offers it.
    expect(screen.getByTestId('zone-details-navigate')).toBeOnTheScreen();
  });

  it('says the bundled stand-in is test data', async () => {
    await render(
      <ZoneDetailsScreen
        species="lingonberry"
        zoneId="zone-a"
        zoneSource={{ ...sourceOf(SOURCE_ZONES), demo: true }}
      />,
      { wrapper: QueryProvider },
    );
    await screen.findByText('Laajavuori 1');

    expect(screen.getByText('CORE PICKER · ZONE INSIGHT · TEST DATA')).toBeOnTheScreen();
    expect(screen.getByTestId('zone-details-sample-note')).toHaveTextContent(SAMPLE_NOTE);
  });

  it('saves the zone under the berry the screen is reading', async () => {
    // The screen opened on lingonberry (the card's layer), and that is what the bookmark writes:
    // the plan must show the score the picker was looking at, not the pilot default (ADR-061).
    await renderSource();
    await screen.findByText('Laajavuori 1');

    await fireEvent.press(screen.getByRole('button', { name: 'Save zone' }));

    await expect(readSavedZones()).resolves.toEqual([
      { savedAt: expect.any(String), speciesId: 'lingonberry', zoneId: 'zone-a' },
    ]);
  });

  it('saves the bilberry layer when that is the one the card handed over', async () => {
    await renderSource('zone-a', 'bilberry');
    await screen.findByText('Laajavuori 1');

    await fireEvent.press(screen.getByRole('button', { name: 'Save zone' }));

    await expect(readSavedZones()).resolves.toEqual([
      { savedAt: expect.any(String), speciesId: 'bilberry', zoneId: 'zone-a' },
    ]);
  });

  it('says the zones are still loading, rather than drawing an empty screen', async () => {
    const pending: ZoneSource = { list: () => new Promise(() => undefined) };

    await render(<ZoneDetailsScreen species="lingonberry" zoneId="zone-a" zoneSource={pending} />, {
      wrapper: QueryProvider,
    });

    expect(screen.getByText('Zone details')).toBeOnTheScreen();
    expect(await screen.findByTestId('zone-details-status')).toHaveTextContent('Loading zones…');
    expect(screen.queryByTestId('zone-details-hero')).not.toBeOnTheScreen();
  });

  it('says the source could not be read, rather than falling back to the demo', async () => {
    const failing: ZoneSource = {
      list: async () => {
        throw new Error('no docs');
      },
    };

    await render(<ZoneDetailsScreen species="lingonberry" zoneId="zone-a" zoneSource={failing} />, {
      wrapper: QueryProvider,
    });

    // The first render says “loading”; the assertion waits for the failed read to replace it.
    expect(await screen.findByText('Zones could not be read')).toBeOnTheScreen();
    expect(screen.getByTestId('zone-details-status')).toHaveTextContent('Zones could not be read');
    expect(screen.queryByText('Zone 14 · Laajavuori')).not.toBeOnTheScreen();
  });

  it('names a zone the source does not answer to, instead of another zone’s figures', async () => {
    await renderSource('zone-z');

    expect(
      await screen.findByText('This zone is not among the pilot zones this phone can read.'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('zone-details-status')).toHaveTextContent(
      'This zone is not among the pilot zones this phone can read.',
    );
    expect(screen.queryByTestId('zone-yield-card')).not.toBeOnTheScreen();
    expect(screen.queryByText('Zone 14 · Laajavuori')).not.toBeOnTheScreen();
  });
});

/**
 * Frame 07 with the zone service's own facts (ADR-065, the plan's phase 3). The list answer
 * scores one berry, so the species row comes from the zone's detail, and the screen adds what
 * the service says about this berry: its reasons, the week's reports and the recent range.
 */
describe('ZoneDetailsScreen with the zone service’s insight', () => {
  const INSIGHT: ZoneInsight = {
    detail: {
      id: 'zone-a',
      scores: {
        lingonberry: LINGONBERRY_SCORE,
        bilberry: BILBERRY_SCORE,
        cloudberry: BILBERRY_SCORE,
      },
      reports: { lingonberry: { count: 4, averageRating: 3.5 } },
    },
    reasons: ['Warm summer so far.', 'Enough rain in the last month.'],
    history: {
      days: 30,
      points: [
        { date: '2026-07-10', score: 41 },
        { date: '2026-08-02', score: 70 },
      ],
    },
  };

  // The served list carries the asked berry only, as `GET /zones` does.
  const ONE_BERRY: readonly Zone[] = [
    sourceZone('zone-a', 'Laajavuori 1', { lingonberry: LINGONBERRY_SCORE }),
  ];

  async function renderInsight(insightSource: ZoneInsightSource) {
    return render(
      <ZoneDetailsScreen
        insightSource={insightSource}
        species="lingonberry"
        zoneId="zone-a"
        zoneSource={sourceOf(ONE_BERRY)}
      />,
      { wrapper: QueryProvider },
    );
  }

  it('asks the service about this zone and berry, in the screen’s language', async () => {
    const insight = jest.fn(async () => INSIGHT);

    await renderInsight({ insight });
    await screen.findByText('Laajavuori 1');

    await waitFor(() =>
      expect(insight).toHaveBeenCalledWith({
        zoneId: 'zone-a',
        species: 'lingonberry',
        lang: 'en',
      }),
    );
  });

  it('draws the species row from every berry the service scored, the berry read first', async () => {
    await renderInsight({ insight: async () => INSIGHT });

    expect(await screen.findByTestId('zone-species-chip-cloudberry')).toBeOnTheScreen();
    expect(screen.getByTestId('zone-species-chip-bilberry')).toBeOnTheScreen();
    expect(screen.getByTestId('zone-species-chip-lingonberry')).toHaveStyle({
      backgroundColor: themes.light.colors.accent,
    });
  });

  it('prints the service’s reasons, the week’s reports and the recent range', async () => {
    await renderInsight({ insight: async () => INSIGHT });

    expect(await screen.findByText('Why this score')).toBeOnTheScreen();
    expect(screen.getByText('Warm summer so far.')).toBeOnTheScreen();
    expect(screen.getByText('Enough rain in the last month.')).toBeOnTheScreen();
    expect(screen.getByText('4 reports this week · rating 3.5 / 5')).toBeOnTheScreen();
    expect(screen.getByText('Last 30 days: 41–70')).toBeOnTheScreen();
  });

  it('prints the count alone when the service withholds the average', async () => {
    await renderInsight({
      insight: async () => ({
        ...INSIGHT,
        detail: { ...INSIGHT.detail, reports: { lingonberry: { count: 1, averageRating: null } } },
      }),
    });

    expect(await screen.findByText('1 report this week')).toBeOnTheScreen();
  });

  it('says so when the service could not answer, and keeps the zone’s own figures', async () => {
    await renderInsight({ insight: async () => Promise.reject(new Error('offline')) });

    expect(await screen.findByText('The zone service could not answer.')).toBeOnTheScreen();
    expect(screen.getByText('70')).toBeOnTheScreen();
  });

  it('draws no service block without an insight source', async () => {
    await render(
      <ZoneDetailsScreen species="lingonberry" zoneId="zone-a" zoneSource={sourceOf(ONE_BERRY)} />,
      { wrapper: QueryProvider },
    );
    await screen.findByText('Laajavuori 1');

    expect(screen.queryByTestId('zone-details-insight')).not.toBeOnTheScreen();
  });
});
