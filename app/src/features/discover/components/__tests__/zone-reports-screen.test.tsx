import { render, screen } from '@testing-library/react-native';

import { QueryProvider } from '@/services/query-client';
import type { ZoneReportPage } from '@/services/reports';

import { ZoneReportsScreen } from '../zone-reports-screen';

const PAGE: ZoneReportPage = {
  zoneId: 'zone-a',
  zoneName: 'Laajavuori 21',
  countThisWeek: 2,
  reports: [
    {
      id: 'r1',
      species: 'bilberry',
      rating: 4,
      amountKg: 1.3,
      minutes: 52,
      trust: 'trusted',
      recordedAt: '2026-08-28T10:55:00.000Z',
    },
    {
      id: 'r2',
      species: 'lingonberry',
      rating: 2,
      amountKg: null,
      minutes: null,
      trust: 'unverified',
      recordedAt: '2026-08-27T09:00:00.000Z',
    },
  ],
};

describe('ZoneReportsScreen', () => {
  it('lists the zone’s reports from the API, without naming who sent them', async () => {
    const forZone = jest.fn().mockResolvedValue(PAGE);

    await render(
      <ZoneReportsScreen reportsApi={{ forZone }} species="bilberry" zoneId="zone-a" />,
      { wrapper: QueryProvider },
    );

    expect(await screen.findByText('Laajavuori 21 · reports')).toBeOnTheScreen();
    expect(forZone).toHaveBeenCalledWith('zone-a', 'bilberry');
    expect(screen.getByTestId('zone-reports-count')).toHaveTextContent(
      '2 reports in the last 7 days',
    );
    expect(screen.getByText('28 Aug · Rating 4 / 5 · 1.3 kg')).toBeOnTheScreen();
    expect(screen.getByText('Trusted')).toBeOnTheScreen();
    expect(screen.getByText('27 Aug · Rating 2 / 5')).toBeOnTheScreen();
    expect(screen.getByText('Unverified')).toBeOnTheScreen();
  });

  it('says when no one has reported the zone yet', async () => {
    await render(
      <ZoneReportsScreen
        reportsApi={{ forZone: async () => ({ ...PAGE, countThisWeek: 0, reports: [] }) }}
        zoneId="zone-a"
      />,
      { wrapper: QueryProvider },
    );

    expect(await screen.findByTestId('zone-reports-empty')).toHaveTextContent(
      'No one has reported this zone yet.',
    );
  });

  it('says the reports could not be read, rather than an empty list', async () => {
    await render(
      <ZoneReportsScreen
        reportsApi={{ forZone: () => Promise.reject(new Error('offline')) }}
        zoneId="zone-a"
      />,
      { wrapper: QueryProvider },
    );

    expect(await screen.findByTestId('zone-reports-read-failed')).toBeOnTheScreen();
  });

  it('names no zone it was not given', async () => {
    await render(<ZoneReportsScreen reportsApi={{ forZone: jest.fn() }} />, {
      wrapper: QueryProvider,
    });

    expect(screen.getByText('Zone reports')).toBeOnTheScreen();
    expect(screen.getByTestId('zone-reports-unknown')).toBeOnTheScreen();
  });
});
