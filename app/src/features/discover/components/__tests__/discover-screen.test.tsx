import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { layout, radii, spacing, themes } from '@/constants/theme';
import type { PositionFix, PositionHandlers, PositionSource } from '@/services/location';
import { recordPrivacyConsent } from '@/services/privacy-consent';
import { QueryProvider } from '@/services/query-client';

import type { Species } from '../../domain/species';
import { ZONE_SCORE_BANDS } from '../../domain/zone-score-band';
import type { Zone, ZoneScore, ZoneSource } from '../../domain/zone-source';
import { DiscoverScreen, type DiscoverScreenProps } from '../discover-screen';

/**
 * Frame 06 with **one dataset**: the map, the card and the list read the same `ZoneSource`
 * answer, and the two controls narrow that answer rather than a hidden sample.
 *
 * The fixtures are shaped like the pilot stub — every zone carries per-species scores — but
 * small enough to count: three zones, two berries, and a third the source does not score, so
 * a chip press that leaves nothing is a case the screen really meets. The assertions below
 * are about the promises the screen makes: what it says while the source is answering, what
 * it says when a search leaves nothing, and that a chip changes the **scores** while a search
 * changes the **zones**.
 */

const BILBERRY: ZoneScore = { score: 53, confidence: 'medium', ripeness: 'past' };
const LINGONBERRY: ZoneScore = { score: 70, confidence: 'high', ripeness: 'ripe' };

const UPDATED_AT = '2026-08-03T07:02:00+03:00';

function zone(
  id: string,
  name: string,
  scores: Partial<Record<Species, ZoneScore>>,
  updatedAt: string | null = UPDATED_AT,
): Zone {
  return {
    id,
    h3: id,
    name,
    score: scores.bilberry?.score ?? 0,
    confidence: scores.bilberry?.confidence ?? 'low',
    ripeness: scores.bilberry?.ripeness ?? 'unripe',
    scores,
    ring: [
      [25.689711, 62.25623],
      [25.69564, 62.253184],
      [25.703822, 62.254551],
      [25.689711, 62.25623],
    ],
    updatedAt,
  };
}

const ZONES: readonly Zone[] = [
  zone('a', 'Laajavuori 1', { bilberry: BILBERRY, lingonberry: LINGONBERRY }),
  zone('b', 'Laajavuori 12', {
    bilberry: { score: 81, confidence: 'high', ripeness: 'ripe' },
    lingonberry: { score: 22, confidence: 'low', ripeness: 'unripe' },
  }),
  zone('c', 'Kilimajärvi 1', {
    bilberry: { score: 12, confidence: 'low', ripeness: 'unripe' },
  }),
];

/**
 * A source that behaves like the contract: it answers for one berry and drops a zone it has
 * no score for (`GET /zones?species=…`, ADR-036 §1). That is what makes the crowberry press
 * below an empty answer rather than a re-labelled one.
 */
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

function livePositionSource() {
  let handlers: PositionHandlers | null = null;
  const stop = jest.fn();
  const source: PositionSource = {
    requestAvailability: jest.fn(async () => 'granted'),
    watch: jest.fn((next) => {
      handlers = next;
      return stop;
    }),
  };

  return {
    source,
    stop,
    send(fix: PositionFix) {
      if (handlers === null) throw new Error('the position watch has not started');
      handlers.onFix(fix);
    },
  };
}

async function renderScreen(props: Partial<DiscoverScreenProps> = {}) {
  return render(<DiscoverScreen zoneSource={sourceOf(ZONES)} {...props} />, {
    wrapper: QueryProvider,
  });
}

/**
 * A source whose first round — one read per selected berry — all fail, and whose retry answers.
 * A single rejection would leave the other berries' answers standing, which is a different state
 * (data outranks a failed refresh) from the total failure the retry control is for.
 */
function flakySource(): ZoneSource & { list: jest.Mock } {
  const source = sourceOf(ZONES);
  let calls = 0;
  source.list.mockImplementation(async ({ species }: { species: Species }) => {
    calls += 1;
    if (calls <= 4) throw new Error('no docs');

    return ZONES.flatMap((candidate) => {
      const score = candidate.scores[species];
      return score ? [{ ...candidate, ...score }] : [];
    });
  });

  return source;
}

async function openList() {
  await fireEvent.press(screen.getByRole('button', { name: 'Show zone list' }));
}

describe('DiscoverScreen', () => {
  afterEach(async () => {
    await AsyncStorage.clear();
  });

  it('makes the map the screen and floats its controls over it', async () => {
    await renderScreen();
    await screen.findByText('3 zones');

    expect(screen.getByTestId('discover-map-screen')).toHaveStyle({ flex: 1 });
    expect(screen.getByTestId('discover-map-overlays')).toBeOnTheScreen();
    expect(screen.queryByTestId('screen-scroll')).not.toBeOnTheScreen();
    expect(screen.getByTestId('zone-search-field')).toBeOnTheScreen();
    expect(screen.getByTestId('species-chips')).toBeOnTheScreen();
    expect(screen.getByTestId('species-chips').props.horizontal).toBe(true);
    // The design's chips are 36 px tall; 4 px of hit slop on each side is the 44 px target.
    expect(screen.getByRole('checkbox', { name: 'Lingonberry' }).props.hitSlop).toMatchObject({
      bottom: 4,
      top: 4,
    });
    // Every berry is on when the map opens: the chips narrow the answer, they do not choose a
    // single score layer any more.
    for (const berry of ['Lingonberry', 'Bilberry', 'Cloudberry', 'Crowberry']) {
      expect(screen.getByRole('checkbox', { name: berry }).props.accessibilityState).toMatchObject({
        checked: true,
      });
    }
    // A lit chip is a soft tint with a check mark, not a solid accent pill: four solid pills
    // outweighed the map, and the check says "on" without leaning on colour alone.
    expect(screen.getByTestId('species-chip-bilberry')).toHaveStyle({
      backgroundColor: themes.light.colors.accentMuted,
      borderColor: themes.light.colors.accent,
    });
    expect(screen.getByTestId('species-chip-bilberry-check')).toBeOnTheScreen();
    expect(screen.getByTestId('zone-map')).toBeOnTheScreen();
    expect(screen.getByTestId('zone-score-legend')).toBeOnTheScreen();
    expect(screen.getByTestId('zone-card')).toBeOnTheScreen();
    expect(screen.getByTestId('zone-card')).toHaveStyle({
      gap: spacing.sm,
      padding: spacing.gap,
    });
    expect(screen.getByTestId('map-list-toggle')).toBeOnTheScreen();
  });

  it('says the zones are test data only when the source is the bundled stand-in', async () => {
    await render(<DiscoverScreen zoneSource={{ ...sourceOf(ZONES), demo: true }} />, {
      wrapper: QueryProvider,
    });
    await screen.findByText('3 zones · test data');

    expect(screen.getByText('Pilot area · test data')).toBeOnTheScreen();
  });

  it('carries no demo disclosure over the zone service’s live answer', async () => {
    await renderScreen();
    await screen.findByText('3 zones');

    expect(screen.queryByText(/test data|SEASON DEMO/)).not.toBeOnTheScreen();
  });

  it('prints the oldest score timestamp under the map', async () => {
    await renderScreen();
    await screen.findByText('3 zones');

    // The payload's own instant, not the read's: the zones were scored on 3 August.
    expect(screen.getByTestId('discover-updated')).toHaveTextContent('Last updated 3 August 2026');
  });

  it('makes no freshness claim when the answer carries no timestamp', async () => {
    const undated = ZONES.map((candidate) => ({ ...candidate, updatedAt: null }));

    await render(<DiscoverScreen zoneSource={sourceOf(undated)} />, { wrapper: QueryProvider });
    await screen.findByText('3 zones');

    expect(screen.queryByTestId('discover-updated')).not.toBeOnTheScreen();
  });

  it('names the five yield bands the map paints', async () => {
    await renderScreen();
    await screen.findByText('3 zones');

    expect(screen.getByText('Yield score')).toBeOnTheScreen();
    expect(screen.getByText('Faded zones have low confidence')).toBeOnTheScreen();

    // The ranges are numbers rather than copy, so they are written by the legend from the
    // bands themselves — one swatch and one range per band, in order.
    for (const band of ZONE_SCORE_BANDS) {
      expect(screen.getByText(`${band.min}–${band.max}`)).toBeOnTheScreen();
      expect(screen.getByTestId(`zone-score-legend-swatch-${band.min}`)).toBeOnTheScreen();
    }
  });

  it('paints each legend swatch in the band’s own fill and outline', async () => {
    await renderScreen();
    await screen.findByText('3 zones');

    // The pairing that makes the legend readable rather than decorative: the swatch and the
    // polygon come from one token pair, so they cannot show different colours.
    for (const band of ZONE_SCORE_BANDS) {
      expect(screen.getByTestId(`zone-score-legend-swatch-${band.min}`)).toHaveStyle({
        backgroundColor: themes.light.colors[band.fill],
        borderColor: themes.light.colors[band.line],
        borderRadius: radii.xs,
        borderWidth: 1,
        height: layout.mapLegendSwatch,
        width: layout.mapLegendSwatch,
      });
    }
  });

  it('draws the card from the source’s first zone, under its best selected berry', async () => {
    await renderScreen();
    await screen.findByText('3 zones');

    // Every berry starts on, and the zone's best score among them is lingonberry's 70 — so the
    // card names lingonberry, not the source's own default berry.
    expect(screen.getByText('Laajavuori 1 · Lingonberry')).toBeOnTheScreen();
    expect(screen.getByText('Pilot area')).toBeOnTheScreen();
    expect(screen.getByText('70 / 100 yield')).toBeOnTheScreen();
    expect(screen.getByText('High confidence')).toBeOnTheScreen();
    expect(screen.getByText('Ripe now')).toBeOnTheScreen();

    // The demo card's values are gone from this screen with the sample they described.
    expect(screen.queryByText('Zone 14 · Lingonberry')).not.toBeOnTheScreen();
    expect(screen.queryByText('78 / 100 yield')).not.toBeOnTheScreen();
  });

  it('draws no card while the source is answering, and says the map is loading', async () => {
    const pending: ZoneSource = { list: () => new Promise(() => undefined) };

    await render(<DiscoverScreen zoneSource={pending} />, { wrapper: QueryProvider });

    expect(screen.getByTestId('zone-map-status')).toHaveTextContent('Loading zones…');
    expect(screen.queryByTestId('zone-card')).not.toBeOnTheScreen();
  });

  it('searches a zone by name and says what the search left, on the map and in the list', async () => {
    await renderScreen();
    await screen.findByText('3 zones');

    await fireEvent.changeText(screen.getByLabelText('Search a place or zone'), 'Kilimajärvi');

    expect(screen.getByText('1 zone matches')).toBeOnTheScreen();
    // The map's count is the same answer, which is the point: the map no longer shows the
    // whole pilot area while the count line describes a subset.
    expect(screen.getByText('Kilimajärvi 1 · Bilberry')).toBeOnTheScreen();

    await openList();

    expect(screen.getByTestId('zone-list-row-c')).toBeOnTheScreen();
    expect(screen.queryByTestId('zone-list-row-a')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('zone-list-row-b')).not.toBeOnTheScreen();
  });

  it('reads a name in part, so a typed prefix still finds the zone', async () => {
    await renderScreen();
    await screen.findByText('3 zones');

    await fireEvent.changeText(screen.getByLabelText('Search a place or zone'), 'Laajavuori 1');

    // “Laajavuori 1” names zone 1 and is contained in zone 12; both are places the picker
    // named, and hiding the second would be the filter guessing at intent.
    expect(screen.getByText('2 zones match')).toBeOnTheScreen();
  });

  it('says so when the search names a place that is not here, and keeps the legend', async () => {
    await renderScreen();
    await screen.findByText('3 zones');

    await fireEvent.changeText(screen.getByLabelText('Search a place or zone'), 'Kilimajärvi 2');

    expect(screen.getByText('No zone matches this search')).toBeOnTheScreen();
    expect(screen.queryByTestId('zone-card')).not.toBeOnTheScreen();
    // The legend stays: it names the colours the map paints with, and the map is still the
    // map the picker is looking at.
    expect(screen.getByTestId('zone-score-legend')).toBeOnTheScreen();
    // The search line above already says it; the map does not say it a second time, and must
    // not claim the area has no scored zones when it is the search that left none.
    expect(screen.queryByTestId('zone-map-status')).not.toBeOnTheScreen();
  });

  it('narrows the layers with a chip, and adds it back without a second read', async () => {
    const source = sourceOf(ZONES);
    await render(<DiscoverScreen zoneSource={source} />, { wrapper: QueryProvider });
    await screen.findByText('70 / 100 yield');

    // Every berry starts on, so the first read asks for all four layers.
    for (const berry of ['lingonberry', 'bilberry', 'cloudberry', 'crowberry']) {
      expect(source.list).toHaveBeenCalledWith({ species: berry });
    }

    const lingonberry = screen.getByRole('checkbox', { name: 'Lingonberry' });
    expect(lingonberry.props.accessibilityState).toMatchObject({ checked: true });

    await fireEvent.press(lingonberry);

    // With lingonberry off, the card falls back to the zone's best remaining layer.
    expect(lingonberry.props.accessibilityState).toMatchObject({ checked: false });
    expect(await screen.findByText('Laajavuori 1 · Bilberry')).toBeOnTheScreen();
    expect(screen.getByText('53 / 100 yield')).toBeOnTheScreen();
    expect(screen.getByText('Medium confidence')).toBeOnTheScreen();
    expect(screen.getByText('Season over')).toBeOnTheScreen();
    // The answer was already in the cache: turning a layer off is not a new read.
    expect(source.list).toHaveBeenCalledTimes(4);

    await fireEvent.press(screen.getByRole('checkbox', { name: 'Lingonberry' }));

    expect(await screen.findByText('70 / 100 yield')).toBeOnTheScreen();
    expect(source.list).toHaveBeenCalledTimes(4);
  });

  it('keeps the last lit chip lit, because an empty selection has no layer to draw', async () => {
    await renderScreen();
    await screen.findByText('3 zones');

    for (const berry of ['Lingonberry', 'Bilberry', 'Cloudberry']) {
      await fireEvent.press(screen.getByRole('checkbox', { name: berry }));
    }

    // Crowberry is the only berry left on, and pressing it again must not empty the map.
    const crowberry = screen.getByRole('checkbox', { name: 'Crowberry' });
    await fireEvent.press(crowberry);

    expect(crowberry.props.accessibilityState).toMatchObject({ checked: true });
    expect(await screen.findByText('No scored zones around Jyväskylä yet')).toBeOnTheScreen();
  });

  it('leaves nothing when the chosen berries have no zones, and says why', async () => {
    await renderScreen();
    await screen.findByText('3 zones');

    for (const berry of ['Lingonberry', 'Bilberry', 'Cloudberry']) {
      await fireEvent.press(screen.getByRole('checkbox', { name: berry }));
    }

    expect(await screen.findByText('No scored zones around Jyväskylä yet')).toBeOnTheScreen();
    expect(screen.queryByTestId('zone-card')).not.toBeOnTheScreen();
  });

  it('lists the same zones, each under the berry whose score it prints', async () => {
    await renderScreen();
    await screen.findByText('3 zones');

    await openList();

    expect(screen.getByTestId('zone-list')).toBeOnTheScreen();
    // Zone 1's best selected score is lingonberry's; zone 12's is bilberry's. The rows name the
    // berry they print, so a multi-select answer cannot relabel a score.
    expect(screen.getByText('Laajavuori 1 · Lingonberry')).toBeOnTheScreen();
    expect(screen.getByText('Laajavuori 12 · Bilberry')).toBeOnTheScreen();
    expect(screen.getByText('70 / 100 yield')).toBeOnTheScreen();
    expect(screen.getAllByText('Ripe now').length).toBeGreaterThan(0);
    expect(screen.getByTestId('zone-list-row-b')).toBeOnTheScreen();
    expect(screen.getByTestId('zone-list-row-c')).toBeOnTheScreen();
  });

  it('says the list failed rather than showing an empty world', async () => {
    const failing: ZoneSource = {
      list: async () => {
        throw new Error('no docs');
      },
    };
    await render(<DiscoverScreen zoneSource={failing} />, { wrapper: QueryProvider });
    await openList();

    expect(await screen.findByTestId('zone-list-status')).toHaveTextContent(
      'Zones could not be read',
    );
  });

  it('retries a failed read from the map', async () => {
    const flaky = flakySource();

    await render(<DiscoverScreen zoneSource={flaky} />, { wrapper: QueryProvider });

    // The map's status element exists during the load too, so the failure is waited for, not
    // read from the first render.
    await waitFor(() =>
      expect(screen.getByTestId('zone-map-status')).toHaveTextContent('Zones could not be read'),
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('3 zones')).toBeOnTheScreen();
    expect(flaky.list).toHaveBeenCalledTimes(8);
  });

  it('retries a failed read from the list too', async () => {
    const flaky = flakySource();

    await render(<DiscoverScreen zoneSource={flaky} />, { wrapper: QueryProvider });
    await openList();

    await waitFor(() =>
      expect(screen.getByTestId('zone-list-status')).toHaveTextContent('Zones could not be read'),
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByTestId('zone-list-row-a')).toBeOnTheScreen();
    expect(flaky.list).toHaveBeenCalledTimes(8);
  });

  it('opens the zone the card is reading, under the berry whose score it prints', async () => {
    const onOpenZone = jest.fn();
    await renderScreen({ onOpenZone });
    await screen.findByText('3 zones');

    await fireEvent.press(screen.getByRole('button', { name: 'Open zone Laajavuori 1 details' }));

    // The screen hands over the zone it drew and the berry whose score it printed, so the
    // screen it opens reads the same record rather than another berry's figures.
    expect(onOpenZone).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'a' }),
      'lingonberry',
    );

    await fireEvent.press(screen.getByRole('checkbox', { name: 'Lingonberry' }));
    await screen.findByText('53 / 100 yield');
    await fireEvent.press(screen.getByRole('button', { name: 'Open zone Laajavuori 1 details' }));

    expect(onOpenZone).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'a' }), 'bilberry');
  });

  it('selects a zone on the map and opens that selected zone from the floating card', async () => {
    const onOpenZone = jest.fn();
    await renderScreen({ onOpenZone });
    await screen.findByText('3 zones');

    await fireEvent(screen.getByTestId('zone-map-source'), 'press', {
      nativeEvent: { features: [{ id: 'b' }] },
    });

    expect(screen.getByText('Laajavuori 12 · Bilberry')).toBeOnTheScreen();
    expect(screen.getByText('81 / 100 yield')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Open zone Laajavuori 12 details' }));
    expect(onOpenZone).toHaveBeenCalledWith(expect.objectContaining({ id: 'b' }), 'bilberry');
  });

  it('shows the consent-gated live position and follows it only after the picker asks', async () => {
    await recordPrivacyConsent(true, new Date('2026-08-03T07:00:00.000Z'));
    const live = livePositionSource();
    await renderScreen({ positionSource: live.source });
    await screen.findByText('3 zones');
    await waitFor(() => expect(live.source.watch).toHaveBeenCalledTimes(1));

    await act(async () => {
      live.send({
        accuracyMeters: 12,
        at: 1_786_000_000_000,
        latitude: 62.24,
        longitude: 25.76,
      });
    });

    expect(screen.getByTestId('zone-map-user-location-source').props.data).toMatchObject({
      geometry: { coordinates: [25.76, 62.24], type: 'Point' },
      type: 'Feature',
    });

    const locate = screen.getByRole('button', { name: 'Centre map on my location' });
    expect(locate.props.accessibilityState).toMatchObject({ selected: false });

    await fireEvent.press(locate);
    expect(locate.props.accessibilityState).toMatchObject({ selected: true });

    await fireEvent(screen.getByTestId('zone-map-drawing'), 'regionWillChange', {
      nativeEvent: { userInteraction: true },
    });
    expect(locate.props.accessibilityState).toMatchObject({ selected: false });

    await fireEvent.press(screen.getByRole('button', { name: 'Show zone list' }));
    expect(live.stop).toHaveBeenCalledTimes(1);
  });

  it('offers Privacy settings instead of reading position without consent', async () => {
    const onOpenLocationSettings = jest.fn();
    await renderScreen({ onOpenLocationSettings });
    await screen.findByText('3 zones');

    await fireEvent.press(screen.getByRole('button', { name: 'Review location privacy' }));

    expect(onOpenLocationSettings).toHaveBeenCalledWith('off');
    expect(screen.queryByTestId('zone-map-user-location-source')).not.toBeOnTheScreen();
  });

  it('leaves the card a reading where the route supplies no destination', async () => {
    await renderScreen();
    await screen.findByText('3 zones');

    // A card that claimed a role without anywhere to go would be the control AGENTS.md §11.2
    // refuses; the list rows are still readings even when the card opens a zone.
    expect(screen.queryByRole('button', { name: /Open zone/ })).not.toBeOnTheScreen();
    expect(screen.queryByTestId('zone-card-chevron')).not.toBeOnTheScreen();

    await openList();

    // The view toggle is the only button here (no back, no download glyph in this render); the
    // berry chips are checkboxes now, and the zone card itself is a reading.
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getAllByRole('checkbox')).toHaveLength(4);
    expect(screen.queryByRole('button', { name: /Open zone/ })).not.toBeOnTheScreen();
  });

  it('switches back to the map the frame’s toggle names', async () => {
    await renderScreen();
    await screen.findByText('3 zones');

    expect(screen.getByRole('button', { name: 'Show zone list' })).toBeOnTheScreen();
    await openList();
    expect(screen.getByText('Zone list')).toBeOnTheScreen();
    expect(screen.queryByTestId('zone-map')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Show map' }));

    expect(screen.getByTestId('zone-map')).toBeOnTheScreen();
    expect(screen.queryByTestId('zone-list')).not.toBeOnTheScreen();
  });

  it('offers the offline centre where the frame draws its download glyph', async () => {
    const onOpenDownloads = jest.fn();
    const { rerender } = await renderScreen({ onOpenDownloads });
    await screen.findByText('3 zones');

    await fireEvent.press(screen.getByRole('button', { name: 'Offline maps and downloads' }));
    expect(onOpenDownloads).toHaveBeenCalledTimes(1);

    await rerender(<DiscoverScreen zoneSource={sourceOf(ZONES)} />);

    // With nowhere to send it, the glyph is not drawn and claims no role (AGENTS.md §11.2).
    expect(
      screen.queryByRole('button', { name: 'Offline maps and downloads' }),
    ).not.toBeOnTheScreen();
  });

  it('offers the frame’s back control only when there is somewhere to go back to', async () => {
    const onBack = jest.fn();
    const { rerender } = await renderScreen({ onBack });
    await screen.findByText('3 zones');

    expect(screen.getByRole('button', { name: 'Back' })).toBeOnTheScreen();

    await rerender(<DiscoverScreen zoneSource={sourceOf(ZONES)} />);
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeOnTheScreen();
  });
});
