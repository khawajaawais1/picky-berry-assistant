import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, waitFor } from '@testing-library/react-native';
import { useNetworkState } from 'expo-network';

import { themes } from '@/constants/theme';
import { enqueueReport } from '@/services/report-queue';

import { OfflineSyncScreen } from '../offline-sync-screen';

/**
 * Frame 13 (node `5:23530`) as the app can be true about it today: the header, the status message
 * the device's own network report makes sayable, and the card that says which reports are still
 * waiting on this phone.
 *
 * The frame also draws a downloaded region with its tiles, forecast, storage meter, two actions and
 * a last-sync line, and none of that exists in this app: there is no tile cache and no forecast
 * download (ADR-031). Since ADR-042 the screen draws those parts **as the design's own sample and
 * says so on itself**, so the test asserts the pair rather than an absence: the figures are on the
 * screen, the sentence naming them as the design's sample is above them, and the two actions still
 * claim no role — a control that cannot act must not claim one (AGENTS.md §11.2).
 */
jest.mock('expo-network', () => ({ useNetworkState: jest.fn() }));

const networkState = useNetworkState as jest.MockedFunction<typeof useNetworkState>;

const REPORT = {
  amountText: '1.3 kg',
  minutes: 52,
  recordedAt: '2026-08-28T10:55:00.000Z',
  speciesId: 'lingonberry',
  yieldRating: 4,
  zoneId: 'Z14',
} as const;

beforeEach(async () => {
  await AsyncStorage.clear();
  // The platform's answer by default: it has not answered, which is the state a screen must not
  // turn into a claim either way.
  networkState.mockReturnValue({});
});

describe('OfflineSyncScreen', () => {
  it('renders the frame’s header', async () => {
    await render(<OfflineSyncScreen />);

    // The eyebrow carries the same season-demo disclosure frame 06's map and frame 11's season
    // screen do, because the region drawn below it is the design's sample (ADR-042).
    expect(screen.getByText('ACCOUNT / OFFLINE · SYNC CENTRE · SEASON DEMO')).toBeOnTheScreen();
    expect(screen.getByText('Ready beyond the signal')).toBeOnTheScreen();
  });

  it('says nothing is waiting when the phone is holding no reports', async () => {
    await render(<OfflineSyncScreen />);

    expect(await screen.findByText('Nothing is waiting to sync.')).toBeOnTheScreen();
  });

  it('lists the reports the phone is holding, as the frame’s card prints them', async () => {
    await enqueueReport(REPORT);

    await render(<OfflineSyncScreen />);

    expect(await screen.findByText('Waiting to sync · 1 report')).toBeOnTheScreen();
    expect(screen.getByText('Zone 14 · Lingonberry')).toBeOnTheScreen();
    expect(screen.getByText('28 Aug · 52 min · Rating 4 / 5 · 1.3 kg')).toBeOnTheScreen();
    expect(screen.getByText('Queued · visit + report')).toBeOnTheScreen();

    expect(screen.queryByText('Nothing is waiting to sync.')).not.toBeOnTheScreen();
  });

  it('counts several reports in the frame’s own heading', async () => {
    await enqueueReport(REPORT);
    await enqueueReport({ ...REPORT, recordedAt: '2026-08-30T11:00:00.000Z', zoneId: 'Z17' });

    await render(<OfflineSyncScreen />);

    expect(await screen.findByText('Waiting to sync · 2 reports')).toBeOnTheScreen();
    expect(screen.getByText('Zone 17 · Lingonberry')).toBeOnTheScreen();
  });

  it('leaves the harvest off a row that has none, rather than inventing a weight', async () => {
    await enqueueReport({ ...REPORT, amountText: '' });

    await render(<OfflineSyncScreen />);

    expect(await screen.findByText('28 Aug · 52 min · Rating 4 / 5')).toBeOnTheScreen();
  });

  it('says the reports are on the phone and that nothing has been sent', async () => {
    await enqueueReport(REPORT);

    await render(<OfflineSyncScreen />);

    // The frame's own sentence (“Your report is safe and will retry automatically”) promises a
    // retry, and there is no transport to retry over (ADR-005); what is true is said instead.
    expect(
      await screen.findByText(
        'Saved on this phone. Nothing has been sent yet — syncing arrives with the server.',
      ),
    ).toBeOnTheScreen();
  });

  it('says so when the queue cannot be read, rather than calling it empty', async () => {
    jest
      .spyOn(AsyncStorage, 'getItem')
      .mockRejectedValueOnce(new Error('device storage is unreadable'));

    await render(<OfflineSyncScreen />);

    expect(await screen.findByText('Your saved visits could not be read.')).toBeOnTheScreen();
    // An unreadable queue is not an empty one: the false-empty sentence must not sit above the
    // failure (frontend review, 2026-10-25).
    expect(screen.queryByText('Nothing is waiting to sync.')).not.toBeOnTheScreen();

    jest.restoreAllMocks();
  });

  it('draws the frame’s status message when the device reports no connection', async () => {
    networkState.mockReturnValue({ isConnected: false });

    await render(<OfflineSyncScreen />);

    expect(screen.getByText('You’re offline')).toBeOnTheScreen();
    expect(
      screen.getByText('Keep picking. Visits and reports are saved on your phone.'),
    ).toBeOnTheScreen();
  });

  it('draws no status message when the connection is up', async () => {
    // The frame's sentence is a claim about the device: it is drawn when it is true and never
    // guessed at (AGENTS.md §11.2).
    networkState.mockReturnValue({ isConnected: true });

    await render(<OfflineSyncScreen />);

    expect(screen.queryByText('You’re offline')).not.toBeOnTheScreen();
  });

  it('draws no status message before the platform has answered', async () => {
    // `beforeEach` leaves the platform silent, which is the state a screen must not speak in.
    await render(<OfflineSyncScreen />);

    expect(screen.queryByText('You’re offline')).not.toBeOnTheScreen();
  });

  it('treats a link with no internet behind it as offline', async () => {
    networkState.mockReturnValue({ isConnected: true, isInternetReachable: false });

    await render(<OfflineSyncScreen />);

    expect(screen.getByText('You’re offline')).toBeOnTheScreen();
  });

  it('draws the design’s sample region, and names it as the design’s sample where it is drawn', async () => {
    await render(<OfflineSyncScreen />);

    // The sentence comes before the card in the tree, and it is what keeps the figures below it
    // from reading as a measurement of this phone (ADR-042).
    const note = screen.getByTestId('offline-sample-note');
    expect(note).toBeOnTheScreen();
    expect(
      screen.getByText(
        'The region, the storage figures and the two actions below are the design’s own sample: this phone has downloaded nothing and nothing syncs yet.',
      ),
    ).toBeOnTheScreen();

    for (const drawn of [
      'Laajavuori region',
      '12 km² · 86 MB · Downloaded',
      'Map tiles & 24 zones',
      'Today’s forecast',
      'Storage used',
      '86 / 500 MB',
      'Last successful sync · 28 Aug at 08:12',
    ]) {
      expect(screen.getByText(drawn)).toBeOnTheScreen();
    }
  });

  it('draws the frame’s two actions without a role, because nothing behind them can act', async () => {
    await render(<OfflineSyncScreen />);

    for (const action of ['offline-action-primary', 'offline-action-secondary']) {
      expect(screen.getByTestId(action)).toBeOnTheScreen();
    }

    // The frame's words are drawn; the button role it would need to be a control is not.
    expect(screen.getByText('Retry sync')).toBeOnTheScreen();
    expect(screen.getByText('Manage downloaded regions')).toBeOnTheScreen();
    // Painted as drawings, not as the screen's primary action: a filled accent button that does
    // nothing invites the tap it cannot honour (frontend review, 2026-10-25).
    expect(screen.getByTestId('offline-action-primary')).toHaveStyle({
      backgroundColor: themes.light.colors.surfaceMuted,
    });
    expect(screen.getByText('Retry sync')).toHaveStyle({ color: themes.light.colors.textMuted });
    expect(screen.queryByRole('button', { name: 'Retry sync' })).not.toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Manage downloaded regions' }),
    ).not.toBeOnTheScreen();
  });

  it('fills the storage meter with the same share its own figures report', async () => {
    await render(<OfflineSyncScreen />);

    // 86 of 500 MB, which is the frame's own 59 px of a 342 px bar — computed from the two figures
    // above it so the bar cannot disagree with the line (ADR-042).
    expect(screen.getByTestId('offline-storage-meter-fill')).toHaveStyle({ width: '17.2%' });
  });
});
