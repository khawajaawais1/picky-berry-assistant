import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { themes, typography } from '@/constants/theme';
import { QueryProvider } from '@/services/query-client';
import { readSavedZones, saveZone } from '@/services/saved-zones';

import type { Species } from '../../domain/species';
import { CARD_ZONE_STATE, DEMO_ZONES } from '../../domain/zone';
import { DEMO_ZONE_DETAILS } from '../../domain/zone-details';
import type { Zone, ZoneScore, ZoneSource } from '../../domain/zone-source';
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
  it('renders the frame’s header, naming the zone, the place and the demo they come from', async () => {
    await render(<ZoneDetailsScreen />);

    // The figures below are the design's sample, and the header says so in the words frame 06
    // uses for the same demo season.
    expect(screen.getByText('CORE PICKER · ZONE INSIGHT · SEASON DEMO')).toBeOnTheScreen();
    expect(screen.getByText('Zone 14 · Laajavuori')).toBeOnTheScreen();
  });

  it('prints no score timestamp on the design’s sample', async () => {
    await render(<ZoneDetailsScreen />);

    // The sample has no zone source behind it, so it has no instant to state — and the app does
    // not invent one for the design's figures.
    expect(screen.queryByTestId('zone-details-updated')).not.toBeOnTheScreen();
  });

  it('renders the frame’s photograph', async () => {
    await render(<ZoneDetailsScreen />);

    expect(screen.getByTestId('zone-details-hero')).toBeOnTheScreen();
    expect(screen.getByLabelText('Berry season photograph')).toBeOnTheScreen();
  });

  it('leads with the yield card: the score, its confidence and the reports behind it', async () => {
    await render(<ZoneDetailsScreen />);

    const zone = DEMO_ZONES.find((candidate) => candidate.state === CARD_ZONE_STATE);

    expect(screen.getByText(String(zone?.score))).toBeOnTheScreen();
    expect(screen.getByText('/ 100 yield score')).toBeOnTheScreen();
    expect(screen.getByText('High confidence')).toBeOnTheScreen();
    expect(screen.getByText('11 reports this week')).toBeOnTheScreen();
  });

  it('sets the score at the frame’s own hero metrics', async () => {
    await render(<ZoneDetailsScreen />);

    // The one type slot the frame gives a number this large; it is a token, not a literal.
    expect(screen.getByTestId('zone-yield-score')).toHaveStyle({
      fontSize: typography.metric.fontSize,
      lineHeight: typography.metric.lineHeight,
    });
  });

  it('names the zone’s state in the map legend’s vocabulary, beside its ripeness', async () => {
    await render(<ZoneDetailsScreen />);

    // “Unpicked” is frame 06's word for this zone; a second wording here is how one screen
    // would start describing the same colour differently from the other.
    expect(screen.getByText('Unpicked')).toBeOnTheScreen();
    expect(screen.getByText('Ripe now')).toBeOnTheScreen();
  });

  it('says out loud that the figures are a forecast, not a promise', async () => {
    await render(<ZoneDetailsScreen />);

    expect(
      screen.getByText('A forecast of conditions, not a guaranteed harvest.'),
    ).toBeOnTheScreen();
  });

  it('names the species the zone is reported for, the first in the frame’s accent fill', async () => {
    await render(<ZoneDetailsScreen />);

    // The frame's own row (node `5:23047`) under the photograph: what grows in this zone, the
    // main berry in the accent fill its first chip carries. They are data rather than a filter —
    // a single zone's screen has nothing for a species to filter — so they claim no role.
    expect(screen.getByTestId('zone-species-chips')).toBeOnTheScreen();
    expect(screen.getByTestId('zone-species-chip-lingonberry')).toHaveStyle({
      backgroundColor: themes.light.colors.accent,
      borderColor: themes.light.colors.accent,
    });
    expect(screen.getByTestId('zone-species-chip-bilberry')).toHaveStyle({
      backgroundColor: themes.light.colors.surface,
      borderColor: themes.light.colors.border,
    });
    expect(screen.getByText('Lingonberry')).toBeOnTheScreen();
    expect(screen.getByText('Bilberry')).toBeOnTheScreen();
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    // The frame's third chip (“More”) opens a species index the app does not have.
    expect(screen.queryByText('More')).not.toBeOnTheScreen();
  });

  it('renders today’s outlook with the weather line the frame draws', async () => {
    await render(<ZoneDetailsScreen />);

    expect(screen.getByText('Today’s outlook')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Ripe lingonberries after a warm week. Similar conditions expected tomorrow.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('18°C · Light wind · Forecast at 08:00')).toBeOnTheScreen();
  });

  it('renders the freshest report with its provenance, age and the reporter’s own reading', async () => {
    await render(<ZoneDetailsScreen />);

    expect(screen.getByText('Fresh from pickers')).toBeOnTheScreen();
    expect(screen.getByText('“Plenty of ripe clusters near the trail.”')).toBeOnTheScreen();
    expect(screen.getByText('Trusted report · 38 min ago · 4 / 5 yield')).toBeOnTheScreen();
    expect(
      screen.getByText('Scores weight freshness, trust and nearby agreement.'),
    ).toBeOnTheScreen();
  });

  it('prints the count of reports beside the list it names', async () => {
    await render(<ZoneDetailsScreen />);

    // The same week's count the yield card gives, in the frame's own words.
    expect(screen.getByText('See all 11')).toBeOnTheScreen();
    expect(DEMO_ZONE_DETAILS.reportsThisWeek).toBe(11);
  });

  it('offers the frame’s Navigate action once there is a route to open', async () => {
    const onNavigate = jest.fn();
    await render(<ZoneDetailsScreen onNavigate={onNavigate} />);

    // The frame draws the action because it is the way on to frame 08, and its own words name
    // the walk — read from that screen's own demo route, so the two cannot disagree.
    fireEvent.press(screen.getByRole('button', { name: 'Navigate · 1.4 km' }));

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it('offers no action without a destination, and none it cannot act on', async () => {
    const { rerender } = await render(<ZoneDetailsScreen />);

    // Without somewhere to go, the frame's action is not drawn: a button that does nothing is
    // what this repository does not ship. The frame's species chips are not actions either — a
    // single zone's screen has nothing for a species to narrow — and “See all 11” stays the
    // design's words while no route supplies the list it names — so the only control is the
    // bookmark, which does act (ADR-024).
    expect(screen.queryByText('Navigate · 1.4 km')).not.toBeOnTheScreen();
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Save zone' })).toBeOnTheScreen();
    expect(screen.queryAllByRole('link')).toHaveLength(0);

    await rerender(<ZoneDetailsScreen onBack={jest.fn()} />);

    // The route's own back control joins it.
    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(screen.getByText('See all 11')).toBeOnTheScreen();
  });

  it('saves the zone the screen is about, and takes it back out again', async () => {
    await render(<ZoneDetailsScreen />);

    const save = screen.getByRole('button', { name: 'Save zone' });
    expect(save.props.accessibilityState).toMatchObject({ selected: false });

    await fireEvent.press(save);

    // The frame's own control (node 5:23081): what the picker pressed is on the device, and the
    // control's state is the record's, not a screen's own memory.
    const saved = await screen.findByRole('button', {
      name: 'Remove zone from saved zones',
    });
    expect(saved.props.accessibilityState).toMatchObject({ selected: true });
    await expect(readSavedZones()).resolves.toEqual([
      { savedAt: expect.any(String), speciesId: 'bilberry', zoneId: DEMO_ZONE_DETAILS.zoneId },
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
    await saveZone(DEMO_ZONE_DETAILS.zoneId, 'bilberry');

    await render(<ZoneDetailsScreen />);

    expect(
      await screen.findByRole('button', { name: 'Remove zone from saved zones' }),
    ).toBeOnTheScreen();
  });

  it('claims no saved state while the plan is still being read', async () => {
    // A record that has not answered is not a “not saved”: the control is drawn disabled, so it
    // claims no state rather than the wrong one.
    jest.spyOn(AsyncStorage, 'getItem').mockReturnValueOnce(new Promise(() => {}));

    await render(<ZoneDetailsScreen />);

    expect(screen.getByTestId('zone-details-save').props.accessibilityState).toMatchObject({
      disabled: true,
      selected: false,
    });

    jest.restoreAllMocks();
  });

  it('does not offer a second press while the save is still being written', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    jest.spyOn(AsyncStorage, 'setItem').mockImplementationOnce(async () => {
      await gate;
    });

    await render(<ZoneDetailsScreen />);

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Save zone' }));
    });

    // The write owns the plan until it answers: a second press would decide from a saved
    // state the first press has not recorded yet.
    expect(screen.getByTestId('zone-details-save').props.accessibilityState).toMatchObject({
      disabled: true,
      selected: false,
    });

    release();

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Remove zone from saved zones' }).props
          .accessibilityState,
      ).toMatchObject({ disabled: false, selected: true }),
    );

    jest.restoreAllMocks();
  });

  it('says so when the device will not keep the zone, instead of lighting the bookmark', async () => {
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('storage is full'));

    await render(<ZoneDetailsScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Save zone' }));

    expect(
      await screen.findByText('This zone could not be saved or removed on this phone.'),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Save zone' }).props.accessibilityState,
    ).toMatchObject({ selected: false });

    jest.restoreAllMocks();
  });

  it('offers the frame’s report list once there is one to open, and names where it leads', async () => {
    const onSeeReports = jest.fn();
    await render(<ZoneDetailsScreen onSeeReports={onSeeReports} />);

    // The visible label stays the frame's own (“See all 11”), and the accessible name says where
    // the press leads: the frame's eleven are the design's sample week and the list behind this
    // control is the picker's own record, so a screen reader user is told which of the two it is
    // (the rule frame 16's contact action follows, ADR-044).
    await fireEvent.press(
      screen.getByRole('button', {
        name: 'See all 11 reports · opens the reports saved on this phone',
      }),
    );

    expect(onSeeReports).toHaveBeenCalledTimes(1);
    expect(screen.getByText('See all 11')).toBeOnTheScreen();
  });

  it('offers the frame’s back control only when there is somewhere to go back to', async () => {
    const onBack = jest.fn();
    const { rerender } = await render(<ZoneDetailsScreen onBack={onBack} />);

    expect(screen.getByRole('button', { name: 'Back' })).toBeOnTheScreen();

    await rerender(<ZoneDetailsScreen />);
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeOnTheScreen();
  });

  it('paints its two chips on the success tint the frame gives them', async () => {
    await render(<ZoneDetailsScreen />);

    for (const label of ['Unpicked', 'Ripe now']) {
      expect(screen.getByText(label).parent).toHaveStyle({
        backgroundColor: themes.light.colors.successMuted,
      });
    }
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
  const SAMPLE_NOTE =
    'The outlook, the freshest report, the walk and the report list behind them are the design’s own sample: no weather source or report stream exists yet.';

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
    // The blocks with no source are still the design’s sample, and the screen says so.
    expect(screen.getByTestId('zone-details-sample-note')).toHaveTextContent(SAMPLE_NOTE);
    expect(screen.getByText('Today’s outlook')).toBeOnTheScreen();
    expect(screen.getByText('Fresh from pickers')).toBeOnTheScreen();
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
