import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { saveZone } from '@/services/saved-zones';

import { SavedSpotsScreen } from '../saved-spots-screen';

/**
 * The screen behind frame 14's “Saved spots” row — the one the design never drew (ADR-030).
 *
 * What matters here is the honesty of an app-drawn list: it shows the picker's own record in the
 * record's order, it names a saved zone the app cannot describe rather than dropping it, it says
 * nothing at all until the record has been read, and it opens a zone only where a zone screen
 * exists. The copy is written out literally so this test fails if the screen silently changes it.
 */
const EMPTY = 'No saved spots yet.';
const READ_FAILED = 'Your saved spots could not be read.';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('SavedSpotsScreen', () => {
  it('lists the picker’s plan in the order the record holds it', async () => {
    await saveZone('Z21');
    await saveZone('Z14');

    await render(<SavedSpotsScreen />);

    expect(await screen.findByTestId('saved-spot-row-Z21')).toBeOnTheScreen();
    // The record's order is the order the picker saved them in, and the list is that list.
    expect(screen.getAllByTestId(/^saved-spot-row-Z\d+$/).map((row) => row.props.testID)).toEqual([
      'saved-spot-row-Z21',
      'saved-spot-row-Z14',
    ]);
  });

  it('draws the frame’s own words over the list', async () => {
    await saveZone('Z14');

    await render(<SavedSpotsScreen />);

    expect(screen.getByText('ACCOUNT / OFFLINE · SAVED SPOTS · SEASON DEMO')).toBeOnTheScreen();
    expect(screen.getByText('Saved spots')).toBeOnTheScreen();
  });

  it('names a saved zone the app cannot describe instead of leaving it out', async () => {
    // The record is the picker's own, and an identifier from another build is still a saved spot:
    // the row says what the record says, and claims no role because nothing can open it.
    await saveZone('Z99');

    await render(<SavedSpotsScreen />);

    expect(await screen.findByTestId('saved-spot-row-Z99')).toBeOnTheScreen();
    expect(screen.getByText('Z99')).toBeOnTheScreen();
  });

  it('opens a saved zone where the app has a screen for it, and only there', async () => {
    await saveZone('Z14');
    await saveZone('Z09');
    const onOpenZone = jest.fn();

    const { rerender } = await render(<SavedSpotsScreen />);
    // With nowhere to navigate to, no row is a control.
    expect(screen.queryByRole('button', { name: 'Open zone 14 details' })).not.toBeOnTheScreen();

    await rerender(<SavedSpotsScreen onOpenZone={onOpenZone} />);
    // Zone 14 is the design's zone screen; zone 09 has no numbers behind it, and a row that
    // opened the wrong zone's score would be worse than a row that opens nothing.
    expect(screen.queryByRole('button', { name: 'Open zone 9 details' })).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Open zone 14 details' }));
    expect(onOpenZone).toHaveBeenCalledTimes(1);
  });

  it('says the plan is empty, and offers the map, once it knows it is', async () => {
    const onBrowseZones = jest.fn();

    await render(<SavedSpotsScreen onBrowseZones={onBrowseZones} />);

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

    await render(<SavedSpotsScreen />);

    expect(screen.queryByText(EMPTY)).not.toBeOnTheScreen();
    expect(screen.queryByTestId(/^saved-spot-row-/)).not.toBeOnTheScreen();
  });

  it('says the plan could not be read, rather than showing it as empty', async () => {
    jest
      .spyOn(AsyncStorage, 'getItem')
      .mockImplementationOnce(() => Promise.reject(new Error('the store refused')));

    await render(<SavedSpotsScreen />);

    expect(await screen.findByText(READ_FAILED)).toBeOnTheScreen();
    expect(screen.queryByText(EMPTY)).not.toBeOnTheScreen();
  });

  it('offers the frame’s back control only when there is somewhere to go back to', async () => {
    const onBack = jest.fn();
    const { rerender } = await render(<SavedSpotsScreen onBack={onBack} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);

    await rerender(<SavedSpotsScreen />);
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeOnTheScreen();
    await waitFor(() => expect(screen.getByText(EMPTY)).toBeOnTheScreen());
  });
});
