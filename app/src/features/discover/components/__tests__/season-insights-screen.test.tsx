import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, within } from '@testing-library/react-native';

import { layout, themes } from '@/constants/theme';
import type { VisitPage } from '@/features/visits';
import { QueryProvider } from '@/services/query-client';
import { enqueueReport } from '@/services/report-queue';

import { SeasonInsightsScreen } from '../season-insights-screen';

/**
 * Frame 11 as the app can be true about it today (node `5:23343`): the month's summary card, the
 * harvest chart, and the visit history the frame's own two period chips filter (ADR-043).
 *
 * The history is the part that is the picker's own record rather than the design's sample: it
 * reads the device's report queue, so the two things asserted of it below are that a report saved
 * on screen 10 comes back here with its own values and its own “Queued”, and that a visit the
 * chosen period leaves out is counted rather than dropped in silence.
 */
const QUEUED = {
  amountText: '2.4 kg',
  minutes: 41,
  recordedAt: '2026-09-14T09:20:00.000Z',
  speciesId: 'bilberry',
  yieldRating: 5,
  zoneId: 'Z21',
} as const;

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('SeasonInsightsScreen', () => {
  it('renders the frame’s header, with its own disclosure that the season is the design’s', async () => {
    await render(<SeasonInsightsScreen />);

    // The frame's eyebrow reads “CORE PICKER · PERSONAL INSIGHTS”; the figures on it are the
    // design's sample month, so the screen says so the way frame 06 does (PROJECT.md).
    expect(screen.getByText('CORE PICKER · PERSONAL INSIGHTS · SEASON DEMO')).toBeOnTheScreen();
    expect(screen.getByText('Your season so far')).toBeOnTheScreen();
  });

  it('draws the frame’s two period chips as one real choice, on the period the screen opens in', async () => {
    await render(<SeasonInsightsScreen />);

    // The frame's own two labels, in its own order (nodes 5:23349 and 5:23354), as one radio group
    // now that the chips filter the history (ADR-043): the first is the month the design's own
    // three visits are in, the second is everything the phone holds — and that one is selected,
    // because the period that holds the visit the picker just made is the one screen 10 lands on.
    //
    // The group's own name is its label in the tree rather than a role the renderer resolves to an
    // accessible element (a container that claims `accessible` would hide its chips from assistive
    // technology), and the chips under it are the radios.
    expect(screen.getByLabelText('Visit period')).toBeOnTheScreen();
    expect(screen.getByText('August 2026')).toBeOnTheScreen();
    expect(screen.getByText('All visits')).toBeOnTheScreen();

    expect(screen.getByRole('radio', { name: 'All visits' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'August 2026' })).not.toBeChecked();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
  });

  it('prints the frame’s own month in its summary card', async () => {
    await render(<SeasonInsightsScreen />);

    const summary = within(screen.getByTestId('season-summary'));

    expect(summary.getByText('A good month in the forest.')).toBeOnTheScreen();
    expect(summary.getByText('4.5 kg')).toBeOnTheScreen();
    expect(summary.getByText('Total harvested')).toBeOnTheScreen();
    expect(summary.getByText('1.5')).toBeOnTheScreen();
    expect(summary.getByText('kg / hour')).toBeOnTheScreen();
    expect(summary.getByText('3')).toBeOnTheScreen();
    expect(summary.getByText('Zones visited')).toBeOnTheScreen();
    expect(summary.getByText('3 h')).toBeOnTheScreen();
    expect(summary.getByText('Total stay time')).toBeOnTheScreen();
    expect(summary.getByText('60 min')).toBeOnTheScreen();
    expect(summary.getByText('Median stay')).toBeOnTheScreen();
  });

  it('draws the frame’s harvest chart at the design’s own heights', async () => {
    await render(<SeasonInsightsScreen />);

    const chart = within(screen.getByTestId('season-chart'));

    expect(chart.getByText('Harvest by visit')).toBeOnTheScreen();
    expect(chart.getByText('kg')).toBeOnTheScreen();

    // 1.5, 1.7 and 1.3 kg in the frame's proportions: 62, 70 and 54 px (nodes 5:23388 onwards).
    expect(screen.getByTestId('season-bar-0')).toHaveStyle({ height: 62 });
    expect(screen.getByTestId('season-bar-1')).toHaveStyle({ height: 70 });
    expect(screen.getByTestId('season-bar-2')).toHaveStyle({ height: 54 });
    expect(screen.getByTestId('season-bar-1')).toHaveStyle({
      backgroundColor: themes.light.colors.accent,
      width: layout.harvestBarWidth,
    });

    for (const label of ['1.5', '1.7', '1.3', '20 Aug', '24 Aug', '28 Aug']) {
      expect(chart.getByText(label)).toBeOnTheScreen();
    }
  });

  it('lists the frame’s own three sample visits, as its rows print them', async () => {
    await render(<SeasonInsightsScreen />);

    expect(screen.getByText('Visit history')).toBeOnTheScreen();
    expect(screen.getByText('Zone 14 · Lingonberry')).toBeOnTheScreen();
    expect(screen.getByText('28 Aug · 52 min · 1.3 kg')).toBeOnTheScreen();
    expect(screen.getByText('Zone 17 · Bilberry')).toBeOnTheScreen();
    expect(screen.getByText('24 Aug · 68 min · 1.7 kg')).toBeOnTheScreen();
    expect(screen.getByText('Zone 09 · Bilberry')).toBeOnTheScreen();
    expect(screen.getByText('20 Aug · 60 min · 1.5 kg')).toBeOnTheScreen();

    // The frame's newest visit is queued for the server; the two behind it are already synced.
    expect(screen.getByText('Queued')).toBeOnTheScreen();
    expect(screen.getAllByText('Synced')).toHaveLength(2);
  });

  it('shows every visit the phone holds when it opens, the picker’s own first', async () => {
    // The picker's own visit is a September one and the design's samples are August ones, so the
    // period the screen opens in is the one that holds everything — the screen test below is the
    // other half of that: the month chip, and the line that says what it leaves out.
    await enqueueReport(QUEUED);

    await render(<SeasonInsightsScreen />);

    // The queue's own row: its zone, its day, its length and the harvest the picker typed.
    expect(await screen.findByText('Zone 21 · Bilberry')).toBeOnTheScreen();
    expect(screen.getByText('14 Sep · 41 min · 2.4 kg')).toBeOnTheScreen();
    // Two queued rows now: the picker's own visit and the design's sample one.
    expect(screen.getAllByText('Queued')).toHaveLength(2);
    // Newest first: the picker's own report leads the history, above the samples.
    expect(screen.getByTestId('season-history-0')).toHaveTextContent(/Zone 21 · Bilberry/);
    expect(screen.getByTestId('season-history-1')).toHaveTextContent(/Zone 14 · Lingonberry/);

    expect(screen.getByTestId('season-history-count')).toHaveTextContent('All visits · 4 visits');
    // Everything is inside this period, so the line about what is left out is not drawn at all.
    expect(screen.queryByTestId('season-history-outside')).not.toBeOnTheScreen();
  });

  it('says which month it is showing, and counts the visits the month leaves out', async () => {
    await enqueueReport(QUEUED);

    await render(<SeasonInsightsScreen />);

    await screen.findByTestId('season-history-count');
    await fireEvent.press(screen.getByRole('radio', { name: 'August 2026' }));

    // The design's own month: its three sample visits, and the picker's September one off the
    // list — said out loud by the second line rather than dropped in silence.
    expect(screen.getByTestId('season-history-count')).toHaveTextContent('August 2026 · 3 visits');
    expect(screen.getByTestId('season-history-outside')).toHaveTextContent(
      '1 visit outside this period',
    );
    expect(screen.queryByText('Zone 21 · Bilberry')).not.toBeOnTheScreen();
    expect(screen.getAllByText('Queued')).toHaveLength(1);
  });

  it('keeps the frame’s own note about what the figures include', async () => {
    await render(<SeasonInsightsScreen />);

    expect(
      screen.getByText(
        'Includes your queued visit. Harvest rates use only visits with a recorded weight.',
      ),
    ).toBeOnTheScreen();
  });

  it('says so when the saved visits cannot be read, rather than showing an empty history', async () => {
    jest
      .spyOn(AsyncStorage, 'getItem')
      .mockRejectedValueOnce(new Error('device storage is unreadable'));

    await render(<SeasonInsightsScreen />);

    expect(await screen.findByText('Your saved visits could not be read.')).toBeOnTheScreen();

    jest.restoreAllMocks();
  });
});

/**
 * The visits the zone service recorded for this account (ADR-065, the plan's phase 4), drawn
 * under the phone's own history when the route supplies the visits API.
 */
describe('SeasonInsightsScreen with the zone service’s visits', () => {
  const PAGE: VisitPage = {
    visits: [
      {
        id: '4cd7a7d4-e6da-4d4c-bdbf-d0997c5ac60d',
        zoneId: 'cc0e7929-de9f-516a-9049-7a25a1a6d092',
        zoneName: 'Laajavuori 1',
        startedAt: '2026-08-03T09:00:00.000Z',
        durationSeconds: 2700,
        status: 'accepted',
        rejectReason: null,
      },
      {
        id: '5cd7a7d4-e6da-4d4c-bdbf-d0997c5ac60d',
        zoneId: null,
        zoneName: null,
        startedAt: '2026-08-01T09:00:00.000Z',
        durationSeconds: 59,
        status: 'accepted',
        rejectReason: null,
      },
    ],
    nextCursor: null,
  };

  function renderWith(list: () => Promise<VisitPage>) {
    return render(<SeasonInsightsScreen visitsApi={{ list }} />, { wrapper: QueryProvider });
  }

  it('lists the recorded visits with their zone, day and length', async () => {
    await renderWith(async () => PAGE);

    expect(await screen.findByText('Recorded by the zone service')).toBeOnTheScreen();
    expect(screen.getByText('Laajavuori 1 · 3 August 2026 · 45 min')).toBeOnTheScreen();
    // A zone the service no longer names, and a visit under a minute, are said as they are.
    expect(
      screen.getByText('A zone no longer listed · 1 August 2026 · under 1 min'),
    ).toBeOnTheScreen();
  });

  it('says so when the service has recorded nothing yet', async () => {
    await renderWith(async () => ({ visits: [], nextCursor: null }));

    expect(await screen.findByText('The service has recorded no visits yet.')).toBeOnTheScreen();
  });

  it('says so when the service could not answer, rather than showing no visits', async () => {
    await renderWith(async () => Promise.reject(new Error('offline')));

    expect(await screen.findByText('The zone service could not answer.')).toBeOnTheScreen();
  });

  it('draws no service block without the visits API', async () => {
    await render(<SeasonInsightsScreen />);

    expect(screen.queryByText('Recorded by the zone service')).not.toBeOnTheScreen();
  });
});
