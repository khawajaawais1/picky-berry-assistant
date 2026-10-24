import { fireEvent, render, screen } from '@testing-library/react-native';

import { layout, radii, themes } from '@/constants/theme';
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

function zone(id: string, name: string, scores: Partial<Record<Species, ZoneScore>>): Zone {
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

async function renderScreen(props: DiscoverScreenProps = {}) {
  return render(<DiscoverScreen zoneSource={sourceOf(ZONES)} {...props} />, {
    wrapper: QueryProvider,
  });
}

async function openList() {
  await fireEvent.press(screen.getByRole('button', { name: 'Show zone list' }));
}

describe('DiscoverScreen', () => {
  it('renders the frame’s header and its blocks', async () => {
    await renderScreen();
    await screen.findByText('3 zones · test data');

    expect(screen.getByText('CORE PICKER · SEASON DEMO / 28 AUG')).toBeOnTheScreen();
    expect(screen.getByText('Discover nearby')).toBeOnTheScreen();
    expect(screen.getByTestId('zone-search-field')).toBeOnTheScreen();
    expect(screen.getByTestId('species-chips')).toBeOnTheScreen();
    expect(screen.getByTestId('zone-map')).toBeOnTheScreen();
    expect(screen.getByTestId('zone-score-legend')).toBeOnTheScreen();
    expect(screen.getByTestId('zone-card')).toBeOnTheScreen();
    expect(screen.getByTestId('map-list-toggle')).toBeOnTheScreen();
  });

  it('names the five yield bands the map paints', async () => {
    await renderScreen();
    await screen.findByText('3 zones · test data');

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
    await screen.findByText('3 zones · test data');

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

  it('draws the card from the source’s first zone, not the design’s sample', async () => {
    await renderScreen();
    await screen.findByText('3 zones · test data');

    expect(screen.getByText('Laajavuori 1 · Bilberry')).toBeOnTheScreen();
    expect(screen.getByText('Pilot area · test data')).toBeOnTheScreen();
    expect(screen.getByText('53 / 100 yield')).toBeOnTheScreen();
    expect(screen.getByText('Medium confidence')).toBeOnTheScreen();
    expect(screen.getByText('Season over')).toBeOnTheScreen();

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
    await screen.findByText('3 zones · test data');

    await fireEvent.changeText(screen.getByLabelText('Search a place or zone'), 'Kilimajärvi');

    expect(screen.getByText('1 zone matches')).toBeOnTheScreen();
    // The map's count is the same answer, which is the point: the map no longer shows the
    // whole pilot area while the count line describes a subset.
    expect(screen.getByText('1 zone · test data')).toBeOnTheScreen();
    expect(screen.getByText('Kilimajärvi 1 · Bilberry')).toBeOnTheScreen();

    await openList();

    expect(screen.getByTestId('zone-list-row-c')).toBeOnTheScreen();
    expect(screen.queryByTestId('zone-list-row-a')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('zone-list-row-b')).not.toBeOnTheScreen();
  });

  it('reads a name in part, so a typed prefix still finds the zone', async () => {
    await renderScreen();
    await screen.findByText('3 zones · test data');

    await fireEvent.changeText(screen.getByLabelText('Search a place or zone'), 'Laajavuori 1');

    // “Laajavuori 1” names zone 1 and is contained in zone 12; both are places the picker
    // named, and hiding the second would be the filter guessing at intent.
    expect(screen.getByText('2 zones match')).toBeOnTheScreen();
    expect(screen.getByText('2 zones · test data')).toBeOnTheScreen();
  });

  it('says so when the search names a place that is not here, and keeps the legend', async () => {
    await renderScreen();
    await screen.findByText('3 zones · test data');

    await fireEvent.changeText(screen.getByLabelText('Search a place or zone'), 'Kilimajärvi 2');

    expect(screen.getByText('No zone matches this search')).toBeOnTheScreen();
    expect(screen.queryByTestId('zone-card')).not.toBeOnTheScreen();
    // The legend stays: it names the colours the map paints with, and the map is still the
    // map the picker is looking at.
    expect(screen.getByTestId('zone-score-legend')).toBeOnTheScreen();
    expect(screen.getByText('No zones to show')).toBeOnTheScreen();
  });

  it('switches the scores with a chip, because a zone has one score per berry', async () => {
    const source = sourceOf(ZONES);
    await render(<DiscoverScreen zoneSource={source} />, { wrapper: QueryProvider });
    await screen.findByText('53 / 100 yield');

    await fireEvent.press(screen.getByRole('checkbox', { name: 'Lingonberry' }));

    // The card now reads the berry the chip asked for — the same zone, its other score.
    expect(await screen.findByText('Laajavuori 1 · Lingonberry')).toBeOnTheScreen();
    expect(screen.getByText('70 / 100 yield')).toBeOnTheScreen();
    expect(screen.getByText('High confidence')).toBeOnTheScreen();
    expect(screen.getByText('Ripe now')).toBeOnTheScreen();
    expect(source.list).toHaveBeenLastCalledWith({ species: 'lingonberry' });

    await fireEvent.press(screen.getByRole('checkbox', { name: 'Lingonberry' }));

    // Pressing the lit chip clears it, and the screen falls back to the pilot's berry rather
    // than inventing a combined score.
    expect(await screen.findByText('53 / 100 yield')).toBeOnTheScreen();
    expect(source.list).toHaveBeenLastCalledWith({ species: 'bilberry' });
  });

  it('leaves nothing when the chosen berry has no zones, and says why', async () => {
    await renderScreen();
    await screen.findByText('3 zones · test data');

    await fireEvent.press(screen.getByRole('checkbox', { name: 'Crowberry' }));

    expect(await screen.findByText('No zones to show')).toBeOnTheScreen();
    expect(screen.queryByTestId('zone-card')).not.toBeOnTheScreen();
  });

  it('lists the same zones, with the score the chips chose and the season’s word', async () => {
    await renderScreen();
    await screen.findByText('3 zones · test data');

    await openList();

    expect(screen.getByTestId('zone-list')).toBeOnTheScreen();
    expect(screen.getByText('Laajavuori 1 · Bilberry')).toBeOnTheScreen();
    expect(screen.getByText('53 / 100 yield')).toBeOnTheScreen();
    expect(screen.getByText('Season over')).toBeOnTheScreen();
    expect(screen.getByText('Ripe now')).toBeOnTheScreen();
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

  it('claims no destination: a source zone has no details screen yet', async () => {
    await renderScreen();
    await screen.findByText('3 zones · test data');

    expect(screen.queryByRole('button', { name: /Open zone/ })).not.toBeOnTheScreen();
    expect(screen.queryByTestId('zone-card-chevron')).not.toBeOnTheScreen();

    await openList();

    // Only the view toggle is a control here (no back, no download glyph in this render);
    // the rows are readings.
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('switches back to the map the frame’s toggle names', async () => {
    await renderScreen();
    await screen.findByText('3 zones · test data');

    expect(screen.getByText('Map selected')).toBeOnTheScreen();
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
    await screen.findByText('3 zones · test data');

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
    await screen.findByText('3 zones · test data');

    expect(screen.getByRole('button', { name: 'Back' })).toBeOnTheScreen();

    await rerender(<DiscoverScreen zoneSource={sourceOf(ZONES)} />);
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeOnTheScreen();
  });
});
