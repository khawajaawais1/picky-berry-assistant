import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNetworkState } from 'expo-network';
import type { ReactNode } from 'react';

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
  zoneId: 'zone-14',
  zoneName: 'Laajavuori 14',
} as const;

beforeEach(async () => {
  await AsyncStorage.clear();
  // The platform's answer by default: it has not answered, which is the state a screen must not
  // turn into a claim either way.
  networkState.mockReturnValue({});
});

/** A cache with no timers: this file mocks `expo-network`, which `QueryProvider` listens to. */
function CacheProvider({ children }: { children: ReactNode }) {
  const [client] = [new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })];
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('OfflineSyncScreen', () => {
  it('renders the frame’s header', async () => {
    await render(<OfflineSyncScreen />, { wrapper: CacheProvider });

    expect(screen.getByText('ACCOUNT / OFFLINE · SYNC CENTRE')).toBeOnTheScreen();
    expect(screen.getByText('Ready beyond the signal')).toBeOnTheScreen();
  });

  it('says nothing is waiting when the phone is holding no reports', async () => {
    await render(<OfflineSyncScreen />, { wrapper: CacheProvider });

    expect(await screen.findByText('Nothing is waiting to sync.')).toBeOnTheScreen();
  });

  it('lists the reports the phone is holding, as the frame’s card prints them', async () => {
    await enqueueReport(REPORT);

    await render(<OfflineSyncScreen />, { wrapper: CacheProvider });

    expect(await screen.findByText('Waiting to sync · 1 report')).toBeOnTheScreen();
    expect(screen.getByText('Laajavuori 14 · Lingonberry')).toBeOnTheScreen();
    expect(screen.getByText('28 Aug · 52 min · Rating 4 / 5 · 1.3 kg')).toBeOnTheScreen();
    expect(screen.getByText('Queued · report')).toBeOnTheScreen();

    expect(screen.queryByText('Nothing is waiting to sync.')).not.toBeOnTheScreen();
  });

  it('counts several reports in the frame’s own heading', async () => {
    await enqueueReport(REPORT);
    await enqueueReport({
      ...REPORT,
      recordedAt: '2026-08-30T11:00:00.000Z',
      zoneId: 'zone-17',
      zoneName: 'Laajavuori 17',
    });

    await render(<OfflineSyncScreen />, { wrapper: CacheProvider });

    expect(await screen.findByText('Waiting to sync · 2 reports')).toBeOnTheScreen();
    expect(screen.getByText('Laajavuori 17 · Lingonberry')).toBeOnTheScreen();
  });

  it('leaves the harvest off a row that has none, rather than inventing a weight', async () => {
    await enqueueReport({ ...REPORT, amountText: '' });

    await render(<OfflineSyncScreen />, { wrapper: CacheProvider });

    expect(await screen.findByText('28 Aug · 52 min · Rating 4 / 5')).toBeOnTheScreen();
  });

  it('says the reports are on the phone and will be sent when online', async () => {
    await enqueueReport(REPORT);

    await render(<OfflineSyncScreen />, { wrapper: CacheProvider });

    expect(
      await screen.findByText(
        'Saved on this phone. They are sent to the zone service as soon as you are online.',
      ),
    ).toBeOnTheScreen();
  });

  it('says so when the queue cannot be read, rather than calling it empty', async () => {
    jest
      .spyOn(AsyncStorage, 'getItem')
      .mockRejectedValueOnce(new Error('device storage is unreadable'));

    await render(<OfflineSyncScreen />, { wrapper: CacheProvider });

    expect(await screen.findByText('Your saved visits could not be read.')).toBeOnTheScreen();
    // An unreadable queue is not an empty one: the false-empty sentence must not sit above the
    // failure (frontend review, 2026-10-25).
    expect(screen.queryByText('Nothing is waiting to sync.')).not.toBeOnTheScreen();

    jest.restoreAllMocks();
  });

  it('draws the frame’s status message when the device reports no connection', async () => {
    networkState.mockReturnValue({ isConnected: false });

    await render(<OfflineSyncScreen />, { wrapper: CacheProvider });

    expect(screen.getByText('You’re offline')).toBeOnTheScreen();
    expect(
      screen.getByText('Keep picking. Visits and reports are saved on your phone.'),
    ).toBeOnTheScreen();
  });

  it('draws no status message when the connection is up', async () => {
    // The frame's sentence is a claim about the device: it is drawn when it is true and never
    // guessed at (AGENTS.md §11.2).
    networkState.mockReturnValue({ isConnected: true });

    await render(<OfflineSyncScreen />, { wrapper: CacheProvider });

    expect(screen.queryByText('You’re offline')).not.toBeOnTheScreen();
  });

  it('draws no status message before the platform has answered', async () => {
    // `beforeEach` leaves the platform silent, which is the state a screen must not speak in.
    await render(<OfflineSyncScreen />, { wrapper: CacheProvider });

    expect(screen.queryByText('You’re offline')).not.toBeOnTheScreen();
  });

  it('treats a link with no internet behind it as offline', async () => {
    networkState.mockReturnValue({ isConnected: true, isInternetReachable: false });

    await render(<OfflineSyncScreen />, { wrapper: CacheProvider });

    expect(screen.getByText('You’re offline')).toBeOnTheScreen();
  });

  it('sends the queue now, and lists what is left', async () => {
    await enqueueReport(REPORT);
    const send = jest.fn().mockResolvedValue('recorded');

    await render(<OfflineSyncScreen reportsApi={{ send }} />, { wrapper: CacheProvider });
    await fireEvent.press(await screen.findByRole('button', { name: 'Send now' }));

    expect(await screen.findByText('Nothing is waiting to sync.')).toBeOnTheScreen();
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ zoneId: 'zone-14' }));
  });

  it('keeps the queue when the service cannot be reached', async () => {
    await enqueueReport(REPORT);
    const send = jest.fn().mockResolvedValue('retry');

    await render(<OfflineSyncScreen reportsApi={{ send }} />, { wrapper: CacheProvider });
    await fireEvent.press(await screen.findByRole('button', { name: 'Send now' }));

    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Waiting to sync · 1 report')).toBeOnTheScreen();
  });
});

/**
 * Downloading the pilot area for offline use (ADR-065, the plan's phase 6): the zone service's
 * snapshot is written into the zone cache, so the map opens without a connection for every berry.
 */

describe('OfflineSyncScreen, downloading the pilot area', () => {
  const zone = (id: string) => ({
    id,
    h3: id,
    name: id,
    score: 50,
    confidence: 'medium' as const,
    ripeness: 'ripe' as const,
    scores: {},
    ring: [],
    updatedAt: null,
  });

  const SNAPSHOT = {
    generatedAt: '2026-08-03T05:00:00.000Z',
    incremental: false,
    zones: {
      bilberry: [zone('a'), zone('b')],
      lingonberry: [zone('a')],
      cloudberry: [],
      crowberry: [],
    },
  };

  it('saves the snapshot and says how many zones it holds', async () => {
    const download = jest.fn(async () => SNAPSHOT);

    await render(<OfflineSyncScreen snapshotSource={{ download }} />, { wrapper: CacheProvider });
    await fireEvent.press(await screen.findByTestId('offline-snapshot-download'));

    expect(await screen.findByText('2 zones saved for offline use.')).toBeOnTheScreen();
    expect(download).toHaveBeenCalledWith(undefined);
  });

  it('asks only for what changed on a second download', async () => {
    const download = jest
      .fn()
      .mockResolvedValueOnce(SNAPSHOT)
      .mockResolvedValueOnce({
        ...SNAPSHOT,
        incremental: true,
        zones: { ...SNAPSHOT.zones, bilberry: [zone('b')], lingonberry: [] },
      });

    await render(<OfflineSyncScreen snapshotSource={{ download }} />, { wrapper: CacheProvider });
    await fireEvent.press(await screen.findByTestId('offline-snapshot-download'));
    await screen.findByText('2 zones saved for offline use.');
    await fireEvent.press(screen.getByTestId('offline-snapshot-download'));

    expect(await screen.findByText('Updated: 1 zone changed.')).toBeOnTheScreen();
    expect(download).toHaveBeenLastCalledWith('2026-08-03T05:00:00.000Z');
  });

  it('says nothing new was saved when the service could not answer', async () => {
    await render(
      <OfflineSyncScreen
        snapshotSource={{ download: async () => Promise.reject(new Error('x')) }}
      />,
      { wrapper: CacheProvider },
    );
    await fireEvent.press(await screen.findByTestId('offline-snapshot-download'));

    expect(
      await screen.findByText('The zone service could not answer. Nothing new was saved.'),
    ).toBeOnTheScreen();
  });

  it('offers no download without the zone service', async () => {
    await render(<OfflineSyncScreen />, { wrapper: CacheProvider });

    expect(screen.queryByTestId('offline-snapshot-download')).not.toBeOnTheScreen();
  });
});
