import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, within } from '@testing-library/react-native';

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
