import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, within } from '@testing-library/react-native';

import type { VisitPage } from '@/features/visits';
import { QueryProvider } from '@/services/query-client';
import { enqueueReport } from '@/services/report-queue';

import { OWN_REPORTS, SEASON } from '../../test-fixtures';
import { SeasonInsightsScreen } from '../season-insights-screen';

const reportsApi = { season: async () => SEASON, mine: async () => OWN_REPORTS };

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('SeasonInsightsScreen', () => {
  it('prints the season’s figures and chart from the API', async () => {
    await render(<SeasonInsightsScreen reportsApi={reportsApi} />, { wrapper: QueryProvider });

    const summary = within(await screen.findByTestId('season-summary'));
    expect(summary.getByText('Your 2026 season')).toBeOnTheScreen();
    expect(summary.getByText('4.5 kg')).toBeOnTheScreen();
    expect(summary.getByText('3 h')).toBeOnTheScreen();
    expect(summary.getByText('60 min')).toBeOnTheScreen();
    expect(screen.getByTestId('season-bar-0')).toBeOnTheScreen();
    expect(screen.getByTestId('season-bar-2')).toBeOnTheScreen();
  });

  it('lists the API’s reports as synced and this phone’s queue as queued', async () => {
    await enqueueReport({
      amountText: '2.4 kg',
      minutes: 41,
      recordedAt: '2026-09-14T09:20:00.000Z',
      speciesId: 'bilberry',
      yieldRating: 5,
      zoneId: 'zone-21',
      zoneName: 'Laajavuori 21',
    });

    await render(<SeasonInsightsScreen reportsApi={reportsApi} />, { wrapper: QueryProvider });

    expect(await screen.findByText('Laajavuori 21 · Bilberry')).toBeOnTheScreen();
    expect(await screen.findByText('Laajavuori 14 · Lingonberry')).toBeOnTheScreen();
    expect(screen.getByText('Queued')).toBeOnTheScreen();
    expect(screen.getByText('Synced')).toBeOnTheScreen();
    expect(screen.getByTestId('season-history-count')).toHaveTextContent('All visits · 2 visits');
  });

  it('filters the history to this month with the period chips', async () => {
    await render(<SeasonInsightsScreen reportsApi={reportsApi} />, { wrapper: QueryProvider });
    await screen.findByText('Laajavuori 14 · Lingonberry');

    await fireEvent.press(screen.getByRole('radio', { name: 'This month' }));

    // The fixture's report is from August 2026, not this month.
    expect(screen.getByTestId('season-history-outside')).toHaveTextContent(
      '1 visit outside this period',
    );
  });

  it('says the season could not be read, rather than drawing zeros', async () => {
    await render(
      <SeasonInsightsScreen
        reportsApi={{
          season: () => Promise.reject(new Error('offline')),
          mine: () => Promise.reject(new Error('offline')),
        }}
      />,
      { wrapper: QueryProvider },
    );

    expect(await screen.findByText('Your season figures could not be read.')).toBeOnTheScreen();
    expect(screen.queryByTestId('season-summary')).not.toBeOnTheScreen();
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
    await render(<SeasonInsightsScreen />, { wrapper: QueryProvider });

    expect(screen.queryByText('Recorded by the zone service')).not.toBeOnTheScreen();
  });
});
