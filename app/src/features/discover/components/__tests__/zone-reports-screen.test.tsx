import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, within } from '@testing-library/react-native';

import { enqueueReport } from '@/services/report-queue';

import { ZoneReportsScreen } from '../zone-reports-screen';

/**
 * The screen frame 07's “See all 11” opens (node `5:23076`) — **app-drawn**, because the design
 * never drew the list its own link names.
 *
 * Two things are asserted here, and they are the whole point of the screen: it names the design's
 * own sample week **and** the difference between that and the phone's record, and every row below
 * it is a report the picker's own device holds. The zone's reports from other pickers are not
 * invented to fill the design's eleven: that is a service this app does not have, and the screen
 * says so instead.
 */
const QUEUED = {
  amountText: '1.3 kg',
  minutes: 52,
  recordedAt: '2026-08-28T10:55:00.000Z',
  speciesId: 'lingonberry',
  yieldRating: 4,
  zoneId: 'Z14',
} as const;

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('ZoneReportsScreen', () => {
  it('names the screen in the app’s own words, with the disclosure the demo zone needs', async () => {
    await render(<ZoneReportsScreen />);

    // The zone it is about is the design's own composition, so the screen carries the same
    // “SEASON DEMO” disclosure frame 06's map and frame 11's season screen carry.
    expect(screen.getByText('CORE PICKER · ZONE REPORTS · SEASON DEMO')).toBeOnTheScreen();
    expect(screen.getByText('Zone 14 · reports')).toBeOnTheScreen();
  });

  it('states the design’s own sample week, and what this phone holds instead', async () => {
    await enqueueReport(QUEUED);

    await render(<ZoneReportsScreen />);

    // The frame's own “11 reports this week” (node 5:23060), said as the design's sample; the
    // count under it is the phone's own record.
    expect(
      screen.getByText(
        'The design’s sample week holds 11 reports from pickers nearby. This app holds only what was saved on this phone:',
      ),
    ).toBeOnTheScreen();
    expect(await screen.findByTestId('zone-reports-count')).toHaveTextContent(
      '1 report on this phone',
    );
  });

  it('lists the picker’s own report as the frame’s rows print one', async () => {
    await enqueueReport(QUEUED);

    await render(<ZoneReportsScreen />);

    const row = within(await screen.findByTestId('zone-report-0'));

    // The species is the catalogue's word for the identifier the queue stored, the line is the
    // frame's own order of facts, and the rating is the report's own answer on the design's 1–5
    // scale — not a score the app invented.
    expect(row.getByText('Lingonberry')).toBeOnTheScreen();
    expect(row.getByText('28 Aug · 52 min · Yield 4 / 5 · 1.3 kg')).toBeOnTheScreen();
    expect(row.getByText('Queued')).toBeOnTheScreen();
  });

  it('leaves the harvest out of a report the picker saved without one', async () => {
    await enqueueReport({ ...QUEUED, amountText: '' });

    await render(<ZoneReportsScreen />);

    expect(await screen.findByText('28 Aug · 52 min · Yield 4 / 5')).toBeOnTheScreen();
  });

  it('prints a species the catalogue has no word for as the identifier it is', async () => {
    // A report saved by a version whose catalogue named a berry this one does not must still be
    // readable — and printed as its own identifier, never relabelled as another berry.
    await enqueueReport({ ...QUEUED, speciesId: 'arctic-bramble' });

    await render(<ZoneReportsScreen />);

    const row = within(await screen.findByTestId('zone-report-0'));
    expect(row.getByText('arctic-bramble')).toBeOnTheScreen();
    expect(row.queryByText('Lingonberry')).not.toBeOnTheScreen();
  });

  it('says the list is empty rather than filling it with another zone’s report', async () => {
    // A report for zone 09 is the picker's own, and it is not a report about zone 14.
    await enqueueReport({ ...QUEUED, zoneId: 'Z09' });

    await render(<ZoneReportsScreen />);

    expect(
      await screen.findByText('No report for this zone is saved on this phone yet.'),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('zone-report-0')).not.toBeOnTheScreen();
    expect(await screen.findByTestId('zone-reports-count')).toHaveTextContent(
      '0 reports on this phone',
    );
  });

  it('says what is missing: the zone’s reports from other pickers', async () => {
    await render(<ZoneReportsScreen />);

    // The design's eleven are not a list this app can hold: nothing returns another picker's
    // report, and the screen names that rather than standing the sample in for it.
    expect(
      screen.getByText(
        'Reports from other pickers arrive with the report service, which this app does not have yet.',
      ),
    ).toBeOnTheScreen();
  });

  it('says so when the saved reports cannot be read, rather than showing an empty list', async () => {
    jest
      .spyOn(AsyncStorage, 'getItem')
      .mockRejectedValueOnce(new Error('device storage is unreadable'));

    await render(<ZoneReportsScreen />);

    expect(await screen.findByText('Your saved visits could not be read.')).toBeOnTheScreen();

    jest.restoreAllMocks();
  });
});
