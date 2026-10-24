import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { QueryProvider } from '@/services/query-client';
import { saveZone } from '@/services/saved-zones';

import type { Species } from '../../domain/species';
import type { Zone, ZoneScore, ZoneSource } from '../../domain/zone-source';
import { SavedSpotsScreen, type SavedSpotsScreenProps } from '../saved-spots-screen';

/**
 * The screen behind frame 14's “Saved spots” row — the one the design never drew (ADR-030).
 *
 * What matters here is the honesty of an app-drawn list: it shows the picker's own record in the
 * record's order, it reads each saved zone from the **zone source's answer for the berry the
 * record holds** (ADR-060, ADR-061), it names a saved zone no answer carries rather than dropping
 * it, it says nothing at all until the record and every answer it needs have answered, and it
 * opens a zone only where an answer gives it figures. The copy is written out literally so this
 * test fails if the screen silently changes it.
 */
const EMPTY = 'No saved spots yet.';
const READ_FAILED = 'Your saved spots could not be read.';
const ZONES_FAILED = 'Zones could not be read';

const RING: readonly (readonly [number, number])[] = [
  [25.689711, 62.25623],
  [25.69564, 62.253184],
  [25.703822, 62.254551],
  [25.689711, 62.25623],
];

const BILBERRY: ZoneScore = { score: 53, confidence: 'medium', ripeness: 'past' };
const LINGONBERRY: ZoneScore = { score: 70, confidence: 'high', ripeness: 'ripe' };

const zone = (id: string, name: string, score: ZoneScore): Zone => ({
  id,
  h3: `h3-${id}`,
  name,
  score: score.score,
  confidence: score.confidence,
  ripeness: score.ripeness,
  scores: { bilberry: BILBERRY, lingonberry: LINGONBERRY },
  ring: RING,
  updatedAt: '2026-08-03T07:02:00+03:00',
});

const ZONE_A = zone('zone-a', 'Laajavuori 1', BILBERRY);
const ZONE_B = zone('zone-b', 'Laajavuori 2', BILBERRY);

/** One answer per berry, as the port gives it: top-level figures for the berry asked for. */
const ANSWERS: Readonly<Record<Species, readonly Zone[]>> = {
  bilberry: [ZONE_A, ZONE_B],
  cloudberry: [
    { ...ZONE_A, ...BILBERRY },
    { ...ZONE_B, ...BILBERRY },
  ],
  crowberry: [
    { ...ZONE_A, ...BILBERRY },
    { ...ZONE_B, ...BILBERRY },
  ],
  lingonberry: [
    { ...ZONE_A, ...LINGONBERRY },
    { ...ZONE_B, ...LINGONBERRY },
  ],
};

const source: ZoneSource = { list: async ({ species }) => ANSWERS[species] };

async function renderScreen(props: SavedSpotsScreenProps = {}) {
  return render(<SavedSpotsScreen zoneSource={source} {...props} />, {
    wrapper: QueryProvider,
  });
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('SavedSpotsScreen', () => {
  it('lists the picker’s plan in the record’s order, with the source’s names', async () => {
    await saveZone('zone-b', 'bilberry');
    await saveZone('zone-a', 'bilberry');

    await renderScreen();

    expect(await screen.findByText('Laajavuori 2 · Bilberry')).toBeOnTheScreen();
    // The record's order is the order the picker saved them in, and the list is that list.
    expect(
      screen.getAllByTestId(/^saved-spot-row-zone-[ab]$/).map((row) => row.props.testID),
    ).toEqual(['saved-spot-row-zone-b', 'saved-spot-row-zone-a']);
  });

  it('draws the frame’s own words over the list', async () => {
    await saveZone('zone-a', 'bilberry');

    await renderScreen();

    expect(await screen.findByText('Laajavuori 1 · Bilberry')).toBeOnTheScreen();
    expect(screen.getByText('ACCOUNT / OFFLINE · SAVED SPOTS')).toBeOnTheScreen();
    expect(screen.getByText('Saved spots')).toBeOnTheScreen();
    // The row is the map's own row now, with the score and season the source answered.
    expect(screen.getByText('53 / 100 yield')).toBeOnTheScreen();
    expect(screen.getByText('Season over')).toBeOnTheScreen();
  });

  it('shows each saved zone under the berry it was saved under, not the map’s chip', async () => {
    await saveZone('zone-a', 'lingonberry');
    await saveZone('zone-b', 'bilberry');

    await renderScreen();

    // One row per berry, each read from that berry's own answer (ADR-061).
    expect(await screen.findByText('Laajavuori 1 · Lingonberry')).toBeOnTheScreen();
    expect(screen.getByText('Laajavuori 2 · Bilberry')).toBeOnTheScreen();
    expect(screen.getByText('70 / 100 yield')).toBeOnTheScreen();
    expect(screen.getByText('Ripe now')).toBeOnTheScreen();
    expect(screen.getByText('53 / 100 yield')).toBeOnTheScreen();
  });

  it('opens a saved zone’s details under the berry the record holds', async () => {
    await saveZone('zone-a', 'lingonberry');
    const onOpenZone = jest.fn();

    const { rerender } = await renderScreen();
    await screen.findByText('Laajavuori 1 · Lingonberry');
    // With nowhere to navigate to, no row is a control.
    expect(screen.queryByRole('button', { name: /Open zone/ })).not.toBeOnTheScreen();

    await rerender(<SavedSpotsScreen onOpenZone={onOpenZone} zoneSource={source} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Open zone Laajavuori 1 details' }));

    // The route opens the layer the row printed, so the score it read and the score it opens are
    // one reading (ADR-060 decision 3, widened by ADR-061).
    expect(onOpenZone).toHaveBeenCalledWith('zone-a', 'lingonberry');
  });

  it('names a saved zone the source cannot describe instead of leaving it out', async () => {
    // The record is the picker's own, and an identifier from another build is still a saved spot:
    // the row says what the record says, and claims no role because nothing can open it.
    await saveZone('Z99', 'bilberry');

    await renderScreen();

    expect(await screen.findByTestId('saved-spot-row-Z99')).toBeOnTheScreen();
    expect(screen.getByText('Z99')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Open zone/ })).not.toBeOnTheScreen();
  });

  it('states a zone read that failed, and still lists the saved identifiers', async () => {
    await saveZone('zone-a', 'lingonberry');
    const failing: ZoneSource = {
      list: async () => {
        throw new Error('no zones');
      },
    };

    await render(<SavedSpotsScreen zoneSource={failing} />, { wrapper: QueryProvider });

    expect(await screen.findByText(ZONES_FAILED)).toBeOnTheScreen();
    // The record is not the service's: a failed read may not make the picker's plan disappear.
    expect(screen.getByTestId('saved-spot-row-zone-a')).toBeOnTheScreen();
    expect(screen.getByText('zone-a')).toBeOnTheScreen();
  });

  it('says the plan is empty, and offers the map, once it knows it is', async () => {
    const onBrowseZones = jest.fn();

    await renderScreen({ onBrowseZones });

    expect(await screen.findByText(EMPTY)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Browse zones' }));
    expect(onBrowseZones).toHaveBeenCalledTimes(1);
  });

  it('claims nothing about the plan until the record has been read', async () => {
    // A read in flight is not an empty plan: the screen waits rather than telling the picker
    // they have saved nothing.
    jest
      .spyOn(AsyncStorage, 'getItem')
      .mockImplementationOnce(() => new Promise<string | null>(() => {}));

    await renderScreen();

    expect(screen.queryByText(EMPTY)).not.toBeOnTheScreen();
    expect(screen.queryByTestId(/^saved-spot-row-/)).not.toBeOnTheScreen();
  });

  it('does not call a layer unknown while its answer is still on the way', async () => {
    // The plan needs two berries, and only one of them has answered: the row for the other is
    // not an identifier the source refused, it is a question that has not been answered yet.
    await saveZone('zone-a', 'lingonberry');
    await saveZone('zone-b', 'bilberry');
    const pendingLingonberry: ZoneSource = {
      list: ({ species }) =>
        species === 'lingonberry'
          ? new Promise<readonly Zone[]>(() => {})
          : Promise.resolve(ANSWERS[species]),
    };

    await render(<SavedSpotsScreen zoneSource={pendingLingonberry} />, {
      wrapper: QueryProvider,
    });
    await waitFor(() => expect(screen.getByText('Saved spots')).toBeOnTheScreen());

    expect(screen.queryByTestId('saved-spot-row-zone-b')).not.toBeOnTheScreen();
    expect(screen.queryByText('zone-b')).not.toBeOnTheScreen();
    expect(screen.queryByText(EMPTY)).not.toBeOnTheScreen();
  });

  it('says the plan could not be read, rather than showing it as empty', async () => {
    jest
      .spyOn(AsyncStorage, 'getItem')
      .mockImplementationOnce(() => Promise.reject(new Error('the store refused')));

    await renderScreen();

    expect(await screen.findByText(READ_FAILED)).toBeOnTheScreen();
    expect(screen.queryByText(EMPTY)).not.toBeOnTheScreen();
  });

  it('offers the frame’s back control only when there is somewhere to go back to', async () => {
    const onBack = jest.fn();
    const { rerender } = await renderScreen({ onBack });

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);

    await rerender(<SavedSpotsScreen zoneSource={source} />);
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeOnTheScreen();
    await waitFor(() => expect(screen.getByText(EMPTY)).toBeOnTheScreen());
  });
});
